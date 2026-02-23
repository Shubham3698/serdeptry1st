const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  src: { type: String, required: true }, // Product image link
});

const orderSchema = new mongoose.Schema({
  products: [productSchema], // Array of products
  subtotal: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  message: { type: String }, // WhatsApp message
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);