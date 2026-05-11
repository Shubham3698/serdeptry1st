const mongoose = require("mongoose");

const HiddenSignalSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  hiddenPostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EnglishPost' }],
}, { timestamps: true });

module.exports = mongoose.model("HiddenSignal", HiddenSignalSchema);