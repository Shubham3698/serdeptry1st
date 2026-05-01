const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");

// 1. Sabhi users ke posts (Community Feed)
router.get("/all", async (req, res) => {
  try {
    const posts = await EnglishPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Sirf logged-in user ke posts
router.get("/my-posts", async (req, res) => {
  try {
    const { email } = req.query;
    const posts = await EnglishPost.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Naya post create karna
router.post("/create", async (req, res) => {
  try {
    const newPost = new EnglishPost(req.body);
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;