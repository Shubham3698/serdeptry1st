const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  // 🔥 New Address Field Added
  address: {
    fullName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  products: [{ title: String, price: Number, quantity: Number, image: String }],
  subtotal: Number,
  discount: Number,
  total: Number,
  message: String,
  orderStatus: { type: String, default: "Pending" },
  shortOrderId: { type: String, unique: true }, 
}, { timestamps: true });

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);