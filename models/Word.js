const mongoose = require("mongoose");

const VocabSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Speed optimization ke liye
    },
    word: {
      type: String,
      required: true,
      trim: true,
    },
    meaning: {
      type: String,
      required: true,
    },
    sentences: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // Isse createdAt automatic mil jayega history sorting ke liye
);

module.exports = mongoose.model("Vocab", VocabSchema);