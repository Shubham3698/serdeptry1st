const mongoose = require('mongoose');

const squadMessageSchema = new mongoose.Schema({
  squadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
  senderEmail: { type: String, required: true },
  type: { type: String, enum: ['text', 'post'], default: 'text' }, 
  text: { type: String }, 
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'EnglishPost' },
  
  // Unread Messages Badge ke liye
  readBy: [{ type: String }], 
  
  // 🔥 YEH 3 NAYE FIELDS ADD KIYE HAIN - WhatsApp Style Reply ke liye 🔥
  replyToId: { type: String, default: null },
  replyToText: { type: String, default: null },
  replyToUser: { type: String, default: null },
  
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SquadMessage', squadMessageSchema);