const express = require("express");
const router = express.Router();
const EnglishPost = require("../models/EnglishPost");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const translate = require('google-translate-api-next');

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

// ✅ 1. CREATE SMART DECK POST (Multi-Word + Multi-Media Mapping)
router.post("/create", upload.array("images", 20), async (req, res) => {
  try {
    const { userEmail, vocabData, mediaMetadata, badgeName } = req.body;
    
    const parsedVocab = vocabData ? JSON.parse(vocabData) : [];
    const metadata = mediaMetadata ? JSON.parse(mediaMetadata) : [];
    const files = req.files || [];

    if (parsedVocab.length === 0) {
      return res.status(400).json({ success: false, message: "Bhai, kam se kam ek word toh dalo!" });
    }

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
        word: vocab.word,
        meaning: vocab.meaning,
        sentence: vocab.sentence || "", // 🔥 NEW: Added sentence field
        media: wordMedia
      };
    });

    const newPost = new EnglishPost({
      vocabData: finalVocabData,
      userEmail,
      badgeName: badgeName || "Normal",
    });

    await newPost.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Smart Deck Created! 🚀", 
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
    const { vocabData, mediaMetadata } = req.body;
    
    const existingPost = await EnglishPost.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const parsedVocab = vocabData ? JSON.parse(vocabData) : [];
    const metadata = mediaMetadata ? JSON.parse(mediaMetadata) : [];
    const files = req.files || [];

    let fileIndex = 0;

    const finalVocabData = parsedVocab.map((vocab, vIdx) => {
      let wordMedia = [];
      const currentWordMeta = metadata.filter(m => m.vocabIndex === vIdx);

      currentWordMeta.forEach((meta) => {
        if (meta.mode === "file") {
          if (files[fileIndex]) {
            wordMedia.push({ type: meta.type, url: files[fileIndex].path });
            fileIndex++;
          } else if (meta.url) {
            wordMedia.push({ type: meta.type, url: meta.url });
          }
        } else if (meta.url) {
          wordMedia.push({ type: meta.type, url: meta.url });
        }
      });

      return {
        word: vocab.word,
        meaning: vocab.meaning,
        sentence: vocab.sentence || "", // 🔥 NEW: Added sentence field
        media: wordMedia
      };
    });

    // Object modify karke save karna taaki pre-save middleware chale
    existingPost.vocabData = finalVocabData;
    if (req.body.badgeName) existingPost.badgeName = req.body.badgeName;

    const updatedPost = await existingPost.save();

    res.json({ 
      success: true, 
      message: "Smart Deck Updated Successfully! ✅",
      data: updatedPost 
    });

  } catch (err) {
    console.error("🚨 Update Deck Error:", err);
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



router.post("/vote-word/:postId/:wordId", async (req, res) => {
  try {
    const { postId, wordId } = req.params;
    const { email } = req.body;

    const post = await EnglishPost.findById(postId);
    const wordEntry = post.vocabData.id(wordId);

    if (!wordEntry) return res.status(404).json({ message: "Word missing" });

    const voteIndex = wordEntry.votedBy.indexOf(email);
    if (voteIndex > -1) {
      wordEntry.votedBy.splice(voteIndex, 1);
    } else {
      wordEntry.votedBy.push(email);
    }
    wordEntry.voteCount = wordEntry.votedBy.length;

    post.markModified('vocabData');
    await post.save();
    res.json({ success: true, voteCount: wordEntry.voteCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
router.post("/update-word-stat/:postId/:wordId", async (req, res) => {
  try {
    const { postId, wordId } = req.params;
    const { level, email, nextReview } = req.body;

    // 1. Poora post dhundo
    const post = await EnglishPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // 2. Deck (vocabData) ke andar wo specific word dhundo
    const wordEntry = post.vocabData.id(wordId);
    
    // Fallback: Agar purana post hai jisme vocabData nahi hai, toh logic handle karo
    if (!wordEntry) {
       return res.status(404).json({ success: false, message: "Word not found in deck" });
    }

    const existingIdx = wordEntry.wordStats.findIndex(u => u.email === email);
    const reviewDate = nextReview ? new Date(nextReview) : null;

    if (existingIdx !== -1) {
      const oldLevel = wordEntry.wordStats[existingIdx].level;
      
      // 🔥 Toggle Logic: Agar wahi button dobara dabaya toh hata do
      if (oldLevel === level && nextReview === undefined) {
        wordEntry.commandStats[level] = Math.max(0, (wordEntry.commandStats[level] || 0) - 1);
        wordEntry.wordStats.splice(existingIdx, 1);
      } else {
        // Update Level
        wordEntry.commandStats[oldLevel] = Math.max(0, (wordEntry.commandStats[oldLevel] || 0) - 1);
        wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
        wordEntry.wordStats[existingIdx].level = level;
        wordEntry.wordStats[existingIdx].nextReview = reviewDate;
      }
    } else {
      // New Stat Entry
      wordEntry.commandStats[level] = (wordEntry.commandStats[level] || 0) + 1;
      wordEntry.wordStats.push({ email, level, nextReview: reviewDate });
    }

    // 🔥 Important: Mongoose ko batao ki nested data modify hua hai
    post.markModified('vocabData');
    await post.save();

    res.json({ success: true, commandStats: wordEntry.commandStats });
  } catch (err) {
    console.error("🚨 Stat Update Error:", err);
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
    if (!q) return res.status(400).json({ success: false });

    const searchWord = q.trim();
    console.log("🔍 Deep Searching for:", searchWord);

    // 1. Database Search (Main Word OR Smart Deck Word)
    const filteredPosts = await EnglishPost.find({
      $or: [
        { word: { $regex: searchWord, $options: "i" } }, // Single Word system
        { "vocabData.word": { $regex: searchWord, $options: "i" } } // 🔥 Smart Deck Words!
      ]
    }).sort({ createdAt: -1 });

    // 2. Dictionary Info (Dictionary tab ke liye)
    // Hum Dictionary info tabhi nikalte hain jab word exact match ho ya search word clean ho
    let dictData = {
        hindiMeaning: "Meaning not found",
        grammarType: "Vocabulary",
        detailedDefinition: "Definition available in community posts.",
        examples: []
    };

    try {
      // Hindi Meaning
      const translation = await translate(searchWord, { to: "hi" });
      dictData.hindiMeaning = translation.text;

      // Dictionary API
      const dictRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`);
      if (dictRes.data?.[0]) {
        const firstEntry = dictRes.data[0];
        dictData.grammarType = firstEntry.meanings[0].partOfSpeech; 
        dictData.detailedDefinition = firstEntry.meanings[0].definitions[0].definition;
        if (firstEntry.meanings[0].definitions[0].example) {
          dictData.examples = [firstEntry.meanings[0].definitions[0].example];
        }
      }
    } catch (e) { console.log("External APIs failed/No info found."); }

    res.json({
      success: true,
      word: searchWord,
      meaning: dictData.hindiMeaning,
      grammar: dictData.grammarType,
      definition: dictData.detailedDefinition,
      exampleSentences: dictData.examples,
      relatedPosts: filteredPosts // Ab isme Smart Decks bhi aayenge!
    });

  } catch (err) {
    console.error("🚨 Server Error:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;