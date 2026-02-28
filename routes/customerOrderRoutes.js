const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");

console.log("✅ customerOrderRoutes loaded");

// ===================
// CREATE ORDER
// ===================
router.post("/create", async (req, res) => {
  try {
    const { userName, userEmail, products, subtotal, discount, total, message } = req.body;

    if (!userName || !userEmail) {
      return res.status(400).json({ success: false, message: "Name and Email are required" });
    }

    const order = new CustomerOrder({
      userName,
      userEmail,
      products,
      subtotal,
      discount,
      total,
      message,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      data: order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================
// GET ALL ORDERS
// ===================
router.get("/", async (req, res) => {
  try {
    const orders = await CustomerOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================
// GET ORDER BY ID
// ===================
router.get("/:id", async (req, res) => {
  try {
    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================
// GET ORDERS BY USER EMAIL
// ===================
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await CustomerOrder.find({ userEmail: email }).sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================
// PATCH ORDER STATUS
// ===================
router.patch("/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const validStatuses = ["Received", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(orderStatus))
      return res.status(400).json({ success: false, message: "Invalid status" });

    order.orderStatus = orderStatus;
    await order.save();

    res.json({ success: true, message: "Order status updated", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;