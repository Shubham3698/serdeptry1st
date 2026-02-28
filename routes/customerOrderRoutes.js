const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");
console.log("✅ customerOrderRoutes loaded");
// ===================
// CREATE ORDER
// ===================
router.post("/create", async (req, res) => {
  try {
    const order = new CustomerOrder(req.body);
    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ===================
// GET USER ORDERS
// ===================
router.get("/user/:email", async (req, res) => {
  try {
    const orders = await CustomerOrder.find({
      userEmail: req.params.email,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/debug", (req, res) => {
  res.json({ message: "Route is working ✅" });
});

module.exports = router;

