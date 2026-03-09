const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ☁️ CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: "daxs9cdp6", 
  api_key: "194775248813893",
  api_secret: "F2bFfBordNerkYgZeN5ds_dwu10",
});

// 📁 MULTER STORAGE
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "dameeto_products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage: storage });

// Helper function to handle strings coming from FormData
const parseField = (field) => {
    if (!field) return [];
    return typeof field === "string" ? field.split(",").map(s => s.trim()) : field;
};

// 🔍 1. SEARCH ROUTE
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const results = await Product.find({
            $or: [
                { title: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
                { pageType: { $regex: query, $options: "i" } },
                { tags: { $in: [new RegExp(query, "i")] } }
            ]
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🖼️ 2. SINGLE PRODUCT BY ID
router.get("/single/:id", async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }); 
        if (!product) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📂 3. FETCH ALL BY PAGETYPE
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ➕ 4. ADD DATA (Refined)
router.post("/add", upload.single("image"), async (req, res) => {
    try {
        let productData = { ...req.body };

        // 🔥 Cloudinary logic
        if (req.file) {
            productData.src = req.file.path; // Cloudinary URL becomes the main src
        }

        // Parse Arrays (FormData sends them as strings)
        productData.tags = parseField(req.body.tags);
        productData.subImages = parseField(req.body.subImages);

        const cleanPageType = productData.pageType ? productData.pageType.trim() : "stickerData";
        const prefix = cleanPageType.substring(0, 2).toLowerCase();
        
        const newProduct = new Product({
            ...productData,
            pageType: cleanPageType,
            id: `${prefix}-${Date.now()}` 
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Product Added!", data: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🛠️ 5. UPDATE DATA (Refined)
router.put("/update/:id", upload.single("image"), async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.file) {
            updateData.src = req.file.path;
        }

        if (req.body.tags) updateData.tags = parseField(req.body.tags);
        if (req.body.subImages) updateData.subImages = parseField(req.body.subImages);

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json({ success: true, message: "Updated!", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🗑️ 6. DELETE DATA
router.delete("/delete/:id", async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;