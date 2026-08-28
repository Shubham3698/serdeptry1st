const express = require('express');
const router = express.Router();
const axios = require('axios');
const YoutubeBucket = require('../../models/english/YoutubeBucket'); 

// URL se Video ID nikalne ka function
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// 🚀 FOOLPROOF ARRAY EXTRACTOR (Data kahi bhi chhupa ho, nikal lega)
function findTranscriptArray(data) {
    if (!data) return [];
    
    // Agar JSON parse nahi hua string me aaya ho toh parse karo
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
    }

    // Agar direct array hai
    if (Array.isArray(data) && data.length > 0 && (data[0].text !== undefined || data[0].offset !== undefined)) {
        return data;
    }

    // Agar kisi Object ke andar wrap hoke aaya hai
    if (data && typeof data === 'object') {
        // Condition: Agar array keys ke through pass hua ho (e.g. { "0": {...}, "1": {...} })
        if (data["0"] && data["0"].text !== undefined) {
            return Object.values(data);
        }
        
        // Deep Search: Object ki har property check karo ki array kaha hai
        for (const key in data) {
            const val = data[key];
            if (Array.isArray(val) && val.length > 0 && (val[0].text !== undefined || val[0].offset !== undefined)) {
                return val; // Array mil gaya!
            }
        }
    }
    
    return [];
}

// ==========================================
// 1. FETCH YOUTUBE TRANSCRIPT (VIA RAPIDAPI)
// ==========================================
router.post('/get-transcript', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.status(400).json({ success: false, error: "Please provide a YouTube URL." });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ success: false, error: "Invalid YouTube URL format." });
        }

        console.log(`🎬 Fetching Transcript for Video ID: ${videoId}`);

        const options = {
            method: 'GET',
            url: `https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url?url=${encodeURIComponent(videoUrl)}&flat_text=false&lang=en`,
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            },
            timeout: 10000 
        };

        const response = await axios.request(options);
        let rawTranscript = response.data;

        // 1. API Error Handle
        if (rawTranscript && rawTranscript.message) {
            return res.status(400).json({ success: false, error: `RapidAPI Error: ${rawTranscript.message}` });
        }

        // 🚨 2. SMART EXTRACTION - Kahi bhi data ho, array nikal aayega
        let transcriptArray = findTranscriptArray(rawTranscript);

        // 3. Array empty ho toh Error
        if (!transcriptArray || transcriptArray.length === 0) {
            console.error("❌ Array Extract Nahi Hua! Raw Data:", JSON.stringify(rawTranscript).substring(0, 300));
            return res.status(404).json({
                success: false,
                error: "Is video par captions/subtitles available nahi hain ya API response invalid hai."
            });
        }

        // 🚀 4. FORMATTING - (Frontend ke liye Start aur Clean Text)
        const formattedScript = transcriptArray.map((item) => {
            // 'start' aur 'offset' dono check karega
            let time = 0;
            if (item.start !== undefined) time = parseFloat(item.start);
            else if (item.offset !== undefined) time = parseFloat(item.offset);
            
            // 🚨 MEGA FIX: Force the text to be a String no matter what RapidAPI sends!
            let rawText = (item.text !== undefined && item.text !== null) ? String(item.text) : "";
            
            return {
                start: time, 
                text: rawText
                    .replace(/&amp;/g, "&")
                    .replace(/&#39;/g, "'") // Single quotes clean
                    .replace(/&quot;/g, '"') // Double quotes clean
                    .replace(/&gt;/g, ">")  // Greater than clean 
                    .replace(/&lt;/g, "<")
            };
        });

        console.log(`✅ Success! Sent ${formattedScript.length} lines to frontend.`);
        
        return res.status(200).json({ 
            success: true, 
            script: formattedScript 
        });

    } catch (error) {
        console.error("🔥 RapidAPI Fetch Error:", error.message); 
        return res.status(500).json({ 
            success: false, 
            error: "Transcript fetch karne mein error aayi. API down ho sakti hai ya invalid video link hai." 
        });
    }
});


// ==========================================
// 2. SAVE WORD TO YT BUCKET ROUTE
// ==========================================
router.post('/add-vocab', async (req, res) => {
    try {
        const { word, context, videoUrl, timestamp, userEmail } = req.body;
        
        const newWord = new YoutubeBucket({ 
            word, 
            context, 
            videoUrl, 
            timestamp, 
            userEmail 
        });
        
        await newWord.save();
        return res.status(200).json({ success: true, message: "Word successfully saved to YT Bucket!" });
        
    } catch (error) {
        return res.status(500).json({ success: false, error: "Failed to save word." });
    }
});


// ==========================================
// 3. FETCH SAVED WORDS FOR DRAWER
// ==========================================
router.get('/vocab', async (req, res) => {
    try {
        const { email } = req.query;
        const vocab = await YoutubeBucket.find({ userEmail: email }).sort({ addedAt: -1 }); 
        return res.status(200).json({ success: true, vocab });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Failed to fetch saved words." });
    }
});

module.exports = router;