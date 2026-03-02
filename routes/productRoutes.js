const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// 🔍 1. SEARCH ROUTE (Ise sabse upar rakho!)
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        console.log("🔍 Database Searching for:", query);

        const results = await Product.find({
            $or: [
                { title: { $regex: query, $options: "i" } },
                { tag: { $regex: query, $options: "i" } }, // Single tag support
                { tags: { $in: [new RegExp(query, "i")] } }, // Array tags support
                { category: { $regex: query, $options: "i" } },
                { pageType: { $regex: query, $options: "i" } }
            ]
        });

        console.log(`✅ Found ${results.length} items in DB`);
        res.json(results);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🖼️ 2. SINGLE PRODUCT BY ID (Ye bhi specific hai, upar rahega)
router.get("/single/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ id: id }); 
        if (!product) {
            return res.status(404).json({ success: false, message: "Product nahi mila!" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📂 3. FETCH ALL BY PAGETYPE (Ise niche rakho kyunki ye dynamic :id jaisa hai)
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ➕ 4. ADD DATA (Admin Panel)
router.post("/add", async (req, res) => {
    try {
        const { pageType, category } = req.body;
        const cleanPageType = pageType ? pageType.trim() : "stickerData";
        const cleanCategory = category ? category.trim() : "stickers";
        const prefix = cleanPageType.substring(0, 2).toLowerCase();
        
        const newProduct = new Product({
            ...req.body,
            pageType: cleanPageType,
            category: cleanCategory,
            id: `${prefix}-${Date.now()}` 
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Naya product add ho gaya!", data: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🛠️ 5. UPDATE DATA
router.put("/update/:id", async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila bhai!" });
        res.json({ success: true, message: "Update ho gaya!", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🗑️ 6. DELETE DATA
router.delete("/delete/:id", async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if(!deleted) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;