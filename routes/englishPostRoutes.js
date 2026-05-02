const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ CLOUDINARY CONFIG
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

// ✅ 1. CREATE POST (Added badgeName)
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = req.body.image;
    if (req.file) { imageUrl = req.file.path; }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const newPost = new EnglishPost({
      word: req.body.word,
      meaning: req.body.meaning,
      image: imageUrl,
      userEmail: req.body.userEmail,
      badgeName: req.body.badgeName || "Normal", // 🔥 Frontend se badge name receive karne ke liye
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    console.error("❌ Post Create Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 2. VOTE / UNVOTE TOGGLE
router.post("/vote/:postId", async (req, res) => {
  try {
    const { email } = req.body;
    const post = await EnglishPost.findById(req.params.postId);

    if (!post) return res.status(404).json({ message: "Post not found" });

    const voteIndex = post.votedBy.indexOf(email);

    if (voteIndex > -1) {
      post.votedBy.splice(voteIndex, 1);
      post.voteCount = Math.max(0, (post.voteCount || 0) - 1);
    } else {
      post.votedBy.push(email);
      post.voteCount = (post.voteCount || 0) + 1;
    }

    await post.save();
    res.json({ success: true, voteCount: post.voteCount, votedBy: post.votedBy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 3. UPDATE COMMAND STATS
router.post("/update-stat/:postId", async (req, res) => {
  try {
    const { level } = req.body; 
    
    const allowedLevels = ['neverHeard', 'heardButNotUsed', 'dailyUse'];
    if (!allowedLevels.includes(level)) {
      return res.status(400).json({ message: "Invalid level" });
    }

    const update = { $inc: { [`commandStats.${level}`]: 1 } };
    
    const updatedPost = await EnglishPost.findByIdAndUpdate(
      req.params.postId, 
      update, 
      { new: true }
    );

    res.json({ success: true, commandStats: updatedPost.commandStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 4. GET ALL COMMUNITY POSTS (Sorted by Votes)
router.get("/all", async (req, res) => {
  try {
    // Trending words ko upar rakhne ke liye voteCount se sort kiya
    const posts = await EnglishPost.find().sort({ voteCount: -1, createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 5. GET MY POSTS
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

module.exports = router;