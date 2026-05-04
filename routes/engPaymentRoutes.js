const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const EnglishUser = require("../models/EnglishUser"); 

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, 
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// 1. CREATE SUBSCRIPTION ORDER
// ==========================================
router.post("/create-subscription-order", async (req, res) => {
  try {
    const { amount, planId, email } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ success: false, message: "Details missing" });
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `sub_rcpt_${Date.now()}`,
      notes: { 
        userEmail: email, 
        planId: planId 
      },
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Order Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. VERIFY SUBSCRIPTION PAYMENT (Manual Backup)
// ==========================================
router.post("/verify-subscription", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, planId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      let expiry = new Date();
      if(planId === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
      else if(planId === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1);
      else if(planId === 'trial') expiry.setHours(expiry.getHours() + 24);

      await EnglishUser.findOneAndUpdate(
        { email: email },
        { isPremium: true, planType: planId, premiumExpiry: expiry }
      );

      return res.status(200).json({ success: true, message: "Subscription Activated!" });
    } else {
      return res.status(400).json({ success: false, message: "Tampered Request" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

// ==========================================
// 3. SUBSCRIPTION WEBHOOK (Separate Route)
// ==========================================
router.post("/eng-webhook", async (req, res) => {
  // ⚠️ Ensure DAMEETO_WEBHOOK_SECRET is in your .env or replace it here
  const secret = process.env.DAMEETO_WEBHOOK_SECRET || "DAMEETO_WEBHOOK_SECRET"; 
  const signature = req.headers["x-razorpay-signature"];

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (signature === digest) {
    const event = req.body.event;

    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      
      const userEmail = paymentEntity.notes.userEmail;
      const planId = paymentEntity.notes.planId;

      console.log(`⭐ Processing English Hub Webhook for: ${userEmail}`);

      try {
        if (userEmail && planId) {
          let expiry = new Date();
          
          if (planId === 'monthly') {
            expiry.setMonth(expiry.getMonth() + 1);
          } else if (planId === 'yearly') {
            expiry.setFullYear(expiry.getFullYear() + 1);
          } else if (planId === 'trial') {
            expiry.setHours(expiry.getHours() + 24);
          }

          await EnglishUser.findOneAndUpdate(
            { email: userEmail },
            { 
              isPremium: true, 
              planType: planId, 
              premiumExpiry: expiry 
            }
          );
          console.log(`✅ ${userEmail} upgraded successfully via Webhook!`);
        }
      } catch (dbErr) {
        console.error("❌ Webhook DB Error:", dbErr.message);
      }
    }
    res.status(200).json({ status: "ok" });
  } else {
    res.status(400).send("Invalid Signature");
  }
});

module.exports = router;    