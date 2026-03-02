const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// 🔥 1. FETCH ALL BY PAGETYPE (Trending, Sticker etc.)
// Frontend categories load karne ke liye
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🔥 NEW ROUTE: FETCH SINGLE PRODUCT BY CUSTOM ID
// Ye specifically ImageDetails page ke liye hai (Shared Links fix karega)
router.get("/single/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // Hum 'id' field dhoond rahe hain (e.g., "st-17724356...")
        const product = await Product.findOne({ id: id }); 
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product nahi mila!" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🔥 2. ADD DATA (Admin Panel)
router.post("/add", async (req, res) => {
    try {
        const { pageType, category } = req.body;
        
        // Optimization: Extra spaces hatane ke liye trim
        const cleanPageType = pageType ? pageType.trim() : "stickerData";
        const cleanCategory = category ? category.trim() : "stickers";

        const prefix = cleanPageType.substring(0, 2).toLowerCase();
        
        const newProduct = new Product({
            ...req.body,
            pageType: cleanPageType,
            category: cleanCategory,
            id: `${prefix}-${Date.now()}` // Unique Custom ID
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Naya product add ho gaya!", data: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🔥 3. UPDATE DATA (Admin Edit)
router.put("/update/:id", async (req, res) => {
    try {
        // req.params.id mein MongoDB wali _id jayegi
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila bhai!" });
        
        res.json({ success: true, message: "Chaka-chak update ho gaya!", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        const results = await Product.find({
            $or: [
                { title: { $regex: query, $options: "i" } }, // 'i' matlab case-insensitive
                { tags: { $in: [new RegExp(query, "i")] } },
                { category: { $regex: query, $options: "i" } }
            ]
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 🔥 4. DELETE DATA (Admin Delete)
router.delete("/delete/:id", async (req, res) => {
    try {
        // MongoDB _id use karke delete
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if(!deleted) return res.status(404).json({ success: false, message: "Product already deleted or not found" });
        
        res.json({ success: true, message: "Product delete ho gaya!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;