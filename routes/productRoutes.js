const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const axios = require("axios");
const FormData = require("form-data");

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
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

// 🔥 AI BACKGROUND REMOVAL FUNCTION (SECURED WITH ENV)
const removeBackgroundAI = async (imageUrl) => {
  try {
    const response = await axios({
      method: "post",
      url: "https://api.remove.bg/v1.0/removebg",
      data: {
        image_url: imageUrl,
        size: "auto",
      },
      headers: {
        // 🔥 API Key ab environment variable se aa rahi hai
        "X-Api-Key": process.env.REMOVE_BG_API_KEY, 
      },
      responseType: "arraybuffer",
    });

    // Cleaned Image ko Cloudinary par wapas upload karna (PNG format mein)
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "dameeto_products", format: "png" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(response.data);
    });
  } catch (err) {
    console.error("❌ AI Error:", err.response ? err.response.data.toString() : err.message);
    return imageUrl; // Error aaye toh original image ka link hi bhej do
  }
};

const parseField = (field) => {
    if (!field) return [];
    return typeof field === "string" ? field.split(",").map(s => s.trim()).filter(s => s !== "") : field;
};

// ➕ 1. ADD DATA (Updated with AI logic)
router.post("/add", upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "subImages", maxCount: 10 }
]), async (req, res) => {
    try {
        let productData = { ...req.body };

        // Main Image Handling
        if (req.files && req.files["image"]) {
            let uploadedUrl = req.files["image"][0].path;

            // Check if Background Removal is needed
            if (req.body.removeBg === "true") {
                console.log("🚀 AI is cleaning background in backend...");
                uploadedUrl = await removeBackgroundAI(uploadedUrl);
            }
            productData.src = uploadedUrl;
        }

        // Gallery Images Handling
        let galleryPaths = [];
        if (req.files && req.files["subImages"]) {
            galleryPaths = req.files["subImages"].map(file => file.path);
        }

        productData.tags = parseField(req.body.tags);
        const manualSubImages = parseField(req.body.subImages);
        productData.subImages = [...galleryPaths, ...manualSubImages];

        const cleanPageType = productData.pageType ? productData.pageType.trim() : "stickerData";
        const prefix = cleanPageType.substring(0, 2).toLowerCase();
        
        const newProduct = new Product({
            ...productData,
            pageType: cleanPageType,
            id: `${prefix}-${Date.now()}`,
            removeBg: req.body.removeBg === "true"
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Product Added!", data: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🛠️ 2. UPDATE DATA (Updated with AI logic)
router.put("/update/:id", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "subImages", maxCount: 10 }
]), async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.files && req.files["image"]) {
            let uploadedUrl = req.files["image"][0].path;
            if (req.body.removeBg === "true") {
                uploadedUrl = await removeBackgroundAI(uploadedUrl);
            }
            updateData.src = uploadedUrl;
        }

        if (req.files && req.files["subImages"]) {
            const newGallery = req.files["subImages"].map(file => file.path);
            const oldGallery = parseField(req.body.subImages);
            updateData.subImages = [...newGallery, ...oldGallery];
        } else {
            updateData.subImages = parseField(req.body.subImages);
        }

        updateData.tags = parseField(req.body.tags);
        updateData.removeBg = req.body.removeBg === "true";

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json({ success: true, message: "Updated!", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📂 3. FETCH ALL
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 🗑️ 4. DELETE DATA
router.delete("/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted!" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 🖼️ 5. SINGLE PRODUCT BY ID
router.get("/single/:id", async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }); 
        if (!product) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json(product);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;