const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");

console.log("✅ customerOrderRoutes loaded with Address & Cancel Request Support");

// ===================
// CREATE ORDER (Address aur purana logic sab intact hai)
// ===================
router.post("/create", async (req, res) => {
  try {
    const { 
      userName, 
      userEmail, 
      address, 
      products, 
      subtotal, 
      discount, 
      total, 
      message 
    } = req.body;

    // Validation (Wahi purani wali)
    if (!userName || !userEmail) {
      return res.status(400).json({ success: false, message: "Name and Email are required" });
    }

    if (!address || !address.phone || !address.pincode) {
      return res.status(400).json({ success: false, message: "Full Address and Phone are required" });
    }

    const shortOrderId = userName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-5);

    const order = new CustomerOrder({
      userName,
      userEmail,
      address, // ✅ Address object database mein save hoga
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
// 🔥 NEW: CANCEL ORDER REQUEST (Sirf Reason Update Karega)
// ===================
router.post("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    const order = await CustomerOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // ✅ Yahan hum status "Cancelled" nahi kar rahe!
    // Hum sirf cancelReason save kar rahe hain taaki Admin dekh sake.
    order.cancelReason = reason; 
    await order.save();

    res.json({ 
      success: true, 
      message: "Cancellation request sent to Admin. Status remains unchanged until reviewed.", 
      data: order 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================
// GET ALL ORDERS (Purana logic)
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
// GET ORDER BY ID (Purana logic)
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
// GET ORDERS BY USER EMAIL (Purana logic)
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
// PATCH ORDER STATUS (Admin Panel ke liye)
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

    res.json({ success: true, message: "Order status updated successfully", data: order });
  } catch (err) {
    console.error("PATCH /:id error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;