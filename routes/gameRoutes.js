const express = require("express");
const router = express.Router();
const User = require("../models/user"); // Path sahi check kar lena

// 🪙 1. Get User Credits
router.get("/user-credits/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.json({ success: true, credits: user.credits || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🪙 2. Add Credits after Game
router.post("/game-credit", async (req, res) => {
  const { email, credits } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Credits update karo
    user.credits = (user.credits || 0) + Number(credits);
    await user.save();

    res.json({ success: true, message: "Credits updated!", credits: user.credits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;