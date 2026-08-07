const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseAdmin");
const EnglishUser = require("../models/EnglishUser");
const EnglishPost = require("../models/EnglishPost");
const HiddenSignal = require("../models/HiddenSignal"); // Naya model jo dismiss track karega
const Notification = require("../models/english/Notification");

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

// 🎯 Route: Latest Notifications
router.get("/latest", async (req, res) => {
  const { email } = req.query; 
  if (!email) return res.status(400).json({ success: false });

  try {
    // ❌ REMOVED the duplicate require statements from here

    let hiddenIds = [];
    const hiddenRecord = await HiddenSignal.findOne({ userEmail: email });
    if (hiddenRecord) {
      hiddenIds = hiddenRecord.hiddenPostIds;
    }

    // 1. Posts fetch karo
    const latestNotifs = await Notification.find({ 
      recipientEmail: email,
      _id: { $nin: hiddenIds } 
    }).sort({ createdAt: -1 }).limit(15);

    // 2. 🔥 CHECK UNREAD COUNT 🔥
    const unreadCount = await Notification.countDocuments({
      recipientEmail: email,
      isRead: false,
      _id: { $nin: hiddenIds }
    });

const signals = latestNotifs.map(notif => {
      let titlePrefix = "Intel";
      if (notif.type === 'LIKE') titlePrefix = "New Like ❤️";
      if (notif.type === 'COMMENT') titlePrefix = "New Comment 💬";
      if (notif.type === 'NEW_POST') titlePrefix = "New Signal 📡";
      
      // 🔥 Naya Chat Logic
      if (notif.type === 'CHAT') titlePrefix = `${notif.word} 💬`;

      return {
        id: notif._id.toString(),
        userName: notif.senderName || "Learner",
        title: titlePrefix,
        word: notif.message || "Activity update", // Chat ka text yahan aayega
        postId: notif.postId, // Ye ab Squad ID hogi chat ke case me
        type: notif.type,     // 🔥 Frontend ko batana padega ki ye Chat hai
        time: getTimeAgo(notif.createdAt),
        isRead: notif.isRead
      };
    });
    res.status(200).json({
      success: true,
      hasUnread: unreadCount > 0, // 🔥 Ye Red Dot ko on karega
      notifications: signals
    });
  } catch (err) {
    console.error("❌ Signal Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🎯 Route: Mark all as Read
router.post("/mark-read", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false });

  try {
    // ❌ REMOVED the duplicate require statement from here too
    
    // Saari unread notifications ko true kar do
    await Notification.updateMany(
      { recipientEmail: email, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});
// 🎯 Route: Mark all as Read
router.post("/mark-read", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false });

  try {
    const Notification = require("../models/Notification");
    // Saari unread notifications ko true kar do
    await Notification.updateMany(
      { recipientEmail: email, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false });
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
    res.status(500).json({ success: false });
  }
});

module.exports = router;