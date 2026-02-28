const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    userName: { type: String, required: true }, // <-- Added

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

    orderStatus: {
      type: String,
      enum: ["Received", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Received",
    },

    message: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);