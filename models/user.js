const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  // 🔥 UPDATED: required: true hata diya taaki Google/Phone login crash na ho
  password: { 
    type: String, 
    required: false 
  },
  
  // 🔥 Firebase Integration (Intact)
  firebaseUid: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },

  // 🔥 Credits system (Intact)
  credits: { 
    type: Number, 
    default: 0 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Purane models ke saath conflict na ho isliye ye check zaroori hai
module.exports = mongoose.models.User || mongoose.model('user', userSchema);