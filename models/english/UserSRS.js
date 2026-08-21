const mongoose = require('mongoose');

const userSRSSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  word: { type: String, required: true }, // Hum specific word track karenge
  nextReviewDate: { type: Date, default: Date.now },
  interval: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('UserSRS', userSRSSchema);