const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
  image: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EnglishPost", EnglishPostSchema);