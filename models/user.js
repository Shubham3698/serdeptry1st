const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  
  // 🔥 Firebase Integration ke liye
  firebaseUid: { type: String, unique: true, sparse: true },
  isVerified: { type: Boolean, default: false }, // Email verification status

  // 🔥 Credits system
  credits: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('user', userSchema);