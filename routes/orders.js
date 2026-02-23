const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// ===================================
// POST /orders → Save order
// ===================================
router.post('/', async (req, res) => {
  try {
    const { products, subtotal, discountPercent, finalTotal, message } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'Products are required' });
    }

    const order = new Order({
      products,
      subtotal,
      discountPercent,
      finalTotal,
      message,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Order saved successfully',
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===================================
// GET /orders → Fetch all orders (Admin panel)
// ===================================
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;