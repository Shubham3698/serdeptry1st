const express = require("express");
const axios = require("axios");
const router = express.Router();

const PincodeCheck = require("../models/PincodeCheck");

router.post("/check-pincode", async (req, res) => {
  const { pincode } = req.body;

  if (!pincode) {
    return res.status(400).json({ success: false, message: "Pincode required" });
  }

  try {
    // 🔥 DB Cache Check (optional but powerful)
    const existing = await PincodeCheck.findOne({ pincode });

    if (existing) {
      return res.json({
        success: true,
        delivery: existing.isDeliverable,
        source: "cache",
      });
    }

    // 🔥 Delhivery API Call
    const response = await axios.get(
      `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`,
      {
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
        },
      }
    );

    const data = response.data;

    const isDeliverable =
      data.delivery_codes && data.delivery_codes.length > 0;

    // 💾 Save in DB
    await PincodeCheck.create({
      pincode,
      isDeliverable,
    });

    res.json({
      success: true,
      delivery: isDeliverable,
      source: "api",
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      delivery: false,
    });
  }
});

module.exports = router;