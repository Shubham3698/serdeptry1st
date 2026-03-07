const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");
const crypto = require("crypto"); 

console.log("✅ customerOrderRoutes: Active with Address & Razorpay support");

// ==========================================
// 1. CREATE ORDER (Initial Step - Address Intact)
// ==========================================
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

    // Validation
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
      address, 
      products,
      subtotal,
      discount,
      total,
      message,
      shortOrderId,
      paymentStatus: "Unpaid", // Default
      orderStatus: "Pending"   // Default
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      data: order,
    });
  } catch (err) {
    console.error("POST /create error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create order on server" });
  }
});

// ==========================================
// 2. 🔥 VERIFY PAYMENT & CONFIRM ORDER
// ==========================================
router.post("/verify-and-confirm", async (req, res) => {
  const { shortOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Basic verification check for Secret Key
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ success: false, message: "Backend Secret Key not configured!" });
    }

    // 1. Signature Verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid Payment Signature" });
    }

    // 2. Database Update - Mark as Paid
    const updatedOrder = await CustomerOrder.findOneAndUpdate(
      { shortOrderId: shortOrderId },
      { 
        paymentStatus: "Paid", 
        razorpayPaymentId: razorpay_payment_id,
        orderStatus: "Received" // Automatic move to Received
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found for verification" });
    }

    res.json({ 
      success: true, 
      message: "Payment Verified & Order Confirmed", 
      data: updatedOrder 
    });
  } catch (err) {
    console.error("Verification Error:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error during verification" });
  }
});

// ==========================================
// 3. CANCEL ORDER REQUEST (Logic Intact)
// ==========================================
router.post("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    const order = await CustomerOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.cancelReason = reason; 
    await order.save();

    res.json({ 
      success: true, 
      message: "Cancellation request sent to Admin.", 
      data: order 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. ADMIN & USER FETCH ROUTES (Logic Intact)
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
// 5. PATCH ORDER STATUS (Logic Intact)
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

    res.json({ success: true, message: "Order status updated successfully", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;