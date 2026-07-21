const mongoose = require('mongoose');

const squadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: String }], // Array of user emails
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Squad', squadSchema);