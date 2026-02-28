const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema(
  {
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