const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ CLOUDINARY CONFIGURATION
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "english_community_posts",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "mov"], // Added video formats
    resource_type: "auto", // Essential for Video + Image support
  },
});

const upload = multer({ storage: storage });

// ✅ 1. CREATE MULTI-MEDIA POST
// Optimized to handle a sequence of Images, Videos, and YouTube Embeds
router.post("/create", upload.array("images", 10), async (req, res) => {
  try {
    const { word, meaning, userEmail, mediaMetadata } = req.body;
    const metadata = JSON.parse(mediaMetadata || "[]");
    const files = req.files || [];

    let finalMedia = [];
    let fileIndex = 0;

    // Merge uploaded files and links based on the sequence from frontend
    metadata.forEach((item) => {
      if (item.mode === "file") {
        if (files[fileIndex]) {
          finalMedia.push({ type: item.type, url: files[fileIndex].path });
          fileIndex++;
        }
      } else {
        finalMedia.push({ type: item.type, url: item.url });
      }
    });

    // Fallback: If no metadata but single image exists (Old app compatibility)
    if (finalMedia.length === 0 && (req.body.image || files[0])) {
      finalMedia.push({ 
        type: "image", 
        url: files[0] ? files[0].path : req.body.image 
      });
    }

    const newPost = new EnglishPost({
      word,
      meaning,
      userEmail,
      media: finalMedia, // Saving the full sequence
      image: finalMedia[0]?.url || "", // Keeping for backward compatibility
      badgeName: req.body.badgeName || "Normal",
      commandStats: { easy: 0, hard: 0, heard: 0, dailyUse: 0 },
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 2. UPDATE MULTI-MEDIA POST
router.put("/update/:id", upload.array("images", 10), async (req, res) => {
  try {
    const postId = req.params.id;
    const { word, meaning, mediaMetadata } = req.body;
    const metadata = JSON.parse(mediaMetadata || "[]");
    const files = req.files || [];

    let finalMedia = [];
    let fileIndex = 0;

    metadata.forEach((item) => {
      if (item.mode === "file") {
        // If a new file is uploaded for this slot, use it. 
        // Otherwise, keep the existing URL sent in metadata.
        if (files[fileIndex]) {
          finalMedia.push({ type: item.type, url: files[fileIndex].path });
          fileIndex++;
        } else {
          finalMedia.push({ type: item.type, url: item.url });
        }
      } else {
        finalMedia.push({ type: item.type, url: item.url });
      }
    });

    const updatedPost = await EnglishPost.findByIdAndUpdate(
      postId,
      { word, meaning, media: finalMedia, image: finalMedia[0]?.url || "" },
      { new: true }
    );

    if (!updatedPost) return res.status(404).json({ success: false, message: "Post not found" });

    res.json({ success: true, data: updatedPost });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 3. 🗳️ VOTE TOGGLE
router.post("/vote/:postId", async (req, res) => {
  try {
    const { email } = req.body;
    const post = await EnglishPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

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
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ 4. 🔥 COMMAND STATS UPDATE
router.post("/update-stat/:postId", async (req, res) => {
  try {
    const { level, email } = req.body;
    const post = await EnglishPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const existingIdx = post.userStats.findIndex(u => u.email === email);

    if (existingIdx !== -1) {
      const oldLevel = post.userStats[existingIdx].level;
      if (oldLevel === level) {
        post.commandStats[level] = Math.max(0, post.commandStats[level] - 1);
        post.userStats.splice(existingIdx, 1);
      } else {
        post.commandStats[oldLevel] = Math.max(0, post.commandStats[oldLevel] - 1);
        post.commandStats[level] = (post.commandStats[level] || 0) + 1;
        post.userStats[existingIdx].level = level;
      }
    } else {
      post.commandStats[level] = (post.commandStats[level] || 0) + 1;
      post.userStats.push({ email, level });
    }

    post.markModified('commandStats');
    await post.save();
    res.json({ success: true, commandStats: post.commandStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 5. GET ALL POSTS
router.get("/all", async (req, res) => {
  try {
    const posts = await EnglishPost.find().sort({ createdAt: -1 }); 
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 6. GET MY POSTS
router.get("/my-posts", async (req, res) => {
  try {
    const { email } = req.query;
    const posts = await EnglishPost.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 7. ADD COMMENT
router.post("/comment/:postId", async (req, res) => {
  try {
    const post = await EnglishPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ name: req.body.name, text: req.body.text });
    await post.save();
    res.json({ success: true, comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 8. DELETE POST
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedPost = await EnglishPost.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ success: false, message: "Resource not found" });
    res.json({ success: true, message: "Entry successfully removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;