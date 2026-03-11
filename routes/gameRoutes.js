const express = require("express");
const router = express.Router();
const Sticker = require("../models/Sticker");
const User = require("../models/user");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary Config
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

// --- STICKER ADMIN ROUTES ---

// 1. Upload with Category
router.post("/upload-sticker", upload.single("image"), async (req, res) => {
  try {
    const { category } = req.body; 
    if (!req.file) return res.status(400).json({ success: false });
    const newSticker = new Sticker({ url: req.file.path, category: category.toUpperCase() });
    await newSticker.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 2. Manage Groups (List all categories)
router.get("/manage-groups", async (req, res) => {
  try {
    const categories = await Sticker.distinct("category");
    const groups = await Promise.all(categories.map(async (cat) => {
      const one = await Sticker.findOne({ category: cat });
      return { name: cat, preview: one?.url };
    }));
    res.json({ success: true, groups });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 3. Delete Entire Group
router.delete("/delete-group/:name", async (req, res) => {
  try {
    await Sticker.deleteMany({ category: req.params.name.toUpperCase() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// --- GAMEPLAY ROUTES ---

// 4. Get Random Group for Game
router.get("/get-stickers", async (req, res) => {
  try {
    const categories = await Sticker.distinct("category");
    if (!categories.length) return res.json({ success: false });
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const stickers = await Sticker.find({ category: randomCat }).limit(12);
    res.json({ success: true, stickers, categoryName: randomCat });
  } catch (err) { res.status(500).json({ success: false }); }
});

// --- CREDITS ROUTES ---

router.get("/user-credits/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    res.json({ success: true, credits: user ? user.credits : 0 });
  } catch (err) { res.status(500).json({ success: false }); }
});
// Single Image Delete Route
router.delete("/delete-sticker/:id", async (req, res) => {
  try {
    await Sticker.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Image deleted!" });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Poora Group (Category) delete karne ke liye
router.delete("/delete-group/:category", async (req, res) => {
  try {
    const { category } = req.params;
    await Sticker.deleteMany({ category: category.toUpperCase() });
    res.json({ success: true, message: `Group ${category} deleted!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Specific Group ki saari images lane ke liye
router.get("/group-details/:category", async (req, res) => {
  try {
    const stickers = await Sticker.find({ category: req.params.category.toUpperCase() });
    res.json({ success: true, stickers });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post("/game-credit", async (req, res) => {
  try {
    const { email, credits } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false });
    user.credits = (user.credits || 0) + Number(credits);
    await user.save();
    res.json({ success: true, credits: user.credits });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;