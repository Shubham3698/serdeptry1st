const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  message: { type: String, required: true }, // WhatsApp message string
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);