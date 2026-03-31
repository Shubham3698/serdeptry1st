const express = require("express");
const router = express.Router();
const User = require("../models/user");

// ==========================================
// SIGNUP / SYNC (Email, Google & Phone)
// ==========================================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, firebaseUid } = req.body;

    // 🔥 FIX: Find user if already exists (Google/Phone login handle karne ke liye)
    let user = await User.findOne({ email });

    if (user) {
      // Agar user mil gaya, toh data sync kar do (Error nahi bhejenge)
      user.firebaseUid = firebaseUid;
      if (name) user.name = name; 
      // Note: isVerified ko yahan update nahi kar rahe kyunki wo login par hoga
      await user.save();
      
      return res.status(200).json({
        message: "User synced successfully",
        email: user.email,
        name: user.name
      });
    }

    // Naya user banao agar DB mein nahi hai
    const newUser = new User({ 
      name: name || "User", 
      email, 
      password: password || "social_auth_no_password", 
      firebaseUid 
    });
    
    await newUser.save();

    res.status(201).json({
      message: "User created in DB, waiting for email verification",
      email: newUser.email,
      name: newUser.name
    });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// ==========================================
// LOGIN (Sync isVerified for all methods)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    // 🔥 Update: Find user and mark as verified since they passed Firebase check
    // Ye Google, Phone aur Email teeno ke liye kaam karega
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: "User not found in database" });

    res.status(200).json({
      message: "Login successful",
      email: user.email,
      name: user.name,
      isVerified: user.isVerified
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;