const mongoose = require("mongoose");

const PersonalVaultSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  customCategories: { 
    type: [String], 
    default: ["hard", "dailyUse", "heard", "easy"] 
  },
  // 🔥 Har word ki apni copy taaki tu Hub se alag move kar sake
  vaultItems: [{
    wordId: { type: String, required: true }, 
    parentPostId: { type: String },
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    category: { type: String, default: "hard" },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("PersonalVault", PersonalVaultSchema);