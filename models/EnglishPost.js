const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  // 🔥 SMART DECK ARCHITECTURE (Targeting Individual Words)
  vocabData: [{
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    
    // 📝 Individual Word Sentence (Example Usage)
    sentence: { type: String, default: "" }, 
    
    // 📸 Har word ki apni individual images/videos
    media: [{
      type: { 
        type: String, 
        enum: ["image", "video", "embed"], 
        required: true 
      },
      url: { type: String, required: true }
    }],

    // ⭐ TARGET: Individual Word Voting
    votedBy: { type: [String], default: [] }, 
    voteCount: { type: Number, default: 0 },

    // 📊 TARGET: Individual Word SRS Stats (Easy, Hard, Heard, Daily)
    wordStats: [{
      email: { type: String },
      level: { 
        type: String, 
        enum: ["easy", "hard", "heard", "dailyUse"] 
      },
      nextReview: { type: Date, default: null } 
    }],

    // 📈 Global numbers for this specific word
    commandStats: {
      easy: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      heard: { type: Number, default: 0 },
      dailyUse: { type: Number, default: 0 }
    }
  }],

  // ✅ BACKWARD COMPATIBILITY (Global fields for search and legacy logic)
  word: { type: String }, 
  meaning: { type: String },
  sentence: { type: String, default: "" }, // Global backup for search
  userEmail: { type: String, required: true },
  
  // Legacy media support
  media: [{
    type: { type: String, enum: ["image", "video", "embed"] },
    url: { type: String }
  }],
  image: { type: String }, 

  // Global Post Actions
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },
  savedBy: { type: [String], default: [] },

  // Global Post Stats
  commandStats: {
    easy: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    heard: { type: Number, default: 0 },
    dailyUse: { type: Number, default: 0 }
  },

  userStats: [{
    email: { type: String },
    level: { type: String, enum: ["easy", "hard", "heard", "dailyUse"] },
    nextReview: { type: Date, default: null } 
  }],

  badgeName: { 
    type: String, 
    enum: ["Easy", "Normal", "Professional", "Trending", "Popular"], 
    default: "Normal" 
  },

  comments: [{
    email: { type: String },
    name: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
});

// ======================================================
// 🔥 THE MASTER SYNC: Pre-Save Middleware (FIXED)
// ======================================================
// Note: next() hata diya hai kyunki async function return self-resolve karta hai
EnglishPostSchema.pre('save', async function() {
  try {
    if (this.vocabData && this.vocabData.length > 0) {
      const firstCard = this.vocabData[0];

      // 1. Deck ke pehle card ko main fields mein copy karo taaki Search na tute
      this.word = firstCard.word;
      this.meaning = firstCard.meaning;
      this.sentence = firstCard.sentence || ""; 
      
      // 2. Deck ki pehli image ko global cover photo bana do
      if (firstCard.media && firstCard.media.length > 0) {
        this.image = firstCard.media[0].url;
      }
    }
  } catch (err) {
    console.error("🚨 Error in Mongoose Pre-Save Sync:", err);
    throw err; // Error throw karne se Mongoose save operation cancel kar dega
  }
});

module.exports = mongoose.model("EnglishPost", EnglishPostSchema);