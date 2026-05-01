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
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

// 🔥 AI BACKGROUND REMOVAL FUNCTION
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
        "X-Api-Key": process.env.REMOVE_BG_API_KEY, 
      },
      responseType: "arraybuffer",
    });

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
    return imageUrl; 
  }
};

const parseField = (field) => {
    if (!field) return [];
    return typeof field === "string" ? field.split(",").map(s => s.trim()).filter(s => s !== "") : field;
};

// --- ROUTES START ---

// 🔥 2. DYNAMIC WISHLIST TOGGLE (DB mein product ho ya na ho, dono handle karega)
router.post("/action/wishlist/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const { email } = req.body;

        if (!email) return res.status(401).json({ success: false, message: "Login required!" });

        const User = require("../models/user"); // Check path: User.js ya user.js
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // 🔍 Product dhoondo, nahi mile toh naya banao (Auto-Create)
        let product = await Product.findOne({ id: productId });

        if (!product) {
            console.log("🆕 Missing Product! Dameeto System naya bana raha hai...");
            product = new Product({
                id: productId,
                title: "1st 10 DTF-Sticker Pack", 
                wishlistCount: 15, // Starting count
                pageType: "stickerPacks",
                category: "stickers",
                src: "https://i.pinimg.com/736x/80/07/d8/8007d8ba979d036cb1a6c18aa701f369.jpg"
            });
            await product.save();
        }

        // 🔄 Toggle Logic
        const isWishlisted = user.wishlist.includes(product._id);

        if (isWishlisted) {
            await User.findOneAndUpdate({ email }, { $pull: { wishlist: product._id } });
            const updatedProduct = await Product.findOneAndUpdate(
                { id: productId },
                { $inc: { wishlistCount: -1 }, $pull: { wishlistedBy: email } },
                { new: true }
            );
            return res.json({ success: true, status: "removed", count: updatedProduct.wishlistCount });
        } else {
            await User.findOneAndUpdate({ email }, { $push: { wishlist: product._id } });
            const updatedProduct = await Product.findOneAndUpdate(
                { id: productId },
                { $inc: { wishlistCount: 1 }, $push: { wishlistedBy: email } },
                { new: true }
            );
            return res.json({ success: true, status: "added", count: updatedProduct.wishlistCount });
        }
    } catch (err) {
        console.error("❌ Wishlist Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 🔍 1. SEARCH PRODUCTS (Order: Sabse Upar)
// Isse upar rakhna zaroori hai taaki /:pageType isse intercept na kare
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const searchRegex = new RegExp(query, "i");

        const products = await Product.find({
            $or: [
                { title: searchRegex },
                { tags: { $regex: query, $options: "i" } }, // 🔥 Array ke har element mein search
                { tag: searchRegex },
                { pageType: searchRegex }
            ]
        }).sort({ createdAt: -1 });

        console.log(`🔎 DB Search: "${query}" found ${products.length} items.`);
        res.json(products);
    } catch (err) {
        console.error("❌ Search Error:", err);
        res.status(500).json({ success: false, message: "Search failed server side" });
    }
});

// ➕ 2. ADD DATA
// ➕ 2. ADD DATA (Admin Panel + Extension Friendly)
router.post("/add", (req, res, next) => {
    // 🔥 Check: Agar Extension se JSON data aa raha hai, toh multer skip karo
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        return next(); 
    }
    // Agar normal file upload hai (React Admin Panel se), toh multer chalne do
    upload.fields([
        { name: "image", maxCount: 1 }, 
        { name: "subImages", maxCount: 10 }
    ])(req, res, next);
}, async (req, res) => {
    try {
        let productData = { ...req.body };

        // 🔥 1. IMAGE HANDLING (UPDATED)
        if (req.files && req.files["image"]) {
            // ✅ Normal upload (React Admin Panel)
            let uploadedUrl = req.files["image"][0].path;

            // Background Removal check (Boolean or String handle)
            if (req.body.removeBg === "true" || req.body.removeBg === true) {
                uploadedUrl = await removeBackgroundAI(uploadedUrl);
            }
            productData.src = uploadedUrl;

        } else if (req.body.src) {
            // ✅ Extension support (Pinterest URL or Base64)
            let finalUrl = req.body.src;

            // Agar extension ne removeBg tick kiya hai
            if (req.body.removeBg === "true" || req.body.removeBg === true) {
                // Agar URL hai toh AI se clean karwao, agar base64 hai toh sidha upload
                if (!finalUrl.startsWith('data:image')) {
                    finalUrl = await removeBackgroundAI(finalUrl);
                } else {
                    // Base64 data ko Cloudinary pe upload karo
                    const uploadRes = await cloudinary.uploader.upload(finalUrl, {
                        folder: "dameeto_products"
                    });
                    finalUrl = uploadRes.secure_url;
                }
            } else if (!finalUrl.startsWith('https://res.cloudinary.com')) {
                // Agar removeBg nahi hai par Pinterest URL hai, toh Cloudinary pe backup le lo
                const uploadRes = await cloudinary.uploader.upload(finalUrl, {
                    folder: "dameeto_products"
                });
                finalUrl = uploadRes.secure_url;
            }
            
            productData.src = finalUrl;
        }

        // 🔥 2. SUB IMAGES
        let galleryPaths = [];
        if (req.files && req.files["subImages"]) {
            galleryPaths = req.files["subImages"].map(file => file.path);
        }

        productData.tags = parseField(req.body.tags);
        const manualSubImages = parseField(req.body.subImages);
        productData.subImages = [...galleryPaths, ...manualSubImages];

        // 🔥 3. PAGETYPE FIX
        const cleanPageType = productData.pageType 
            ? productData.pageType.trim() 
            : "stickerData";

        // 🔥 4. CREATE PRODUCT
        const newProduct = new Product({
            ...productData,
            pageType: cleanPageType,
            // ID generation logic intact
            id: `${cleanPageType.substring(0, 2).toLowerCase()}-${Date.now()}`,
            // Boolean normalize karo
            removeBg: req.body.removeBg === "true" || req.body.removeBg === true
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: "Product Added Successfully! 🚀",
            data: newProduct
        });

    } catch (err) {
        console.error("❌ ADD ERROR:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 🛠️ 3. UPDATE DATA
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

// 🖼️ 4. SINGLE PRODUCT BY ID (Order: Isse category route se upar rakhein)
router.get("/single/:id", async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }); 
        if (!product) return res.status(404).json({ success: false, message: "Nahi mila!" });
        res.json(product);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 📂 5. FETCH BY PAGETYPE (Order: Niche)
router.get("/:pageType", async (req, res) => {
    try {
        const data = await Product.find({ pageType: req.params.pageType }).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 🗑️ 6. DELETE DATA
router.delete("/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted!" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;