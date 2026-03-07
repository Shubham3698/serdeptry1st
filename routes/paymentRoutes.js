const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

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
// 2. VERIFY PAYMENT API (Basic Verification)
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

module.exports = router;