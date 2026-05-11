const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  // 🆕 Master Title: Pure Deck ya post ki pehchan
  title: { 
    type: String, 
    trim: true,
    default: "" 
  },

  // 🔥 SMART DECK ARCHITECTURE
  vocabData: [{
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    title: { type: String, trim: true }, // Card level title backup
    sentence: { type: String, default: "" }, 
    media: [{
      type: { type: String, enum: ["image", "video", "embed"], required: true },
      url: { type: String, required: true }
    }],
    votedBy: { type: [String], default: [] }, 
    voteCount: { type: Number, default: 0 },
    wordStats: [{
      email: { type: String },
      level: { type: String, enum: ["easy", "hard", "heard", "dailyUse"] },
      nextReview: { type: Date, default: null } 
    }],
    commandStats: {
      easy: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      heard: { type: Number, default: 0 },
      dailyUse: { type: Number, default: 0 }
    }
  }],

  // ✅ BACKWARD COMPATIBILITY & SEARCH FIELDS
  word: { type: String }, 
  meaning: { type: String },
  sentence: { type: String, default: "" }, 
  userEmail: { type: String, required: true },
  userName: { type: String }, 
  media: [{
    type: { type: String, enum: ["image", "video", "embed"] },
    url: { type: String }
  }],
  image: { type: String }, 
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },
  savedBy: { type: [String], default: [] },
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
  }]
}, { 
  timestamps: true 
});

// 🔥 THE MASTER SYNC: Pre-Save Middleware
EnglishPostSchema.pre('save', async function() {
  try {
    if (this.vocabData && this.vocabData.length > 0) {
      const firstCard = this.vocabData[0];

      // 🎯 Fix: Agar title khali hai tabhi auto-generate karo
      // "New English Signal" ya empty string hone par hi word uthayega
      if (!this.title || this.title.trim() === "" || this.title === "New English Signal") {
        this.title = `Vocabulary: ${firstCard.word}`;
      }

      // Sync Main Search Fields
      this.word = firstCard.word;
      this.meaning = firstCard.meaning;
      this.sentence = firstCard.sentence || ""; 
      
      if (firstCard.media && firstCard.media.length > 0) {
        this.image = firstCard.media[0].url;
      }
    }
  } catch (err) {
    console.error("🚨 Mongoose Pre-Save Sync Error:", err);
    throw err;
  }
});

module.exports = mongoose.model("EnglishPost", EnglishPostSchema);