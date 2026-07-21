const mongoose = require('mongoose');

const squadMessageSchema = new mongoose.Schema({
  squadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
  senderEmail: { type: String, required: true },
  type: { type: String, enum: ['text', 'post'], default: 'text' }, 
  text: { type: String }, 
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'EnglishPost' }, // 'EnglishPost' ko apne actual post model name se replace kar dena agar alag ho
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SquadMessage', squadMessageSchema);