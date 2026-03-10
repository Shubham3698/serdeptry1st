const mongoose = require("mongoose");

const userCreditSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  credits: { type: Number, default: 0 },
  history: [
    {
      accuracy: Number,
      time: Number,
      earnedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("UserCredit", userCreditSchema);