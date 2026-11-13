const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  
  // ✅ Purana Address Field (Jaisa tha waise hi hai)
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
  
  // 🔥 Cancellation logic intact
  cancelReason: { type: String, default: "" }, 
  orderStatus: { type: String, default: "Pending" },
  shortOrderId: { type: String, unique: true }, 

  // ==========================================
  // 🚀 RAZORPAY NEW FIELDS (Adding Safely)
  // ==========================================
  paymentStatus: { 
    type: String, 
    // 🔥 YAHAN CHANGE KIYA HAI: Naye Reward wale status add kar diye
enum: ["Unpaid", "Paid", "Refunded", "Free Reward", "Game Reward (Paid via 1000 Coins)", "Game Reward (Paid via 200 Coins)"],
    default: "Unpaid" 
  },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  // ==========================================

}, { timestamps: true });

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);