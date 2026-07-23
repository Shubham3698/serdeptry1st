const mongoose = require("mongoose");

const VocabSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  word: { type: String, required: true, trim: true },
  partOfSpeech: { type: String, required: true },
  meaning: { type: String, required: true },
  explanation: { type: String, required: true }, 
  synonyms: { type: String, required: true },   
  antonyms: { type: String, required: true },   
  sentences: { type: String, required: true },
  imageUrl: { type: String, default: "" }, // Purana field (waise hi rehne de taaki errors na aayein)
  imageUrls: { type: [String], default: [] } // 🔥 NAYA FIELD MULTIPLE IMAGES KE LIYE
}, { timestamps: true });

module.exports = mongoose.model("Vocab", VocabSchema);