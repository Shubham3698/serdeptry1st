// routes/myBucketRoutes.js
const express = require('express');
const router = express.Router();
const MyBucket = require('../../models/english/MyBucket'); // Path check kar lena

// POST: Save a new word from the script
router.post('/add-vocab', async (req, res) => {
  try {
    const { word, context, source, userEmail } = req.body;
    
    if (!word || !context) {
      return res.status(400).json({ success: false, message: "Word and context are required" });
    }

    const newVocab = new MyBucket({ word, context, source, userEmail });
    await newVocab.save();

    res.status(201).json({ success: true, message: `Successfully added '${word}' to DB!` });
  } catch (error) {
    console.error("MyBucket Route Error:", error);
    res.status(500).json({ success: false, message: "Server error while saving word" });
  }
});

// 🔥 UPDATED GET ROUTE: Fetch words for a specific user 🔥
router.get('/vocab', async (req, res) => {
  try {
    const { email } = req.query; // Frontend se email fetch kar rahe hain
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Sirf current user ke words database se nikalo
    const words = await MyBucket.find({ userEmail: email }).sort({ addedAt: -1 });
    
    // Response mein 'vocab' bhej rahe hain kyunki frontend wahi expect kar raha hai
    res.status(200).json({ success: true, vocab: words });
  } catch (error) {
    console.error("Fetch Vocab Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching words" });
  }
});

module.exports = router;