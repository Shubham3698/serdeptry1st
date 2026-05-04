const mongoose = require("mongoose");

const EnglishUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, required: true },
  appOrigin: { type: String, default: "english-community" },
  
  // 🔥 NEW PREMIUM FIELDS (Added without destroying old ones)
  isPremium: { type: Boolean, default: false },
  planType: { type: String, default: "free" }, // trial, monthly, yearly
  premiumExpiry: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EnglishUser", EnglishUserSchema);