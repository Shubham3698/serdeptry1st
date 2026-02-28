import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";

const router = express.Router();

/* 🔥 PLACE ORDER */
router.post("/orders", async (req, res) => {
  try {
    const { email, products, subtotal, discountPercent, finalTotal } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const orderItems = products.map((item) => ({
      product: item._id || null,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      image: item.src,
    }));

    const newOrder = await Order.create({
      user: user._id,
      items: orderItems,
      subtotal,
      discountPercent,
      totalAmount: finalTotal,
      status: "Pending",
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* 🔥 GET USER ORDERS */
router.get("/orders/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;