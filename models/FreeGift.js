const mongoose = require("mongoose");

const freeGiftSchema = new mongoose.Schema({
  title: String,
  description: String,
  src: String, // Cloudinary URL
  price: { type: Number, default: 0 },
  threshold: { type: Number, default: 299 }, // 🔥 Nayi field add ki
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FreeGift", freeGiftSchema);