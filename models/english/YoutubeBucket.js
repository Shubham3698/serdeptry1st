const mongoose = require('mongoose');

const youtubeBucketSchema = new mongoose.Schema({
  word: { 
    type: String, 
    required: true,
    trim: true 
  },
  context: { 
    type: String, 
    required: true 
  },
  videoUrl: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Number, 
    required: true // Video mein word kis second par bola gaya tha
  },
  userEmail: { 
    type: String 
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('YoutubeBucket', youtubeBucketSchema, 'ytbucket');