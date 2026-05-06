const express = require("express");
const router = express.Router();
const EnglishUser = require("../models/EnglishUser");

// 🛠️ INTERNAL HELPER: Status check karne ke liye (Sabhi routes ke liye)
const checkAndGetStatus = async (user) => {
  const now = new Date();
  // Agar premium hai aur date nikal chuki hai, toh DB update karo
  if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < now) {
    console.log(`⚠️ Auto-Expiry Triggered: ${user.email}`);
    user.isPremium = false;
    user.planType = "free";
    await user.save();
  }
  return {
    isPremium: user.isPremium || false,
    planType: user.planType || "free",
    premiumExpiry: user.premiumExpiry || null
  };
};

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
    let user = await EnglishUser.findOne({ email: cleanEmail });

    if (user) {
      user.firebaseUid = firebaseUid;
      if (name && name !== "User") user.name = name;
      
      // 🔥 Sync ke waqt bhi check karo (No ghost premium)
      const statusData = await checkAndGetStatus(user);
      
      return res.status(200).json({
        success: true,
        message: "User synced successfully",
        email: user.email,
        name: user.name,
        ...statusData // Yeh updated isPremium aur planType bhejega
      });
    }

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
      name: newUser.name,
      isPremium: false,
      planType: "free"
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

    // 🔥 Login ke waqt expiry check karke hi data bhejo
    const statusData = await checkAndGetStatus(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      email: user.email,
      name: user.name,
      ...statusData
    });

  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ==========================================
// 🛰️ STATUS CHECK (Real-time Expiry)
// ==========================================
router.get("/status", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await EnglishUser.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔥 Real-time check and update
    const statusData = await checkAndGetStatus(user);

    res.json({
      success: true,
      ...statusData
    });

  } catch (error) {
    console.error("Status Route Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;