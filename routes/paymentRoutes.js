const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const CustomerOrder = require("../models/CustomerOrder"); // 🔥 Import Model

// Razorpay instance initialization
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// 1. CREATE ORDER API
// Frontend se amount aayega, hum Razorpay Order ID generate karenge
// ==========================================
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Amount in paise (₹1 = 100 paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({ 
      success: true, 
      order 
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 🔥 2. CREATE PAYMENT LINK API (Added for Sharing)
// ==========================================
router.post("/create-link", async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ success: false, message: "Amount and OrderId are required" });
    }

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      accept_partial: false,
      description: `Payment for Order #${orderId}`,
      customer: {
        name: "Customer",
        email: "customer@example.com",
        contact: ""
      },
      notify: { sms: false, email: false },
      reminder_enable: true,
      notes: { short_order_id: orderId }, // 🔥 Notes mein ID save ki hai
      callback_url: "https://serdeptry1st.onrender.com/payment-success",
      callback_method: "get"
    });

    res.status(200).json({ 
      success: true, 
      short_url: paymentLink.short_url 
    });
  } catch (error) {
    console.error("Razorpay Create Link Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. VERIFY PAYMENT API (Basic Verification)
// Note: Isse sirf verification confirm hogi. 
// DB update karne ke liye humne customerOrderRoutes mein logic daal diya hai.
// ==========================================
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ 
        success: true, 
        message: "Payment Signature Verified Successfully" 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Signature! Payment could be tampered." 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification process failed" });
  }
});


// 🔥 3. WEBHOOK API (Automatic Order Confirmation)
router.post("/webhook", async (req, res) => {
  const secret = "DAMEETO_WEBHOOK_SECRET"; // Razorpay Dashboard mein wahi rakhein

  const signature = req.headers["x-razorpay-signature"];

  // Verification logic
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (signature === digest) {
    console.log("✅ Webhook Verified!");
    const event = req.body.event;

    // Jab payment success ho jaye
    if (event === "payment_link.paid" || event === "order.paid") {
      const payload = req.body.payload;
      const paymentEntity = payload.payment.entity;

      // Extract Order ID from notes (Link share ya direct order dono handle honge)
      const orderId = payload.payment_link ? 
                      payload.payment_link.entity.notes.short_order_id : 
                      paymentEntity.notes.short_order_id;

      const razorpayPaymentId = paymentEntity.id;

      console.log(`🚀 Payment Success for Order: ${orderId}`);
      
      try {
        // ✅ DB UPDATE LOGIC: "Unpaid" ko "Paid" karo
        if (orderId) {
          await CustomerOrder.findOneAndUpdate(
            { shortOrderId: orderId }, 
            { 
              paymentStatus: "Paid", 
              razorpayPaymentId: razorpayPaymentId 
            }
          );
          console.log(`✅ Order ${orderId} marked as PAID in Atlas!`);
        }
      } catch (dbErr) {
        console.error("❌ DB Update Error in Webhook:", dbErr.message);
      }
    }
    // Razorpay ko hamesha 200 response dena zaroori hai
    res.status(200).json({ status: "ok" });
  } else {
    console.error("❌ Invalid Webhook Signature");
    res.status(400).send("Invalid Signature");
  }
});

module.exports = router;