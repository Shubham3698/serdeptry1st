const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true }, // Jisko notification jayegi (Post ka owner)
  senderEmail: { type: String, required: true },    // Jisne Like/Comment kiya
  senderName: { type: String, default: "User" },    // Like/Comment karne wale ka naam
// Purani line: enum: ['LIKE', 'COMMENT', 'NEW_POST']
type: { type: String, enum: ['LIKE', 'COMMENT', 'NEW_POST', 'CHAT'], required: true },
  postId: { type: String, required: true },         // Kis post par hua
  word: { type: String },                           // Kis word par hua
  message: { type: String },                        // Notification ka text
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);