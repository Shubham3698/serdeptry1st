// models/CustomerOrder.js
const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  products: [{ title: String, price: Number, quantity: Number, image: String }],
  subtotal: Number,
  discount: Number,
  total: Number,
  message: String,
  orderStatus: { type: String, default: "Pending" },
  shortOrderId: { type: String, unique: true }, // 🔥 ADD THIS
}, { timestamps: true });

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);