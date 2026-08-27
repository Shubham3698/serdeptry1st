// models/MyBucket.js
const mongoose = require('mongoose');

const myBucketSchema = new mongoose.Schema({
  word: { 
    type: String, 
    required: true,
    trim: true 
  },
  context: { 
    type: String, 
    required: true 
  },
  source: { 
    type: String, 
    default: "Movie Script" 
  },
  userEmail: { 
    type: String // Optional: Agar aage user-specific words filter karne ho
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Using 'mybucket' as the exact collection name
module.exports = mongoose.model('MyBucket', myBucketSchema, 'mybucket');