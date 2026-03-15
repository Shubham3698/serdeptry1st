const mongoose = require("mongoose");
const freeGiftSchema = new mongoose.Schema({
  title: String,
  description: String,
  src: String, // Cloudinary URL yahan save hoga
  price: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("FreeGift", freeGiftSchema);