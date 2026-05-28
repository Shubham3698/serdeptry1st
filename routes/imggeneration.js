const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Vocab = require('../models/Word'); // Apna path check kar lena

// 🔥 Cloudinary Setup
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/generate', async (req, res) => {
    try {
        const { phrase, actionType, userId } = req.body; 
        
        if (!phrase || !userId) {
            return res.status(400).json({ error: 'Phrase and UserID required!' });
        }

        console.log(`Generating & Uploading image for: ${phrase} | Action: ${actionType || 'normal'}`);

        let optimizedPrompt = `A high-quality, clear, and beautiful visual illustration of "${phrase}". Purely visual, absolutely no text or words in the image.`;

        if (actionType === 'refine') {
            optimizedPrompt = `A breathtaking masterpiece, ultra-detailed, cinematic lighting, 8k resolution, highly aesthetic and conceptual illustration of "${phrase}". Purely visual, absolutely no text or words.`;
        }
        
        const encodedPrompt = encodeURIComponent(optimizedPrompt);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${randomSeed}`;

        // 1. Fetch image from Pollinations
        const fetchResponse = await fetch(pollUrl);
        if (!fetchResponse.ok) throw new Error('Image fetch failed');

        const arrayBuffer = await fetchResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        // 2. Upload to Cloudinary
        const cloudResponse = await cloudinary.uploader.upload(base64Data, {
            folder: "dameeto_vocab", // Is folder mein saari images save hongi
            public_id: `${userId.split('@')[0]}_${phrase}_${Date.now()}`
        });

        const finalImageUrl = cloudResponse.secure_url;

        // 3. Update Database (URL save karna)
        await Vocab.findOneAndUpdate(
            { userId: userId, word: phrase.toLowerCase() },
            { imageUrl: finalImageUrl },
            { new: true }
        );

        // 4. Return URL to Frontend
        res.status(200).json({ imageUrl: finalImageUrl });

    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        res.status(500).json({ error: 'Image process karne mein problem aayi.' });
    }
});

module.exports = router;