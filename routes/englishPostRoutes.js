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
    allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "mov"],
    resource_type: "auto", 
  },
});

const upload = multer({ storage: storage });

// ✅ 1. CREATE MULTI-MEDIA POST
router.post("/create", upload.array("images", 10), async (req, res) => {
  try {
    const { word, meaning, userEmail, mediaMetadata } = req.body;
    const metadata = JSON.parse(mediaMetadata || "[]");
    const files = req.files || [];

    let finalMedia = [];
    let fileIndex = 0;

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
      media: finalMedia,
      image: finalMedia[0]?.url || "",
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

// ✅ 4. 🔥 COMMAND STATS UPDATE (SRS Logic Fixed)
router.post("/update-stat/:postId", async (req, res) => {
  try {
    const { level, email, nextReview } = req.body;
    const post = await EnglishPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const existingIdx = post.userStats.findIndex(u => u.email === email);
    
    // 🧠 Date conversion wrapper: Essential for time comparison logic
    const reviewDate = nextReview ? new Date(nextReview) : null;

    if (existingIdx !== -1) {
      const oldLevel = post.userStats[existingIdx].level;
      
      // Agar practice se call nahi hai aur level same hai, toh toggle (remove) karo
      if (oldLevel === level && nextReview === undefined) {
        post.commandStats[level] = Math.max(0, (post.commandStats[level] || 0) - 1);
        post.userStats.splice(existingIdx, 1);
      } else {
        // Update existing record
        post.commandStats[oldLevel] = Math.max(0, (post.commandStats[oldLevel] || 0) - 1);
        post.commandStats[level] = (post.commandStats[level] || 0) + 1;
        post.userStats[existingIdx].level = level;
        post.userStats[existingIdx].nextReview = reviewDate; // ✅ Saving as Date Object
      }
    } else {
      // Add new record
      post.commandStats[level] = (post.commandStats[level] || 0) + 1;
      post.userStats.push({ email, level, nextReview: reviewDate }); // ✅ Saving as Date Object
    }

    post.markModified('commandStats');
    post.markModified('userStats'); 
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

// ✅ 9. GET ALL SAVED POSTS
router.get("/saved", async (req, res) => {
  const { email } = req.query;
  try {
    const posts = await EnglishPost.find({ "userStats.email": email });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching saved words", error: err });
  }
});

// ✅ DELETE COMMENT
router.delete("/comment/:postId/:commentId", async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { email } = req.body; // Verification ke liye

    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Optional: Check if user owns the comment
    // if (comment.email !== email) return res.status(403).json({ message: "Unauthorized" });

    comment.remove(); // Mongoose sub-document removal
    await post.save();
    res.json({ success: true, comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ EDIT COMMENT
router.put("/comment/:postId/:commentId", async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;

    const post = await EnglishPost.findById(postId);
    const comment = post.comments.id(commentId);
    
    if (comment) {
      comment.text = text;
      await post.save();
      res.json({ success: true, comments: post.comments });
    } else {
      res.status(404).json({ message: "Comment not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;