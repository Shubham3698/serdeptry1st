const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseAdmin");
const EnglishUser = require("../models/EnglishUser");
const EnglishPost = require("../models/EnglishPost");
const HiddenSignal = require("../models/HiddenSignal"); // Naya model jo dismiss track karega

// 🎯 Route 1: Token Save Karo (Existing)
router.post("/save-token", async (req, res) => {
  const { email, fcmToken } = req.body;
  try {
    await EnglishUser.findOneAndUpdate({ email }, { fcmToken }, { upsert: true });
    res.json({ success: true, message: "Token Secured! 📡" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🕒 Helper: Time-Ago Calculation Logic
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "Just now";
};

// 🎯 Route 2: Latest Notifications (With Filter for Hidden Posts)
router.get("/latest", async (req, res) => {
  const { email } = req.query; // User email pass karna zaroori hai filtering ke liye
  try {
    let hiddenIds = [];
    
    // 1. Agar user logged in hai, toh uske dismiss kiye hue IDs nikaalo
    if (email) {
      const hiddenRecord = await HiddenSignal.findOne({ userEmail: email });
      if (hiddenRecord) {
        hiddenIds = hiddenRecord.hiddenPostIds;
      }
    }

    // 2. Posts fetch karo jo hidden list mein NAHI hain ($nin logic)
    const latestPosts = await EnglishPost.find({ _id: { $nin: hiddenIds } })
      .sort({ createdAt: -1 })
      .limit(15);

    const signals = latestPosts.map(post => {
      const displayWord = post.word || (post.vocabData && post.vocabData[0]?.word) || "New Post";
      const displayUser = post.userName || (post.userEmail ? post.userEmail.split('@')[0] : "Learner");

      return {
        id: post._id.toString(),
        userName: displayUser,
        word: displayWord,
        postId: post._id.toString(),
        time: getTimeAgo(post.createdAt) 
      };
    });

    res.status(200).json({
      success: true,
      notifications: signals
    });
  } catch (err) {
    console.error("❌ Signal Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🎯 Route 3: Single Signal Dismiss (X Button Logic)
router.post("/dismiss", async (req, res) => {
  const { email, postId } = req.body;
  if (!email || !postId) return res.status(400).json({ success: false });

  try {
    await HiddenSignal.findOneAndUpdate(
      { userEmail: email },
      { $addToSet: { hiddenPostIds: postId } }, // $addToSet se duplicate nahi hoga
      { upsert: true }
    );
    res.json({ success: true, message: "Signal dismissed permanently! 🛸" });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// 🎯 Route 4: Clear All Notifications (Nuke All Logic)
router.post("/clear-all", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false });

  try {
    // Current saari posts ki IDs nikaalo (latest 50 tak)
    const allPosts = await EnglishPost.find().select('_id').limit(50);
    const allIds = allPosts.map(p => p._id);

    await HiddenSignal.findOneAndUpdate(
      { userEmail: email },
      { $addToSet: { hiddenPostIds: { $each: allIds } } },
      { upsert: true }
    );
    res.json({ success: true, message: "Signals Hub cleared! 🧹" });
  } catch (err) {
    res.status(500).json({ succe    ss: false });
  }
});

module.exports = router;