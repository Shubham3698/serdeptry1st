const mongoose = require("mongoose");

const sentenceReviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  word: { type: String, required: true },
  hindiSentence: { type: String, required: true },
  englishSentence: { type: String, required: true },
  interval: { type: Number, default: 0 }, // Kitne din baad aayega
  easeFactor: { type: Number, default: 2.5 }, // Anki ka multiplier
  nextReviewDate: { type: Date, default: Date.now }, // Agli practice date
});

module.exports = mongoose.model("SentenceReview", sentenceReviewSchema);