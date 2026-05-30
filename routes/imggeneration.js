const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Vocab = require('../models/Word'); // Apna path check kar lena
const multer = require('multer');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

// 🔥 Cloudinary Setup
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

// ==========================================
// 🔥 SCENE-BASED AI IMAGE GENERATION (Gemini + Imagen 3 + Custom Prompt)
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        // 🔥 customPrompt receive kiya
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
        // 🔥 STEP 1: AI SE SCENE SOCHWAO (Using Gemini 1.5 Flash)
        // ========================================================
        console.log(`🧠 AI is thinking for word: "${phrase}"...`);
        const geminiEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent`;
        
        let geminiSystemInstruction = `You are a creative visual director for an educational vocabulary app. 
        Your job is to think of a single, highly meaningful, descriptive, and context-rich photographic scene that perfectly explains and illustrates the core meaning of the given word. 
        Output ONLY the descriptive scene in English (optimized as a detailed prompt for an image generator like Imagen 3). Do not include any introductory words, explanations, or quotes.`;

        let userQueryText = `Word to explain visually: "${phrase}". Describe the perfect explanatory scene.`;

        if (actionType === 'refine') {
            geminiSystemInstruction += " Make the scene cinematic, clear, and highly focused on the specific setup requested.";
            if (customPrompt && customPrompt.trim() !== "") {
                // 🔥 User ka idea Gemini ko de rahe hain
                userQueryText += `\n\nCRITICAL USER DIRECTION: The user wants the scene to specifically include or be based on this idea: "${customPrompt}". Blend this idea perfectly with the actual meaning of the word "${phrase}" so the output is accurate to the word but follows the user's creative direction.`;
            }
        } else if (actionType === 'regenerate') {
            geminiSystemInstruction += " Think of a completely different creative angle, metaphor, or alternative real-world setting to explain this word.";
        }

        const geminiResponse = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: userQueryText }]
                }],
                systemInstruction: {
                    parts: [{ text: geminiSystemInstruction }]
                },
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 250
                }
            })
        });

        const geminiData = await geminiResponse.json();
        
        let visualScenePrompt = `A high-quality educational illustration showing the concept of "${phrase}".`;
        
        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
            visualScenePrompt = geminiData.candidates[0].content.parts[0].text.trim();
        }

        console.log(`🎬 AI Conceptualized Scene: "${visualScenePrompt}"`);

        // ========================================================
        // 🔥 STEP 2: GENERATE IMAGE FROM THE SCENE (Using Imagen 3)
        // ========================================================
        console.log("🎨 Sending custom directed scene to Imagen 3...");
        const imagenEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
        
        const finalImagenPrompt = `${visualScenePrompt} Photorealistic, clean composition, studio lighting, sharp focus, 8k resolution, aesthetically pleasing, meaningful context.`;

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
            console.error("Imagen API Error:", imagenData);
            return res.status(500).json({ error: 'Google Imagen API failed to generate image.' });
        }

        const base64Image = imagenData.predictions[0].bytesBase64Encoded;
        const dataUri = `data:image/png;base64,${base64Image}`;

        // 3. Upload to Cloudinary
        const cloudResponse = await cloudinary.uploader.upload(dataUri, {
            folder: "dameeto_vocab_ai",
            public_id: `${userId.split('@')[0]}_ai_${phrase}_${Date.now()}`
        });

        const finalImageUrl = cloudResponse.secure_url;

        // 4. Update Database
        await Vocab.findOneAndUpdate(
            { userId: userId, word: phrase.toLowerCase() },
            { imageUrl: finalImageUrl },
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
// CUSTOM IMAGE UPLOAD ROUTE
// ==========================================
router.post('/upload-custom', upload.single('image'), async (req, res) => {
    try {
        const { word, userId } = req.body;
        if (!req.file) return res.status(400).json({ error: "File attach nahi hui boss!" });

        const localFilePath = req.file.path;
        const cloudResponse = await cloudinary.uploader.upload(localFilePath, {
            folder: "dameeto_vocab_custom", 
            public_id: `${userId.split('@')[0]}_custom_${word}_${Date.now()}`
        });

        fs.unlinkSync(localFilePath);
        const finalImageUrl = cloudResponse.secure_url;

        const updatedDoc = await Vocab.findOneAndUpdate(
            { userId: userId, word: word.toLowerCase() },
            { imageUrl: finalImageUrl },
            { returnDocument: 'after' }
        );

        if (!updatedDoc) return res.status(404).json({ error: "Word history mein nahi mila." });
        res.status(200).json({ imageUrl: finalImageUrl });
    } catch (error) {
        console.error("Custom Image Upload Error:", error);
        res.status(500).json({ error: "Backend error!" });
    }
});

module.exports = router;