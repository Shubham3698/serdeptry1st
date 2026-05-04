const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  userEmail: { type: String, required: true },
  
  // 📸 Multi-Media Array (Images, Videos, YouTube Embeds)
  media: [{
    type: { 
      type: String, 
      enum: ["image", "video", "embed"], 
      required: true 
    },
    url: { type: String, required: true }
  }],

  image: { type: String }, 

  // 🗳️ Votes setup
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },

  // 📥 NEW: Saved Posts setup (User Emails store honge)
  // Isse tera "My Saved Vault" feature chalega
  savedBy: { type: [String], default: [] },

  // 📊 Command Level Numbers
  commandStats: {
    easy: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    heard: { type: Number, default: 0 },
    dailyUse: { type: Number, default: 0 }
  },

  // 🔥 Tracking specific user choices (SRS Practice Logic)
  userStats: [{
    email: { type: String },
    level: { 
      type: String, 
      enum: ["easy", "hard", "heard", "dailyUse"] 
    },
    // ✅ Practice mode ke liye anivarya field
    nextReview: { type: Date, default: null } 
  }],

  // 🏷️ Badge Logic
  badgeName: { 
    type: String, 
    enum: ["Easy", "Normal", "Professional", "Trending", "Popular"], 
    default: "Normal" 
  },

  // 💬 Comment System
  comments: [{
    name: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EnglishPost", EnglishPostSchema);