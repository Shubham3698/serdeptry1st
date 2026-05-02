const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ CLOUDINARY CONFIG (Rehndena same)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "english_community_posts",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

// ✅ 1. CREATE POST (Same as before)
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = req.body.image;
    if (req.file) { imageUrl = req.file.path; }
    if (!imageUrl) return res.status(400).json({ success: false, message: "Image is required" });

    const newPost = new EnglishPost({
      word: req.body.word,
      meaning: req.body.meaning,
      image: imageUrl,
      userEmail: req.body.userEmail,
      badgeName: req.body.badgeName || "Normal",
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 2. VOTE / UNVOTE TOGGLE (Same as before)
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

// ✅ 3. 🔥 SMART UPDATE COMMAND STATS (FIXED FOR ONE-USER-ONE-LEVEL)
router.post("/update-stat/:postId", async (req, res) => {
  try {
    const { level, email } = req.body; // Frontend se email bhej rahe ho ab
    const { postId } = req.params;

    if (!email) return res.status(400).json({ message: "Email is required to track progress" });

    const allowedLevels = ['neverHeard', 'heardButNotUsed', 'dailyUse'];
    if (!allowedLevels.includes(level)) return res.status(400).json({ message: "Invalid level" });

    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Ensure commandStats object exists
    if (!post.commandStats) {
      post.commandStats = { neverHeard: 0, heardButNotUsed: 0, dailyUse: 0 };
    }

    // Check karo kya is user ne pehle koi level select kiya tha?
    // userStats: [{ email: String, level: String }]
    const existingIdx = post.userStats.findIndex(u => u.email === email);

    if (existingIdx !== -1) {
      const oldLevel = post.userStats[existingIdx].level;

      // 1. Agar wahi same level phir se dabaya -> Undo (Remove Selection)
      if (oldLevel === level) {
        post.commandStats[level] = Math.max(0, (post.commandStats[level] || 0) - 1);
        post.userStats.splice(existingIdx, 1);
      } 
      // 2. Agar different level dabaya -> Switch Level
      else {
        post.commandStats[oldLevel] = Math.max(0, (post.commandStats[oldLevel] || 0) - 1);
        post.commandStats[level] = (post.commandStats[level] || 0) + 1;
        post.userStats[existingIdx].level = level;
      }
    } 
    // 3. Agar pehli baar select kar raha hai
    else {
      post.commandStats[level] = (post.commandStats[level] || 0) + 1;
      post.userStats.push({ email, level });
    }

    // Mark as modified kyunki nested objects update ho rahe hain
    post.markModified('commandStats');
    post.markModified('userStats');

    await post.save();
    res.json({ success: true, commandStats: post.commandStats, userStats: post.userStats });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ 4. GET ALL COMMUNITY POSTS
router.get("/all", async (req, res) => {
  try {
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