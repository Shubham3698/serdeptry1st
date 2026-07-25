const mongoose = require('mongoose');

const squadMessageSchema = new mongoose.Schema({
  squadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
  senderEmail: { type: String, required: true },
  type: { type: String, enum: ['text', 'post'], default: 'text' }, 
  text: { type: String }, 
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'EnglishPost' },
  
  // 🔥 YEH LINE ADD KI HAI - Unread Messages Badge ke liye
  readBy: [{ type: String }], 
  
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SquadMessage', squadMessageSchema);