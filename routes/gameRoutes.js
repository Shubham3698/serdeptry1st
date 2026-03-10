const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/user"); 
const Sticker = require("../models/Sticker");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "dameeto_stickers",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage: storage });

// 🪙 CREDITS ROUTES
router.get("/user-credits/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, credits: user.credits || 0 });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post("/game-credit", async (req, res) => {
  const { email, credits } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false });
    user.credits = (user.credits || 0) + Number(credits);
    await user.save();
    res.json({ success: true, message: "Credits updated!", credits: user.credits });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 🛠️ STICKER ROUTES
router.post("/upload-sticker", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false });
    const newSticker = new Sticker({ url: req.file.path, name: "Dameeto Sticker" });
    await newSticker.save();
    res.json({ success: true, url: req.file.path });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get("/get-stickers", async (req, res) => {
  try {
    const stickers = await Sticker.find().sort({ createdAt: -1 }).limit(12);
    res.json({ success: true, stickers });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;