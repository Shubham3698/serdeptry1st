const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  userEmail: { type: String, required: true },
  
  // 📸 NEW: Multi-Media Array (Replaces single image)
  // Each object stores the type (image/video/embed) and the specific URL
  media: [{
    type: { 
      type: String, 
      enum: ["image", "video", "embed"], 
      required: true 
    },
    url: { type: String, required: true }
  }],

  // Fallback for older posts (Optional: keeping it prevent breakages)
  image: { type: String }, 

  // 🗳️ Votes setup
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },

  // 📊 Command Level Numbers
  commandStats: {
    easy: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    heard: { type: Number, default: 0 },
    dailyUse: { type: Number, default: 0 }
  },

  // 🔥 Tracking specific user choices
  userStats: [{
    email: { type: String },
    level: { 
      type: String, 
      enum: ["easy", "hard", "heard", "dailyUse"] 
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