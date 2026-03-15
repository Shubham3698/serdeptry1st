const express = require("express");
const router = express.Router();
const FreeGift = require("../models/FreeGift"); // Model ensure kar lena
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary Config (Environment variables use karega jo pehle se set hain)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Gift images ke liye alag folder
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "dameeto_gifts", // Cloudinary mein naya folder ban jayega
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage: storage });

// --- GIFT ADMIN ROUTES ---

// 1. Upload New Gift
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

    const newGift = new FreeGift({
      title,
      description,
      src: req.file.path, // Cloudinary URL yahan se milega
      price: 0
    });

    await newGift.save();
    res.json({ success: true, gift: newGift });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get All Gifts (For Carousel)
router.get("/get-all", async (req, res) => {
  try {
    const gifts = await FreeGift.find().sort({ createdAt: -1 });
    res.json({ success: true, gifts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Delete Specific Gift
router.delete("/delete/:id", async (req, res) => {
  try {
    await FreeGift.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Gift deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;