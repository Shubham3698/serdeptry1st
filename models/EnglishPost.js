const mongoose = require("mongoose");

const EnglishPostSchema = new mongoose.Schema({
  // 🔥 ULTIMATE DECK TITLE
  title: { type: String, trim: true, default: "New English Signal" },

  vocabData: [{
    // 🔥 INDIVIDUAL CARD TITLE / SUBJECT
    title: { type: String, trim: true, default: "" }, 
    word: { type: String, required: true, trim: true },
    meaning: { type: String, required: true, trim: true },
    sentence: { type: String, default: "" }, 
    media: [{
      type: { type: String, enum: ["image", "video", "embed"], required: true },
      url: { type: String, required: true }
    }],
    votedBy: { type: [String], default: [] },
    voteCount: { type: Number, default: 0 },
    commandStats: {
      easy: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      heard: { type: Number, default: 0 },
      dailyUse: { type: Number, default: 0 }
    },
    wordStats: [{
      email: { type: String, lowercase: true, trim: true },
      level: { type: String },
      nextReview: { type: Date, default: null } 
    }]
  }],

  votedBy: { type: [String], default: [], index: true }, 
  voteCount: { type: Number, default: 0 },
  savedBy: { type: [String], default: [], index: true },

  // Metadata Fields
  word: { type: String, index: true }, 
  meaning: { type: String },
  sentence: { type: String, default: "" }, 
  userEmail: { type: String, required: true, lowercase: true, trim: true },
  userName: { type: String, trim: true }, 
  image: { type: String }, 
  badgeName: { type: String, default: "Normal" },
  comments: [{
    email: { type: String, lowercase: true, trim: true },
    name: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// ==========================================
// 🔥 THE MASTER SYNC: Pre-Save
// ==========================================
EnglishPostSchema.pre('save', function() {
  if (this.vocabData && this.vocabData.length > 0) {
    const firstCard = this.vocabData[0];
    this.word = firstCard.word;
    this.meaning = firstCard.meaning;
    this.sentence = firstCard.sentence || "";
    if (firstCard.media?.[0]?.url) {
      this.image = firstCard.media[0].url;
    }

    const masterVoterSet = new Set();
    this.vocabData.forEach(card => {
      if (Array.isArray(card.votedBy)) {
        card.voteCount = card.votedBy.length; 
        card.votedBy.forEach(email => {
          if (email) masterVoterSet.add(email.toLowerCase().trim());
        });
      }
    });

    this.votedBy = Array.from(masterVoterSet);
    this.voteCount = this.votedBy.length; 
  }
  
  return Promise.resolve();
});

module.exports = mongoose.model("EnglishPost", EnglishPostSchema);