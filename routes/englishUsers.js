const express = require("express");
const router = express.Router();
const EnglishUser = require("../models/EnglishUser");

// ==========================================
// 🚀 SIGNUP / SYNC (Google & Email Support)
// ==========================================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, firebaseUid } = req.body;

    if (!email || !firebaseUid) {
      return res.status(400).json({ success: false, message: "Email and UID are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 🔄 Find if user already exists in English Hub collection
    let user = await EnglishUser.findOne({ email: cleanEmail });

    if (user) {
      // ✅ Agar user exist karta hai, toh bas Firebase UID aur Name update karo (Sync)
      user.firebaseUid = firebaseUid;
      if (name && name !== "User") user.name = name; 
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: "User synced successfully",
        email: user.email,
        name: user.name
      });
    }

    // ✨ Naya user create karo (Fresh Join)
    const newUser = new EnglishUser({ 
      name: name || "User", 
      email: cleanEmail, 
      firebaseUid,
      appOrigin: "english-community" 
    });
    
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "New member joined English Hub",
      email: newUser.email,
      name: newUser.name
    });

  } catch (err) {
    console.error("❌ Signup/Sync Error:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// ==========================================
// 🔑 LOGIN (Fetch verified user data)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    const user = await EnglishUser.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Account not found in English Hub. Please Join Now." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      email: user.email,
      name: user.name
    });

  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

module.exports = router;