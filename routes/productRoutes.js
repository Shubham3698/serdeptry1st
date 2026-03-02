const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // 🔥 Model ko alag file se import kiya

// 1. Fetch Data (Frontend ke liye)
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Add Data (Admin Panel ke liye)
router.post("/add", async (req, res) => {
    try {
        const { pageType } = req.body;
        const prefix = pageType ? pageType.substring(0, 2).toLowerCase() : "nw";
        const newProduct = new Product({
            ...req.body,
            id: `${prefix}-${Date.now()}` 
        });
        await newProduct.save();
        res.status(201).json({ success: true, message: "Naya product add ho gaya!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. Update Data (Admin Edit ke liye)
// 🛠️ Route 3: Update
router.put("/update/:id", async (req, res) => {
    try {
        // req.params.id mein MongoDB wali lambi ID jayegi
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila bhai!" });
        
        res.json({ success: true, message: "Chaka-chak update ho gaya!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. Delete Data (Admin Delete ke liye)
router.delete("/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product delete ho gaya!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;