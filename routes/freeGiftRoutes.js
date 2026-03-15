const express = require("express");
const router = express.Router();
const FreeGift = require("../models/FreeGift");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// =====================
// Cloudinary Configuration
// =====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "dameeto_gifts",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage: storage });

// =====================
// Routes
// =====================

// 1. UPLOAD NEW GIFT
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "Image is required" });

    const newGift = new FreeGift({
      title,
      description,
      src: req.file.path, // Cloudinary URL
      price: 0
    });

    await newGift.save();
    res.json({ success: true, gift: newGift });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET ALL GIFTS
router.get("/get-all", async (req, res) => {
  try {
    const gifts = await FreeGift.find().sort({ createdAt: -1 });
    res.json({ success: true, gifts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. EDIT GIFT (Title, Description + Optional Image)
router.put("/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    let updateData = { title, description };

    // Agar nayi image upload hui hai toh uska path set karein
    if (req.file) {
      updateData.src = req.file.path;
    }

    const updatedGift = await FreeGift.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedGift) {
      return res.status(404).json({ success: false, message: "Gift not found" });
    }

    res.json({ success: true, gift: updatedGift });
  } catch (err) {
    console.error("Edit Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE SPECIFIC GIFT
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedGift = await FreeGift.findByIdAndDelete(req.params.id);
    if (!deletedGift) return res.status(404).json({ success: false, message: "Gift not found" });
    
    res.json({ success: true, message: "Gift deleted successfully 🗑️" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;