const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  image: { type: String, required: true },
  userEmail: { type: String, required: true },
  
  // 🗳️ Votes setup
  votedBy: { type: [String], default: [] }, 
  voteCount: { type: Number, default: 0 },

  // 📊 Command Level
  commandStats: {
    neverHeard: { type: Number, default: 0 },
    heardButNotUsed: { type: Number, default: 0 },
    dailyUse: { type: Number, default: 0 }
  },
  badgeName: { 
  type: String, 
  enum: ["Easy", "Normal", "Professional", "Trending", "Popular"], 
  default: "Normal" 
},

  createdAt: { type: Date, default: Date.now },
});

// ✅ Model ko export karna sirf EK BAAR
module.exports = mongoose.model("EnglishPost", EnglishPostSchema);