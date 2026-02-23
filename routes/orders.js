const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Make sure case matches the file

// POST /orders → Save WhatsApp message as order
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    const order = new Order({ message });
    await order.save();

    res.status(201).json({ message: 'Order saved successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;