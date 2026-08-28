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

        console.log(`🎬 [YT API] Transcript fetch shuru: Video ID -> ${videoId}`);

        const options = {
            method: 'GET',
            url: `https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url?url=${encodeURIComponent(videoUrl)}&flat_text=false&lang=en`,
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            },
            timeout: 10000 // 🚀 10 second timeout taaki app hang na ho
        };

        const response = await axios.request(options);
        let rawTranscript = response.data;

        // 🚨 MEGA DEBUG LOG: Render ke server par exactly kya response aaya, woh yahan dikhega!
        console.log("🚨 [RAPIDAPI RAW RESPONSE]:", typeof rawTranscript, JSON.stringify(rawTranscript).substring(0, 300));

        // 1. Agar API ne koi object/error return kiya (e.g. "Not subscribed" ya "Rate limit")
        if (rawTranscript && rawTranscript.message) {
            console.error("❌ RapidAPI Error Message:", rawTranscript.message);
            return res.status(400).json({ 
                success: false, 
                error: `RapidAPI Error: ${rawTranscript.message}` 
            });
        }

        // 2. Agar YouTube ne server IP block karke koi HTML page ya Captcha bhej diya
        if (typeof rawTranscript === 'string' && rawTranscript.toLowerCase().includes('html')) {
            console.error("❌ HTML response aaya. Iska matlab YouTube/RapidAPI ne Render server IP block kar diya hai.");
            return res.status(500).json({ 
                success: false, 
                error: "Server IP bot-protection mein fas gaya hai. Kripya thodi der baad try karein." 
            });
        }

        // 3. Confirm karein ki rawTranscript sach mein ek Array hai
        if (!Array.isArray(rawTranscript) || rawTranscript.length === 0) {
            console.error("❌ Array nahi mila. Ye mila:", rawTranscript);
            return res.status(404).json({
                success: false,
                error: "Is video par captions/subtitles available nahi hain ya API response invalid hai."
            });
        }

        // 🚀 Formatting for frontend
        const formattedScript = rawTranscript.map((item) => ({
            start: parseFloat(item.start), 
            text: (item.text || "")
                .replace(/&amp;/g, "&")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
        }));

        console.log(`✅ [YT API] Success! Transcript bhej diya. Lines: ${formattedScript.length}`);
        
        return res.status(200).json({ 
            success: true, 
            script: formattedScript 
        });

    } catch (error) {
        console.error("🔥 RapidAPI Fetch Error:", error.response ? error.response.data : error.message); 
        return res.status(500).json({ 
            success: false, 
            error: "Transcript fetch karne mein error aayi. Shayad video blocked hai ya API server down hai." 
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
        console.error("YT Bucket Save Error:", error.message);
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
        console.error("YT Bucket Fetch Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to fetch saved words." });
    }
});

module.exports = router;