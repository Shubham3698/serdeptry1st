const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const translate = require('google-translate-api-next');

const admin = require("../config/firebaseAdmin");
const EnglishUser = require("../models/EnglishUser");

const PersonalVault = require("../models/english/PersonalVault");
const Notification = require("../models/english/Notification");

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

/**
 * 📡 SEND BLAST: Notifies all active users about a new vocabulary signal.
 * Redirects web users directly to the specific post on Vercel.
 */
const sendBlast = async (title, word, postId) => {
  try {
    // 1. Sirf un active users ko dhundo jinke paas valid FCM Token hai
    const users = await EnglishUser.find({ 
      fcmToken: { $exists: true, $ne: null, $ne: "" } 
    });
    
    const tokens = users.map(u => u.fcmToken);

    if (tokens.length > 0) {
      const message = {
        notification: {
          // ✅ Dynamic Title (e.g., "Daily Slang Pack")
          title: title || "New Signal Detected! 📡", 
          // ✅ Word focus in body
          body: `Intelligence Update: "${word}". Tap to analyze! 🚀`,
        },

        // 🌐 WEB CONFIGURATION (Chrome, Edge, Safari)
        webpush: {
          fcm_options: {
            // 🔥 FIXED REDIRECT: Seedha Vercel link par land karega
            link: `https://english1stcomm.vercel.app/?postId=${postId}`
          },
          notification: {
            icon: 'https://english1stcomm.vercel.app/logo192.png', 
            badge: 'https://english1stcomm.vercel.app/logo192.png',
            tag: 'new-signal', // Purani notifications ko overwrite karega (Clean UX)
            renotify: true,    // Nayi notification par phone vibrate karega
            requireInteraction: true // Jab tak user click na kare, notification dikhti rahegi
          }
        },

        // 📱 ANDROID CONFIGURATION (Dameeto Style)
        android: {
          priority: 'high',
          notification: {
            color: '#fbbf24', // Yellow brand color
            icon: 'stock_ticker_update',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default'
          },
        },

        tokens: tokens,
      };

      // 🚀 Multicast delivery (Batch processing)
      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`✅ Signals Dispatched: ${response.successCount} users notified on Vercel.`);
      
      // 🚨 Cleanup logic: Agar tokens invalid hain toh failure count dikhayega
      if (response.failureCount > 0) {
        console.log(`⚠️ Signal interference: ${response.failureCount} devices failed to receive.`);
      }

    } else {
      console.log("ℹ️ No active signals: 0 FCM tokens found in database.");
    }
  } catch (err) {
    console.error("❌ Critical Signal Failure:", err.message);
  }
};
// ✅ Updated Create Route
// ✅ Updated Create Route (WITH NOTIFICATION TRIGGER)
router.post("/create", upload.array("images", 20), async (req, res) => {
  try {
    // 1. Receving Data
    const { userEmail, userName, vocabData, mediaMetadata, badgeName, title } = req.body;
    
    const parsedVocab = vocabData ? JSON.parse(vocabData) : [];
    const metadata = mediaMetadata ? JSON.parse(mediaMetadata) : [];
    const files = req.files || [];

    if (parsedVocab.length === 0) {
      return res.status(400).json({ success: false, message: "Bhai, kam se kam ek word toh dalo!" });
    }

    // 2. MASTER TITLE LOGIC 
    const manualTitle = title || parsedVocab[0]?.title || "New Deck"; 

    let fileIndex = 0;
    const finalVocabData = parsedVocab.map((vocab, vIdx) => {
      let wordMedia = [];
      const currentWordMeta = metadata.filter(m => m.vocabIndex === vIdx);

      currentWordMeta.forEach((meta) => {
        if (meta.mode === "file") {
          if (files[fileIndex]) {
            wordMedia.push({ type: meta.type, url: files[fileIndex].path });
            fileIndex++;
          }
        } else if (meta.url) {
          wordMedia.push({ type: meta.type, url: meta.url });
        }
      });

      return {
        title: vocab.title || "", 
        word: vocab.word,
        meaning: vocab.meaning,
        sentence: vocab.sentence || "",
        media: wordMedia
      };
    });

    // 3. Initialize New Post
    const newPost = new EnglishPost({
      title: manualTitle, 
      vocabData: finalVocabData,
      userEmail,
      userName: userName || userEmail?.split('@')[0],
      badgeName: badgeName || "Normal",
    });

    // 4. Save Post to Database
    await newPost.save();

    // ----------------------------------------------------
    // 🔥 NEW: FIREBASE PUSH NOTIFICATION TRIGGER LOGIC 🔥
    // ----------------------------------------------------
    try {
      const firstWord = finalVocabData[0]?.word || "New Deck";
      const postTitle = newPost.title; 
      const postId = newPost._id.toString(); 

      // Tumhare pass 'sendBlast' pehle se likha tha, lekin hum ek bar confirm code likh rahe hain
      const users = await EnglishUser.find({ 
        fcmToken: { $exists: true, $ne: null, $ne: "" },
        email: { $ne: userEmail } // Jisne post kiya usko notify mat karo
      });
      
      const tokens = users.map(u => u.fcmToken);

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: postTitle || "New Signal Detected! 📡", 
            body: `Intelligence Update: "${firstWord}". Tap to analyze! 🚀`,
          },
          data: {
            postId: postId, // Android me handle karne ke liye (Optional)
            word: firstWord
          },
          tokens: tokens,
        };

        // Firebase ko Multicast bhejo
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Push Sent: ${response.successCount} users notified!`);
      }
    } catch (pushErr) {
      console.error("❌ Firebase Push Error:", pushErr.message);
      // Agar notification fail ho, tab bhi post save ki success bhejna chahiye
    }
    // ----------------------------------------------------

    // 5. Final Response
    res.status(201).json({ 
      success: true, 
      message: "Smart Deck Created & Notified! 🚀", 
      data: newPost 
    });

  } catch (err) {
    console.error("🚨 Create Deck Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ✅ 2. UPDATE SMART DECK POST
router.put("/update/:id", upload.array("images", 20), async (req, res) => {
  try {
    const postId = req.params.id;
    // 🔥 FIX 1: 'title' recieve karna zaroori hai update form se
    const { vocabData, mediaMetadata, title, userName, badgeName } = req.body;
    
    const existingPost = await EnglishPost.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ success: false, message: "Signal not found in database." });
    }

    // 1. 🛡️ Safe Parsing (JSON handling)
    const parsedVocab = vocabData ? JSON.parse(vocabData) : [];
    const metadata = mediaMetadata ? JSON.parse(mediaMetadata) : [];
    const files = req.files || [];

    // 🔥 Root title update: Agar user ne naya bheja hai toh wo, warna purana database wala
    const manualTitle = title || existingPost.title;

    let fileIndex = 0;
    const finalVocabData = parsedVocab.map((vocab, vIdx) => {
      let wordMedia = [];
      const currentWordMeta = metadata.filter(m => m.vocabIndex === vIdx);

      currentWordMeta.forEach((meta) => {
        /**
         * 🔥 THE MASTER LOGIC: (Undisturbed)
         */
        const isUrlValue = typeof meta.value === 'string' && meta.value.startsWith('http');
        const isUrlField = typeof meta.url === 'string' && meta.url.startsWith('http');

        if (meta.mode === "file" && !isUrlValue) {
          if (files[fileIndex]) {
            wordMedia.push({ 
              type: meta.type || "image", 
              url: files[fileIndex].path 
            });
            fileIndex++;
          }
        } else {
          const finalUrl = meta.value || meta.url;
          if (finalUrl) {
            const isYT = finalUrl.includes('youtube') || finalUrl.includes('youtu.be');
            wordMedia.push({ 
              type: isYT ? "video" : (meta.type || "image"), 
              url: finalUrl 
            });
          }
        }
      });

      return {
        title: vocab.title || "", // 🔥 FIX 2: Individual Card ka title sync ho raha hai
        word: vocab.word,
        meaning: vocab.meaning,
        sentence: vocab.sentence || "",
        media: wordMedia
      };
    });

    // 2. 🔄 Atomic Field Updates
    existingPost.vocabData = finalVocabData;
    existingPost.title = manualTitle; // ✅ Ultimate Title updated
    
    if (userName) existingPost.userName = userName;
    if (badgeName) existingPost.badgeName = badgeName;

    /**
     * 🔥 SAVE: Ye pre-save middleware trigger karega.
     * Isse 'word', 'meaning' aur 'image' fields automatic sync ho jayenge first card se.
     */
    const updatedPost = await existingPost.save();

    res.json({ 
      success: true, 
      message: "Intelligence Hub Updated! ✅",
      data: updatedPost 
    });

  } catch (err) {
    console.error("🚨 Update Deck Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Update failed: " + err.message 
    });
  }
});
// ✅ 3. 🗳️ VOTE TOGGLE (Updated with Notifications)
router.post("/vote-word/:postId/:wordId", async (req, res) => {
  // ... (Pura upar ka code waise hi rahega)

  // 🔥 CREATE LIKE NOTIFICATION 🔥
  if (isLiking && post.userEmail && post.userEmail !== email) {
    const newNotif = new Notification({
      recipientEmail: post.userEmail,
      senderEmail: email,
      senderName: email.split('@')[0], 
      type: 'LIKE',
      postId: post._id,
      word: wordEntry.word,
      message: "liked your signal 🔥"
    });
    await newNotif.save();

    // 🚀🚀 YAHAN PUSH NOTIFICATION BHEJO 🚀🚀
    await sendPushNotification(
      post.userEmail,                     // Jisko bhejna hai
      "New Like ❤️",                    // Title
      `@${email.split('@')[0]} liked: "${wordEntry.word}"`, // Body
      post._id.toString()                 // Post ID (Click hone par yahan aayega)
    );
  }

  res.json({ 
    success: true, 
    voteCount: wordEntry.voteCount, 
    isVoted: isLiking 
  });
  // ... (Baaki error catch waisa hi)
});

router.post("/update-word-stat/:postId/:wordId", async (req, res) => {
  try {
    const { postId, wordId } = req.params;
    const { level, email, nextReview } = req.body;

    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) return res.status(400).json({ success: false, message: "Email required" });

    // 1. Post & Word Entry dhundo
    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const wordEntry = post.vocabData.id(wordId);
    if (!wordEntry) return res.status(404).json({ success: false, message: "Word not found in deck" });

    if (!wordEntry.commandStats) {
      wordEntry.commandStats = { easy: 0, hard: 0, heard: 0, dailyUse: 0 };
    }

    const existingIdx = wordEntry.wordStats.findIndex(u => u.email === normalizedEmail);
    const reviewDate = nextReview ? new Date(nextReview) : null;
    let isVoteRemoved = false;

    // --- HUB LOGIC ---
    if (existingIdx !== -1) {
      const oldLevel = wordEntry.wordStats[existingIdx].level;
      if (oldLevel === level && nextReview === undefined) {
        wordEntry.commandStats[level] = Math.max(0, (wordEntry.commandStats[level] || 0) - 1);
        wordEntry.wordStats.splice(existingIdx, 1);
        isVoteRemoved = true;
      } else {
        wordEntry.commandStats[oldLevel] = Math.max(0, (wordEntry.commandStats[oldLevel] || 0) - 1);
        wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
        wordEntry.wordStats[existingIdx].level = level;
        wordEntry.wordStats[existingIdx].nextReview = reviewDate;
      }
    } else {
      wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
      wordEntry.wordStats.push({ email: normalizedEmail, level, nextReview: reviewDate });
    }

    post.markModified('vocabData');
    await post.save();

    // --- 🔥 VAULT SYNC (PATH FIXED) ---
    // Yahan hum try-catch ke saath path check kar rahe hain taaki crash na ho
    let PersonalVault;
    try {
      // Option A: Agar models seedha folder mein hai
      PersonalVault = require("../models/PersonalVault");
    } catch (e) {
      try {
        // Option B: Agar models/english folder mein hai
        PersonalVault = require("../models/english/PersonalVault");
      } catch (e2) {
        console.error("🚨 Path Error: PersonalVault model nahi mila. Please check your folder structure.");
        throw new Error("PersonalVault model not found");
      }
    }

    // PULL - Purani manual ya duplicate entry hatana
    await PersonalVault.findOneAndUpdate(
      { userEmail: normalizedEmail },
      { $pull: { vaultItems: { wordId: wordId } } }
    );

    // PUSH - Hub vote ke according place karna
    if (!isVoteRemoved) {
      await PersonalVault.findOneAndUpdate(
        { userEmail: normalizedEmail },
        { 
          $push: { 
            vaultItems: { 
              wordId: wordId,
              parentPostId: postId,
              word: wordEntry.word,
              meaning: wordEntry.meaning,
              category: level,
              addedAt: new Date()
            } 
          } 
        },
        { upsert: true }
      );
    }

    res.json({ success: true, commandStats: wordEntry.commandStats, isVoteRemoved });

  } catch (err) {
    console.error("🚨 Stat Sync Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
router.post("/update-word-stat/:postId/:wordId", async (req, res) => {
  try {
    const { postId, wordId } = req.params;
    const { level, email, nextReview } = req.body;

    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) return res.status(400).json({ success: false, message: "Email required" });

    // 1. Post & Word Entry dhundo
    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const wordEntry = post.vocabData.id(wordId);
    if (!wordEntry) return res.status(404).json({ success: false, message: "Word not found in deck" });

    if (!wordEntry.commandStats) {
      wordEntry.commandStats = { easy: 0, hard: 0, heard: 0, dailyUse: 0 };
    }

    const existingIdx = wordEntry.wordStats.findIndex(u => u.email === normalizedEmail);
    const reviewDate = nextReview ? new Date(nextReview) : null;
    let isVoteRemoved = false;

    // --- HUB LOGIC ---
    if (existingIdx !== -1) {
      const oldLevel = wordEntry.wordStats[existingIdx].level;
      if (oldLevel === level && nextReview === undefined) {
        wordEntry.commandStats[level] = Math.max(0, (wordEntry.commandStats[level] || 0) - 1);
        wordEntry.wordStats.splice(existingIdx, 1);
        isVoteRemoved = true;
      } else {
        wordEntry.commandStats[oldLevel] = Math.max(0, (wordEntry.commandStats[oldLevel] || 0) - 1);
        wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
        wordEntry.wordStats[existingIdx].level = level;
        wordEntry.wordStats[existingIdx].nextReview = reviewDate;
      }
    } else {
      wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
      wordEntry.wordStats.push({ email: normalizedEmail, level, nextReview: reviewDate });
    }

    post.markModified('vocabData');
    await post.save();

    // --- 🔥 VAULT SYNC (PATH FIXED) ---
    // Yahan hum try-catch ke saath path check kar rahe hain taaki crash na ho
    let PersonalVault;
    try {
      // Option A: Agar models seedha folder mein hai
      PersonalVault = require("../models/PersonalVault");
    } catch (e) {
      try {
        // Option B: Agar models/english folder mein hai
        PersonalVault = require("../models/english/PersonalVault");
      } catch (e2) {
        console.error("🚨 Path Error: PersonalVault model nahi mila. Please check your folder structure.");
        throw new Error("PersonalVault model not found");
      }
    }

    // PULL - Purani manual ya duplicate entry hatana
    await PersonalVault.findOneAndUpdate(
      { userEmail: normalizedEmail },
      { $pull: { vaultItems: { wordId: wordId } } }
    );

    // PUSH - Hub vote ke according place karna
    if (!isVoteRemoved) {
      await PersonalVault.findOneAndUpdate(
        { userEmail: normalizedEmail },
        { 
          $push: { 
            vaultItems: { 
              wordId: wordId,
              parentPostId: postId,
              word: wordEntry.word,
              meaning: wordEntry.meaning,
              category: level,
              addedAt: new Date()
            } 
          } 
        },
        { upsert: true }
      );
    }

    res.json({ success: true, commandStats: wordEntry.commandStats, isVoteRemoved });

  } catch (err) {
    console.error("🚨 Stat Sync Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
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

router.get("/single/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await EnglishPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: "Signal/Post not found" });
    }
    
    res.status(200).json({ success: true, post: post });
  } catch (err) {
    console.error("🚨 Single Post Fetch Error:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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

// ✅ 7. ADD COMMENT (Updated with Notifications)
router.post("/comment/:postId", upload.single("image"), async (req, res) => {
  // ... (Upar ka comment save aur Notification.save() ka code as it is)

  // 🔥 CREATE COMMENT NOTIFICATION 🔥
  if (post.userEmail && post.userEmail !== commenterEmail) {
    const notifyText = req.body.text ? `commented: "${req.body.text}"` : `sent an image comment`;
    
    const newNotif = new Notification({
      // ... (MongoDB save wala code)
    });
    await newNotif.save();

    // 🚀🚀 YAHAN PUSH NOTIFICATION BHEJO 🚀🚀
    await sendPushNotification(
      post.userEmail, 
      "New Comment 💬", 
      `@${commenterName} ${notifyText}`, 
      post._id.toString()
    );
  }

  res.json({ success: true, comments: post.comments });
  // ...
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
// ✅ NAYA WALA (Isse replace karo)
router.get("/saved", async (req, res) => {
  const { email } = req.query;
  try {
    // Ye query Smart Deck aur Single words dono dhoond legi
    const posts = await EnglishPost.find({
      $or: [
        { "vocabData.wordStats.email": email },
        { "userStats.email": email }
      ]
    });

    console.log(`✅ Vault Sync: ${posts.length} posts retrieved for ${email}`);
    res.status(200).json(posts);
  } catch (err) {
    console.error("🚨 Vault Fetch Error:", err);
    res.status(500).json({ message: "Error fetching saved words", error: err.message });
  }
});
// ✅ DELETE COMMENT
// ✅ DELETE COMMENT (Fixed & Bulletproof)
router.delete("/comment/:postId/:commentId", async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    // 1. Post dhundo
    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // 2. 🔥 THE FIX: pull() method use karo
    // Ye MongoDB ke $pull operator ko use karke array se item saaf kar deta hai
    const initialLength = post.comments.length;
    post.comments.pull({ _id: commentId });

    // Check karo agar delete hua bhi ya nahi
    if (post.comments.length === initialLength) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // 3. Save changes
    await post.save();

    console.log(`🗑️ Comment ${commentId} removed successfully!`);

    res.json({ 
      success: true, 
      message: "Comment deleted", 
      comments: post.comments // Updated list bhejo taaki frontend refresh ho jaye
    });

  } catch (err) {
    console.error("🚨 Delete Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
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

// ✅ SAVE / UNSAVE TOGGLE (Separate Logic)
router.post("/save/:postId", async (req, res) => {
  const { postId } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!post.savedBy) { post.savedBy = []; }

    const isSaved = post.savedBy.includes(email);
    if (isSaved) {
      post.savedBy = post.savedBy.filter((e) => e !== email);
    } else {
      post.savedBy.push(email);
    }

    post.markModified('savedBy');
    await post.save();
    res.status(200).json({ isSaved: !isSaved });
  } catch (err) {
    res.status(500).json({ message: "Internal Error", error: err.message });
  }
});

// ✅ GET ONLY SAVED POSTS (For Vault & Profile Page)
router.get("/saved-posts", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email required" });
  try {
    const savedPosts = await EnglishPost.find({
      savedBy: { $in: [email] }
    }).sort({ createdAt: -1 });
    res.status(200).json(savedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/auto-translate", async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ success: false, message: "Text missing!" });

    // English to Hindi translate
    const result = await translate(text, { to: 'hi' });

    res.json({
      success: true,
      original: text,
      translated: result.text
    });
  } catch (error) {
    console.error("Translation Error:", error);
    res.status(500).json({ success: false, message: "Translation failed" });
  }
});

// ==========================================
// 📄 GET ALL POSTS
// ==========================================
router.get("/all", async (req, res) => {
  try {
    const posts = await EnglishPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// routes/englishPostRoutes.js mein add karo

// ==========================================
// 🔊 GET HINDI PRONUNCIATION (Sound Hint)
// ==========================================
const axios = require("axios"); // Axios install kar lena: npm install axios

// ==========================================
// 🔊 GET HINDI PRONUNCIATION (English to Hindi Script)
// ==========================================
router.get("/get-pronunciation", async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ success: false, message: "Text missing" });

    // 🔥 Google Input Tools API for Transliteration (Ye 'Run' ko 'रन' banayega)
    const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=1`;
    
    const response = await axios.get(googleUrl);
    
    if (response.data[0] === "SUCCESS") {
      // Data format: ["SUCCESS", [["word", ["hindi_word"]]]]
      const pronunciation = response.data[1][0][1][0];
      
      res.json({
        success: true,
        pronunciation: pronunciation
      });
    } else {
      res.status(500).json({ success: false, message: "Transliteration failed" });
    }
  } catch (error) {
    console.error("Pronunciation Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ SEARCH LIVE: Smart Deck Friendly logic
router.get("/search-live", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query missing" });

    const searchWord = q.trim();
    console.log("🔍 Fast Searching for:", searchWord);

    /**
     * 1. PARALLEL EXECUTION (Database + Dictionary API + Quick Translation)
     * Hum teeno kaam ek saath (Parallel) kar rahe hain taaki speed max rahe.
     * Hum sirf 'searchWord' ko translate kar rahe hain jo ki bohot fast hota hai.
     */
    const [filteredPosts, dictApiRes, quickTrans] = await Promise.all([
      // MongoDB Search (Limit 20 for speed)
      EnglishPost.find({
        $or: [
          { word: { $regex: searchWord, $options: "i" } },
          { "vocabData.word": { $regex: searchWord, $options: "i" } }
        ]
      }).sort({ createdAt: -1 }).limit(20).lean(),

      // External Dictionary API
      axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`).catch(() => null),

      // Quick Hindi Meaning (Sirf word ka, definition ka nahi)
      translate(searchWord, { to: 'hi' }).catch(() => ({ text: "" }))
    ]);

    // Default Object setup
    let dictData = {
      grammarType: "Vocabulary",
      detailedDefinition: "Definition available in community posts.",
      examples: []
    };

    // 2. Dictionary Data Parsing (If API responded)
    if (dictApiRes && dictApiRes.data?.[0]) {
      const firstEntry = dictApiRes.data[0];
      
      if (firstEntry.meanings?.[0]) {
        dictData.grammarType = firstEntry.meanings[0].partOfSpeech || "Vocabulary";
        
        const firstDef = firstEntry.meanings[0].definitions?.[0];
        if (firstDef) {
          dictData.detailedDefinition = firstDef.definition;
          if (firstDef.example) {
            dictData.examples = [firstDef.example];
          }
        }
      }
    }

    /**
     * 3. FINAL RESPONSE
     * 'meaning' mein Hindi word chala gaya (e.g. कुत्ता)
     * 'definition' abhi bhi English mein hai (Frontend button se translate karega)
     */
    res.json({
      success: true,
      word: searchWord,
      meaning: quickTrans.text, // Ye Screenshot wale style ke niche turant dikhega
      grammar: dictData.grammarType,
      definition: dictData.detailedDefinition,
      exampleSentences: dictData.examples,
      relatedPosts: filteredPosts // Smart Deck words included
    });

  } catch (err) {
    console.error("🚨 Server Error:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;