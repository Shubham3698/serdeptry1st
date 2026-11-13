const express = require("express");
const router = express.Router();
const CustomerOrder = require("../models/CustomerOrder");
const crypto = require("crypto");

console.log("✅ customerOrderRoutes: Active (Optimized for Frontend-Generated IDs)");

// ============================================================
// 1. CREATE & VERIFY ORDER (Ab Frontend wali ID hi save hogi)
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
      shortOrderId, // 🔥 Frontend se aayi hui ID
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod, // 🔥 Frontend se ye nayi field aayegi
      paymentStatus // 🔥 Nayi field frontend se aa sakti hai
    } = req.body;

    // A. Validation
    if (!userName || !userEmail || !shortOrderId) {
      return res.status(400).json({ success: false, message: "Missing required order data" });
    }

    // 🔥 NEW LOGIC: Agar Order ka total 0 hai, ya payment status "Free Reward" / "Game Reward..." hai,
    // Toh usko direct bina kisi Razorpay verification ke save kardo.
    if (total === 0 || paymentStatus === "Free Reward" || (paymentStatus && paymentStatus.includes("Game Reward"))) {
      const order = new CustomerOrder({
        userName,
        userEmail,
        address, 
        products,
        subtotal,
        discount: discount || 0,
        total: 0,
        message,
        shortOrderId,
        paymentStatus: paymentStatus || "Free Reward", 
        orderStatus: "Received",
      });

      await order.save();
      return res.status(201).json({
        success: true,
        message: "Free Reward Order Created Successfully",
        data: order,
      });
    }

    // 🔥 LOGIC: Agar Payment Method "Link Share" hai toh verification skip karo
    if (paymentMethod === "Link Share") {
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
        paymentStatus: "Unpaid", // Link share par status Unpaid rahega
        orderStatus: "Received",
        razorpayOrderId: razorpay_order_id || ""
      });

      await order.save();
      return res.status(201).json({
        success: true,
        message: "Link Order Created (Unpaid)",
        data: order,
      });
    }

    // B. Signature Verification (Sirf Normal Direct Pay ke liye)
    if (!razorpay_payment_id) {
        return res.status(400).json({ success: false, message: "Missing payment ID" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed!" });
    }

    // C. Database mein Save karo (Normal Paid order)
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
      orderStatus: "Received",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      data: order,
    });

  } catch (err) {
    console.error("POST /create error:", err.message);
    res.status(500).json({ success: false, message: "Server error during order finalization" });
  }
});

// ==========================================
// 2. CANCEL ORDER REQUEST 
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
// 3. ADMIN & USER FETCH 
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
    const orders = await CustomerOrder.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. PATCH ORDER STATUS 
// ==========================================
router.patch("/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await CustomerOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const validStatuses = ["Pending","Received","Processing","Shipped","Delivered","Cancelled"];
    if (orderStatus && validStatuses.includes(orderStatus)) {
      order.orderStatus = orderStatus;
      await order.save();
      return res.json({ success: true, message: "Status updated", data: order });
    }
    res.status(400).json({ success: false, message: "Invalid status" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;