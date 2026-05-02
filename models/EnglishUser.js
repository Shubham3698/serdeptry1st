const mongoose = require("mongoose");

const EnglishUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, required: true },
  // Default origin "english-community" rahega
  appOrigin: { type: String, default: "english-community" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EnglishUser", EnglishUserSchema);