const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");

console.log("✅ customerOrderRoutes loaded with Address Support");

// ===================
// CREATE ORDER (Updated with Address)
// ===================
router.post("/create", async (req, res) => {
  try {
    // Destructuring address along with other fields
    const { 
      userName, 
      userEmail, 
      address, // 🔥 Coming from your AddressModal
      products, 
      subtotal, 
      discount, 
      total, 
      message 
    } = req.body;

    // Validation
    if (!userName || !userEmail) {
      return res.status(400).json({ success: false, message: "Name and Email are required" });
    }

    if (!address || !address.phone || !address.pincode) {
      return res.status(400).json({ success: false, message: "Full Address and Phone are required" });
    }

    // Generate shortOrderId: first 3 letters of userName + timestamp (Existing logic)
    const shortOrderId = userName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-5);

    const order = new CustomerOrder({
      userName,
      userEmail,
      address, // ✅ Saving the address object in DB
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
// GET ALL ORDERS (Existing)
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
// GET ORDER BY ID (Existing)
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
// GET ORDERS BY USER EMAIL (Existing)
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
// PATCH ORDER STATUS (Existing)
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