const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");
const crypto = require("crypto");

console.log("✅ customerOrderRoutes: Active (Optimized for Payment-First flow)");

// ============================================================
// 1. CREATE & VERIFY ORDER (Ab order tabhi banega jab payment verified hogi)
// ============================================================
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
      message,
      // Razorpay data jo frontend ab saath mein bhej raha hai
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // A. Validation
    if (!userName || !userEmail || !address || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing required order or payment data" });
    }

    // B. Signature Verification (Security check pehle)
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed! Invalid signature." });
    }

    // C. Order ID Generate karo
    const shortOrderId = userName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-5);

    // D. Database mein Save karo (Directly as 'Paid' and 'Received')
    const order = new CustomerOrder({
      userName,
      userEmail,
      address, 
      products,
      subtotal,
      discount,
      total,
      message,
      shortOrderId,
      paymentStatus: "Paid", 
      orderStatus: "Received", // Kyunki paise mil gaye hain
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Verified and Created Successfully",
      data: order,
    });

  } catch (err) {
    console.error("POST /create error:", err.message);
    res.status(500).json({ success: false, message: "Server error during order finalization" });
  }
});

// ==========================================
// 2. CANCEL ORDER REQUEST (Purani logic intact)
// ==========================================
router.post("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Reason is required" });

    const order = await CustomerOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.cancelReason = reason; 
    await order.save();

    res.json({ success: true, message: "Cancellation request sent.", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. ADMIN & USER FETCH ROUTES (Saari purani cheezein safe hain)
// ==========================================
router.get("/", async (req, res) => {
  try {
    const orders = await CustomerOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await CustomerOrder.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. PATCH ORDER STATUS (Admin Panel)
// ==========================================
router.patch("/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;
    if (!orderStatus) return res.status(400).json({ success: false, message: "orderStatus is required" });

    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const validStatuses = ["Pending","Received","Processing","Shipped","Delivered","Cancelled"];
    if (!validStatuses.includes(orderStatus)) return res.status(400).json({ success: false, message: "Invalid status" });

    order.orderStatus = orderStatus;
    await order.save();

    res.json({ success: true, message: "Order status updated", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;