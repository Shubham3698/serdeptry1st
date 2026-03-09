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

// Helper function
const parseField = (field) => {
    if (!field) return [];
    return typeof field === "string" ? field.split(",").map(s => s.trim()).filter(s => s !== "") : field;
};

// 🔍 1. SEARCH ROUTE (Unchanged)
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
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 🖼️ 2. SINGLE PRODUCT BY ID (Unchanged)
router.get("/single/:id", async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }); 
        if (!product) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json(product);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 📂 3. FETCH ALL (Unchanged)
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ➕ 4. ADD DATA (Refined for Multi-Image)
router.post("/add", upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "subImages", maxCount: 10 }
]), async (req, res) => {
    try {
        let productData = { ...req.body };

        // 🔥 Main Image from File
        if (req.files && req.files["image"]) {
            productData.src = req.files["image"][0].path;
        }

        // 🔥 Gallery Images from Files
        let galleryPaths = [];
        if (req.files && req.files["subImages"]) {
            galleryPaths = req.files["subImages"].map(file => file.path);
        }

        // Agar file nahi hai to manual URLs parse karo
        productData.tags = parseField(req.body.tags);
        
        // Combine file paths and existing manual subImages URLs
        const manualSubImages = parseField(req.body.subImages);
        productData.subImages = [...galleryPaths, ...manualSubImages];

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
router.put("/update/:id", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "subImages", maxCount: 10 }
]), async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.files && req.files["image"]) {
            updateData.src = req.files["image"][0].path;
        }

        if (req.files && req.files["subImages"]) {
            const newGallery = req.files["subImages"].map(file => file.path);
            const oldGallery = parseField(req.body.subImages);
            updateData.subImages = [...newGallery, ...oldGallery];
        } else {
            updateData.subImages = parseField(req.body.subImages);
        }

        updateData.tags = parseField(req.body.tags);

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json({ success: true, message: "Updated!", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🗑️ 6. DELETE DATA (Unchanged)
router.delete("/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted!" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;