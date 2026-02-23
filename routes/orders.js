// routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create a new order
router.post('/create', async (req, res) => {
  try {
    const { items, subtotal, discountPercent, total, customerName } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const order = new Order({
      items,
      subtotal,
      discountPercent,
      total,
      customerName: customerName || 'Anonymous',
      createdAt: new Date(),
    });

    await order.save();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (optional)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;