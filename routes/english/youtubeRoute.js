const express = require('express');
const router = express.Router();
// Naya package import kiya
const { getSubtitles } = require('youtube-captions-scraper'); 

// URL se Video ID nikalne ka function
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

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

        // 🚀 Naya Package Use Kar Rahe Hain
        const captions = await getSubtitles({
            videoID: videoId,
            lang: 'en' // English captions nikalne ke liye
        });

        // Captions array ko ek single text paragraph mein convert karna
        const fullScript = captions.map(item => item.text).join(' ');

        return res.status(200).json({ 
            success: true, 
            script: fullScript 
        });

    } catch (error) {
        // Backend terminal mein asli error dekhne ke liye
        console.error("Asli YouTube Error:", error.message || error); 
        
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch script. Ya toh isme Subtitles (CC) nahi hain, ya English language available nahi hai." 
        });
    }
});

module.exports = router;