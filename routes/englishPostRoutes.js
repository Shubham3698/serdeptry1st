const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ CLOUDINARY CONFIG (Now using .env variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📁 MULTER STORAGE SETUP
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "english_community_posts",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

// ✅ CREATE POST (Handles File Upload or URL)
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = req.body.image; // Agar frontend se link bheja hai

    // Agar file upload ki gayi hai toh Cloudinary ka path use karein
    if (req.file) {
      imageUrl = req.file.path;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const newPost = new EnglishPost({
      word: req.body.word,
      meaning: req.body.meaning,
      image: imageUrl,
      userEmail: req.body.userEmail
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    console.error("❌ Post Create Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET MY POSTS
router.get("/my-posts", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email required" });

    const posts = await EnglishPost.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET ALL COMMUNITY POSTS
router.get("/all", async (req, res) => {
  try {
    const posts = await EnglishPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;