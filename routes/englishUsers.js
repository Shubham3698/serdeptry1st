const express = require("express");
const router = express.Router();
const EnglishUser = require("../models/EnglishUser");

// Signup logic
router.post("/signup", async (req, res) => {
  try {
    const { name, email, firebaseUid } = req.body;
    let user = await EnglishUser.findOne({ email });
    if (!user) {
      user = new EnglishUser({ name, email, firebaseUid });
      await user.save();
    }
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login logic
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await EnglishUser.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found in English DB" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;