const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  image: { type: String, required: true },
  userEmail: { type: String, required: true },
  
  // 🗳️ Votes setup (Instagram Style Like System)
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },

  // 📊 Command Level Numbers (4 Updated Options)
  commandStats: {
    easy: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    heard: { type: Number, default: 0 },
    dailyUse: { type: Number, default: 0 }
  },

  // 🔥 Tracking specific user choices (Radio Logic)
  userStats: [{
    email: { type: String },
    level: { 
      type: String, 
      enum: ["easy", "hard", "heard", "dailyUse"] // 4 Options Match
    }
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