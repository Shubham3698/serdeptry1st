const mongoose = require("mongoose");

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true },
  meaning: { type: String, required: true },
  grammar: { type: String, default: "Noun" }, // e.g., Verb, Adjective, Noun
  exampleSentences: [{ type: String }], // Array of 3-4 sentences
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Word", wordSchema);