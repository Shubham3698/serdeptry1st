const express = require("express");
const router = express.Router();
const PersonalVault = require("../../models/english/PersonalVault");

// 📡 User ka pura Vault (Categories + Items) load karo
router.get("/my-vault", async (req, res) => {
  try {
    const { email } = req.query;
    let vault = await PersonalVault.findOne({ userEmail: email.toLowerCase() });
    
    if (!vault) {
      vault = await PersonalVault.create({ userEmail: email.toLowerCase() });
    }
    res.json(vault);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🔥 DUPLICATE CLEANER ROUTE
router.get("/clean-duplicates", async (req, res) => {
  try {
    const PersonalVault = require("../../models/english/PersonalVault");
    const allVaults = await PersonalVault.find({});

    let fixedCount = 0;

    for (let vault of allVaults) {
      const uniqueWords = new Map();
      const cleanItems = [];
      let hasDuplicates = false;

      // Reverse loop taaki latest category bachi rahe
      for (let i = vault.vaultItems.length - 1; i >= 0; i--) {
        const item = vault.vaultItems[i];
        if (!uniqueWords.has(item.wordId.toString())) {
          uniqueWords.set(item.wordId.toString(), true);
          cleanItems.push(item);
        } else {
          hasDuplicates = true;
        }
      }

      if (hasDuplicates) {
        vault.vaultItems = cleanItems.reverse(); // Wapas seedha kar do
        await vault.save();
        fixedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Cleaned duplicates in ${fixedCount} vaults!`,
      status: "Database is now clean ✨"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🛠️ Move Logic: Hub ko bina chhede Vault mein category badlo
// routes/english/PersonalVault.js
router.post("/move-word", async (req, res) => {
  try {
    const { email, wordId, newCategory } = req.body;
    
    // 🔥 Sirf PersonalVault update ho raha hai. EnglishPost (Hub) touch bhi nahi hoga!
    await PersonalVault.updateOne(
      { userEmail: email.toLowerCase(), "vaultItems.wordId": wordId },
      { $set: { "vaultItems.$.category": newCategory } }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 📂 Add Category Permanent
router.post("/add-category", async (req, res) => {
  const { email, categoryName } = req.body;
  try {
    const vault = await PersonalVault.findOneAndUpdate(
      { userEmail: email.toLowerCase() },
      { $addToSet: { customCategories: categoryName.toLowerCase().trim() } },
      { new: true }
    );
    res.json(vault);
  } catch (err) { res.status(500).json(err); }
});

module.exports = router;