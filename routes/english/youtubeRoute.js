const express = require('express');
const router = express.Router();
// 🚀 Wapas sabse reliable package par shift kiya
const { YoutubeTranscript } = require('youtube-transcript'); 
const YoutubeBucket = require('../../models/english/YoutubeBucket'); 

// URL se Video ID nikalne ka function
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// ==========================================
// 1. FETCH YOUTUBE TRANSCRIPT ROUTE
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

        // 🚀 Purana wala reliable method jo kabhi khali array nahi deta
        let rawTranscript = [];
        try {
            rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
        } catch (langErr) {
            console.log("Default fetch failed, retrying en:", langErr.message);
            rawTranscript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
        }

        if (!rawTranscript || rawTranscript.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Is video par captions/subtitles available nahi hain."
            });
        }

        // 🚀 Frontend ko jo structure chahiye (start & text)
        const formattedScript = rawTranscript.map((item) => ({
            start: item.offset / 1000, // Milliseconds ko seconds mein convert kiya
            text: item.text
                .replace(/&amp;/g, "&")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
        }));

        return res.status(200).json({ 
            success: true, 
            script: formattedScript 
        });

    } catch (error) {
        console.error("Asli YouTube Error:", error.message || error); 
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch script. Ya toh isme Subtitles (CC) nahi hain, ya English language available nahi hai." 
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