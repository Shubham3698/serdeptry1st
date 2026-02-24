const express = require("express");
const router = express.Router();
const User = require("../models/user");

// ===================
// SIGNUP
// ===================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const newUser = new User({ name, email, password });
    await newUser.save();

    // 🔥 RETURN NAME ALSO
    res.status(201).json({
      message: "User created successfully",
      email: newUser.email,
      name: newUser.name
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===================
// LOGIN
// ===================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (user.password !== password)
      return res.status(400).json({ message: "Incorrect password" });

    res.status(200).json({
      message: "Login successful",
      email: user.email,
      name: user.name
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;