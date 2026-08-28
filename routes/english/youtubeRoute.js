const express = require('express');
const router = express.Router();
const axios = require('axios'); // 🚀 API call ke liye Axios
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

        // 🚀 RAPID API CALL (Bot protection bypass)
        const options = {
            method: 'GET',
            url: `https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url?url=${encodeURIComponent(videoUrl)}&flat_text=false&lang=en`,
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
                // 🚀 Yahan sirf .env se key aayegi, hardcoded nahi!
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            }
        };

        const response = await axios.request(options);
        
        // API response ek array of objects hota hai
        let rawTranscript = response.data;

        if (!rawTranscript || rawTranscript.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Is video par captions/subtitles available nahi hain."
            });
        }

        // 🚀 Frontend ko jo structure chahiye (start & text)
        const formattedScript = rawTranscript.map((item) => ({
            start: parseFloat(item.start), 
            text: (item.text || "")
                .replace(/&amp;/g, "&")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
        }));

        return res.status(200).json({ 
            success: true, 
            script: formattedScript 
        });

    } catch (error) {
        console.error("RapidAPI Fetch Error:", error.response ? error.response.data : error.message); 
        return res.status(500).json({ 
            success: false, 
            error: "Transcript fetch karne mein error aayi. Shayad API limit cross ho gayi ho ya video par captions disabled hain." 
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