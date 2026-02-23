// models/order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: { type: Array, required: true },
  subtotal: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  total: { type: Number, required: true },
  customerName: { type: String, default: 'Anonymous' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);