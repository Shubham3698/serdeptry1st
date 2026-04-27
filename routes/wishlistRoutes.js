const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');

// ❤️ 1. Toggle Wishlist (Add/Remove)
router.post('/toggle', async (req, res) => {
  const { userId, productId, productData } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ success: false, message: "UserId and ProductId required" });
  }

  try {
    const existingItem = await Wishlist.findOne({ userId, productId });

    if (existingItem) {
      // Agar pehle se hai to Delete karo
      await Wishlist.deleteOne({ userId, productId });
      return res.json({ 
        success: true, 
        isWishlisted: false, // Frontend isi variable ko check kar raha hai
        message: "Removed from wishlist" 
      });
    } else {
      // Agar nahi hai to Save karo
      const newItem = new Wishlist({ userId, productId, productData });
      await newItem.save();
      return res.json({ 
        success: true, 
        isWishlisted: true, // Frontend isi variable ko check kar raha hai
        productData: productData,
        message: "Added to wishlist" 
      });
    }
  } catch (error) {
    console.error("Wishlist Toggle Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 2. Get User's Wishlist
router.get('/:userId', async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    // Frontend ko data array format mein chahiye
    res.json({ 
      success: true, 
      data: items.map(item => item.productData) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;