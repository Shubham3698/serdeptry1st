const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema(
  {
    // 🔥 FIXED: Added userName field
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    products: [
      {
        title: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    subtotal: Number,
    discount: Number,
    total: Number,
    // 🔥 FIXED: Added message field
    message: {
      type: String,
    },
    orderStatus: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CustomerOrder",
  customerOrderSchema
);