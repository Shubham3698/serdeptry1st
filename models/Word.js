const mongoose = require("mongoose");

// 🔥 Chat ke messages ka chhota schema
const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  text: { type: String, required: true }
}, { _id: false }); // _id false kiya taaki faltu ids generate na hon array items pe

const VocabSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  word: { type: String, required: true, trim: true },
  partOfSpeech: { type: String, required: true },
  meaning: { type: String, required: true },
  explanation: { type: String, required: true }, 
  synonyms: { type: String, required: true },   
  antonyms: { type: String, required: true },   
  sentences: { type: String, required: true },
  imageUrl: { type: String, default: "" }, // Purana field
  imageUrls: { type: [String], default: [] }, // Multiple Images ke liye
  chatHistory: { type: [ChatMessageSchema], default: [] }, // 🔥 NAYA FIELD: Follow-up chat store karne ke liye
  tags: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Vocab", VocabSchema);