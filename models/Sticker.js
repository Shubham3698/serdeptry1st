const mongoose = require("mongoose");

const stickerSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, default: "Dameeto Sticker" },
  category: { type: String, required: true, index: true }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sticker", stickerSchema);