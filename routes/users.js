const express = require("express");
const router = express.Router();
const User = require("../models/user");

// ===================
// SIGNUP (Updated for Firebase Sync)
// ===================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, firebaseUid } = req.body; // firebaseUid frontend se aayega

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    // firebaseUid ko save karna zaroori hai sync ke liye
    const newUser = new User({ 
      name, 
      email, 
      password, // Note: Ideally, password backend pe save nahi karte agar Firebase use kar rahe ho, par tumhare structure ke liye rehne diya hai
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

// ===================
// LOGIN (Updated)
// ===================
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found in database" });

    // Frontend pe Firebase verify kar lega password, yahan se sirf user data bhej rahe hain
    res.status(200).json({
      message: "Login successful",
      email: user.email,
      name: user.name
    });

  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;