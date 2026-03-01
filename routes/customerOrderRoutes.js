const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");

console.log("✅ customerOrderRoutes loaded");

// Helper: Generate short order ID
async function generateShortOrderId(userName) {
  const prefix = userName.trim().substring(0, 3).toUpperCase();
  const lastOrder = await CustomerOrder.find({ userName }).sort({ createdAt: -1 }).limit(1);
  const lastSerial = lastOrder.length > 0 ? parseInt(lastOrder[0].shortOrderId.split('-')[1]) : 0;
  const newSerial = (lastSerial + 1).toString().padStart(3, '0');
  return `${prefix}-${newSerial}`;
}

// ===================
// CREATE ORDER
// ===================
router.post("/create", async (req, res) => {
  try {
    const { userName, userEmail, products, subtotal, discount, total, message } = req.body;

    if (!userName || !userEmail) {
      return res.status(400).json({ success: false, message: "Name and Email are required" });
    }

    // Generate shortOrderId: first 3 letters of userName + timestamp
    const shortOrderId = userName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-5);

    const order = new CustomerOrder({
      userName,
      userEmail,
      products,
      subtotal,
      discount,
      total,
      message,
      shortOrderId,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      data: order,
    });
  } catch (err) {
    console.error("POST /create error:", err.message);
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

    if (!orderStatus)
      return res.status(400).json({ success: false, message: "orderStatus is required" });

    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const validStatuses = ["Pending","Received","Processing","Shipped","Delivered","Cancelled"];
    if (!validStatuses.includes(orderStatus))
      return res.status(400).json({ success: false, message: "Invalid status" });

    order.orderStatus = orderStatus;
    await order.save();

    res.json({ success: true, message: "Order status updated", data: order });
  } catch (err) {
    console.error("PATCH /:id error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;