const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Vocab = require('../models/Word'); // Apna path verify kar lena
const multer = require('multer');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

// 🔥 Cloudinary Setup
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

// 🔥 EDUCATIONAL AESTHETIC (Focus on Meaning & Context)
const VOCAB_LEARNING_STYLE = "clear visual metaphor, situational storytelling, expressive elements demonstrating the exact meaning, clean educational illustration, highly contextual, minimalist background so the focus is on the action/emotion, easy to understand concept";

// ==========================================
// 🔥 SCENE-BASED AI IMAGE GENERATION (Gemini + Imagen 3)
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        const { phrase, actionType, userId, customPrompt } = req.body; 
        
        if (!phrase || !userId) {
            return res.status(400).json({ error: 'Phrase and UserID required!' });
        }

        // 1. Google Cloud Authentication
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const accessToken = (await client.getAccessToken()).token;

        // ========================================================
        // 🔥 STEP 1: AI SE SCENE SOCHWAO (Educational Context)
        // ========================================================
        console.log(`🧠 AI is thinking of a situation for word: "${phrase}"...`);
        const geminiEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent`;
        
        let geminiSystemInstruction = `You are an expert visual educator. 
        Your job is to think of a single, highly meaningful real-world situation or visual metaphor that perfectly EXPLAINS the core meaning of the given English word to a student.
        The scene must make the definition instantly obvious through action, expression, or contrast.
        Output ONLY the descriptive scene in English. Do not include any introductory words, explanations, or quotes.`;

        let userQueryText = `Word to explain visually: "${phrase}". Describe the perfect explanatory scene.`;

        if (actionType === 'refine') {
            geminiSystemInstruction += " Make the scene clear and highly focused on the specific setup requested.";
            if (customPrompt && customPrompt.trim() !== "") {
                userQueryText += `\n\nCRITICAL USER DIRECTION: The user wants the scene to specifically include or be based on this idea: "${customPrompt}". Blend this idea perfectly with the actual meaning of the word "${phrase}" so the visual still explains the word accurately.`;
            }
        } else if (actionType === 'regenerate') {
            geminiSystemInstruction += " Think of a completely different creative angle, metaphor, or alternative real-world setting to explain this word visually.";
        }

        const geminiResponse = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userQueryText }] }],
                systemInstruction: { parts: [{ text: geminiSystemInstruction }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
            })
        });

        const geminiData = await geminiResponse.json();
        
        let visualScenePrompt = `A high-quality educational illustration showing the concept of "${phrase}".`;
        
        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
            visualScenePrompt = geminiData.candidates[0].content.parts[0].text.trim();
        }

        console.log(`🎬 AI Conceptualized Educational Scene: "${visualScenePrompt}"`);

        // ========================================================
        // 🔥 STEP 2: GENERATE IMAGE FROM THE SCENE (Imagen 3)
        // ========================================================
        console.log("🎨 Sending scene to Imagen 3...");
        const imagenEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
        
        // Final prompt = Gemini's Scene + Our Vocabulary Learning Aesthetic
        const finalImagenPrompt = `${visualScenePrompt}. ${VOCAB_LEARNING_STYLE}`;

        const imagenResponse = await fetch(imagenEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [{ prompt: finalImagenPrompt }],
                parameters: { 
                    sampleCount: 1,
                    aspectRatio: "1:1"
                }
            })
        });

        const imagenData = await imagenResponse.json();

        if (!imagenData.predictions || imagenData.predictions.length === 0) {
            console.error("Imagen API Error:", JSON.stringify(imagenData, null, 2));
            return res.status(500).json({ error: 'Google Imagen API failed to generate image.' });
        }

        const base64Image = imagenData.predictions[0].bytesBase64Encoded;
        const dataUri = `data:image/png;base64,${base64Image}`;

        // 3. Upload to Cloudinary (Folder name updated for vocab app)
        const cloudResponse = await cloudinary.uploader.upload(dataUri, {
            folder: "vocab_learning_ai", 
            public_id: `${userId.split('@')[0]}_ai_${phrase.replace(/\s+/g, '_')}_${Date.now()}`
        });

        const finalImageUrl = cloudResponse.secure_url;

        // 4. Update Database (Safe Update for both String and Array fields)
        await Vocab.findOneAndUpdate(
            { userId: userId, word: phrase.toLowerCase() },
            { 
                $push: { imageUrls: finalImageUrl }, // New field: Array mein append karo
                $set: { imageUrl: finalImageUrl }    // Old field: Backup ke liye update karo
            },
            { returnDocument: 'after' }
        );

        // 5. Send Response
        res.status(200).json({ imageUrl: finalImageUrl });

    } catch (error) {
        console.error("Image Generation/Upload Error:", error);
        res.status(500).json({ error: 'Image process karne mein problem aayi.' });
    }
});

// ==========================================
// 🔥 CUSTOM IMAGE UPLOAD ROUTE
// ==========================================
router.post('/upload-custom', upload.single('image'), async (req, res) => {
    try {
        const { word, userId } = req.body;
        if (!req.file) return res.status(400).json({ error: "File attach nahi hui boss!" });

        const localFilePath = req.file.path;
        
        const cloudResponse = await cloudinary.uploader.upload(localFilePath, {
            folder: "vocab_learning_custom", 
            public_id: `${userId.split('@')[0]}_custom_${word.replace(/\s+/g, '_')}_${Date.now()}`
        });

        // Delete temp file asynchronously
        fs.unlink(localFilePath, (err) => {
            if (err) console.error("Error deleting temp file:", err);
        });

        const finalImageUrl = cloudResponse.secure_url;

        // DB Update (Same string + array sync)
        const updatedDoc = await Vocab.findOneAndUpdate(
            { userId: userId, word: word.toLowerCase() },
            { 
                $push: { imageUrls: finalImageUrl }, 
                $set: { imageUrl: finalImageUrl }
            },
            { returnDocument: 'after' }
        );

        if (!updatedDoc) return res.status(404).json({ error: "Word history mein nahi mila." });
        res.status(200).json({ imageUrl: finalImageUrl });
    } catch (error) {
        console.error("Custom Image Upload Error:", error);
        
        // Safety cleanup on failure
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => {});
        }
        
        res.status(500).json({ error: "Backend error during upload!" });
    }
});


// ==========================================
// 🔥 WEB IMPORT & AUTO-SEARCH ROUTE
// ==========================================
router.post('/import-web', async (req, res) => {
    try {
        const { word, userId, imageUrl, autoSearch } = req.body;
        if (!word || !userId) return res.status(400).json({ error: "Missing data!" });

        let targetImageUrl = imageUrl;

        // Agar user ne direct link nahi diya, toh auto-search (Pexels) se uthao
        if (autoSearch && !targetImageUrl) {
            // Replace 'YOUR_PEXELS_API_KEY' with process.env.PEXELS_API_KEY
            const pexelsRes = await axios.get(`https://api.pexels.com/v1/search?query=${word}&per_page=1`, {
                headers: { Authorization: process.env.PEXELS_API_KEY }
            });
            
            if (pexelsRes.data.photos && pexelsRes.data.photos.length > 0) {
                targetImageUrl = pexelsRes.data.photos[0].src.large;
            } else {
                return res.status(404).json({ error: "Koi relevant image nahi mili web par!" });
            }
        }

        if (!targetImageUrl) {
            return res.status(400).json({ error: "Image URL required!" });
        }

        // Upload to Cloudinary direct from the Web URL
        const cloudResponse = await cloudinary.uploader.upload(targetImageUrl, {
            folder: "vocab_learning_web", 
            public_id: `${userId.split('@')[0]}_web_${word.replace(/\s+/g, '_')}_${Date.now()}`
        });

        const finalImageUrl = cloudResponse.secure_url;

        // Update DB
        const updatedDoc = await Vocab.findOneAndUpdate(
            { userId: userId, word: word.toLowerCase() },
            { 
                $push: { imageUrls: finalImageUrl }, 
                $set: { imageUrl: finalImageUrl }
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({ imageUrl: finalImageUrl });

    } catch (error) {
        console.error("Web Import Error:", error);
        res.status(500).json({ error: "Web image import fail ho gaya!" });
    }
});

router.get('/search-web', async (req, res) => {
    try {
        const { word } = req.query;
        if (!word) return res.status(400).json({ error: "Word is required for search" });

        let apiKey = process.env.PIXABAY_API_KEY;
        if (!apiKey) {
            console.log("❌ API KEY MISSING! .env file check kar.");
            return res.status(500).json({ error: "Server Configuration Error: Key missing." });
        }

        // 🔥 FIX 1: API Key ko clean karna (Spaces aur Quotes hatana)
        apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

        console.log(`🌍 Fetching REAL web images for: ${word}`);

        const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(word)}&image_type=photo&per_page=12&safesearch=true`;
        
        const response = await axios.get(url);

        if (response.data && response.data.hits && response.data.hits.length > 0) {
            const images = response.data.hits.map(hit => hit.webformatURL);
            return res.status(200).json({ success: true, images });
        } else {
            return res.status(404).json({ error: "Google/Web par koi relevant image nahi mili." });
        }

    } catch (error) {
        // 🔥 FIX 2: Asli reason print karwana ki Pixabay ne reject kyu kiya
        const exactError = error.response ? error.response.data : error.message;
        console.error("❌ Web Search API Error EXACT REASON:", exactError);
        res.status(500).json({ error: "Web se images laane mein fail ho gaya." });
    }
});

module.exports = router;