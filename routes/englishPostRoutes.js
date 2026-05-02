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

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "english_community_posts",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

// ✅ 1. CREATE POST
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
      // Initialize defaults to avoid null errors later
      votedBy: [],
      voteCount: 0,
      commandStats: { neverHeard: 0, heardButNotUsed: 0, dailyUse: 0 },
      userStats: []
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 2. 🗳️ INSTAGRAM STYLE VOTE TOGGLE (Fixed with Safety Checks)
router.post("/vote/:postId", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Login required to vote" });

    const post = await EnglishPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // 🔥 CRASH FIX: Ensure votedBy array exists
    if (!post.votedBy) post.votedBy = [];

    const voteIndex = post.votedBy.indexOf(email);
    
    if (voteIndex > -1) {
      post.votedBy.splice(voteIndex, 1);
    } else {
      post.votedBy.push(email);
    }

    post.voteCount = post.votedBy.length;
    
    await post.save();
    res.json({ success: true, voteCount: post.voteCount, votedBy: post.votedBy });
  } catch (err) {
    console.error("❌ Vote Route Crash:", err); // Backend terminal mein check karo
    res.status(500).json({ message: "Internal Server Error. Check terminal." });
  }
});

// ✅ 3. 🔥 SMART COMMAND STATS (Fixed with Safety Checks)
router.post("/update-stat/:postId", async (req, res) => {
  try {
    const { level, email } = req.body;
    const { postId } = req.params;

    if (!email) return res.status(400).json({ message: "Email required" });

    const allowedLevels = ['neverHeard', 'heardButNotUsed', 'dailyUse'];
    if (!allowedLevels.includes(level)) return res.status(400).json({ message: "Invalid level" });

    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // 🔥 CRASH FIX: Ensure objects/arrays exist before running logic
    if (!post.commandStats) {
      post.commandStats = { neverHeard: 0, heardButNotUsed: 0, dailyUse: 0 };
    }
    if (!post.userStats) {
      post.userStats = [];
    }

    const existingIdx = post.userStats.findIndex(u => u.email === email);

    if (existingIdx !== -1) {
      const oldLevel = post.userStats[existingIdx].level;

      if (oldLevel === level) {
        post.commandStats[level] = Math.max(0, (post.commandStats[level] || 0) - 1);
        post.userStats.splice(existingIdx, 1);
      } else {
        post.commandStats[oldLevel] = Math.max(0, (post.commandStats[oldLevel] || 0) - 1);
        post.commandStats[level] = (post.commandStats[level] || 0) + 1;
        post.userStats[existingIdx].level = level;
      }
    } else {
      post.commandStats[level] = (post.commandStats[level] || 0) + 1;
      post.userStats.push({ email, level });
    }

    post.markModified('commandStats');
    post.markModified('userStats');

    await post.save();
    res.json({ success: true, commandStats: post.commandStats, userStats: post.userStats });
  } catch (err) {
    console.error("❌ Stats Route Crash:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ 4. GET ALL 
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

// ✅ ADD COMMENT
router.post("/comment/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { name, text } = req.body;

    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });

    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ name, text });
    await post.save();

    res.json({ success: true, comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;