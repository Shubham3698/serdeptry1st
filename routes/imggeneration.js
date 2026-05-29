const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Vocab = require('../models/Word'); // Apna path check kar lena
const multer = require('multer'); // 🔥 NAYA IMPORT
const fs = require('fs'); // 🔥 NAYA IMPORT

// 🔥 Cloudinary Setup
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔥 Multer Setup - Temporary file save karne ke liye
const upload = multer({ dest: 'uploads/' });

// ==========================================
// EXISTING ROUTE: AI Image Generation
// ==========================================
router.post('/generate', async (req, res) => {
    // ... (Tumhara existing /generate wala code same rahega) ...
    try {
        const { phrase, actionType, userId } = req.body; 
        
        if (!phrase || !userId) {
            return res.status(400).json({ error: 'Phrase and UserID required!' });
        }
        // ... (Baki ka tumhara AI generation code) ...
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        res.status(500).json({ error: 'Image process karne mein problem aayi.' });
    }
});

// ==========================================
// 🔥 NAYA ROUTE: Custom Image Upload
// ==========================================
router.post('/upload-custom', upload.single('image'), async (req, res) => {
    try {
        const { word, userId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "File attach nahi hui boss!" });
        }

        const localFilePath = req.file.path;

        // 1. Image ko Cloudinary par upload karo
        const cloudResponse = await cloudinary.uploader.upload(localFilePath, {
            folder: "dameeto_vocab_custom", // Alag folder for custom uploads
            public_id: `${userId.split('@')[0]}_custom_${word}_${Date.now()}`
        });

        // 2. Upload hone ke baad local server se file delete kardo
        fs.unlinkSync(localFilePath);

        const finalImageUrl = cloudResponse.secure_url;

        // 3. Database me purani image ko naye Cloudinary URL se replace karo
        const updatedDoc = await Vocab.findOneAndUpdate(
            { userId: userId, word: word.toLowerCase() },
            { imageUrl: finalImageUrl },
            { new: true }
        );

        if (!updatedDoc) {
            return res.status(404).json({ error: "Word history mein nahi mila update karne ke liye." });
        }

        // 4. Frontend ko success aur naya URL bhej do
        res.status(200).json({ imageUrl: finalImageUrl });

    } catch (error) {
        console.error("Custom Image Upload Error:", error);
        res.status(500).json({ error: "Backend me gadbad ho gayi upload karte waqt!" });
    }
});

module.exports = router;
