const express = require('express');
const router = express.Router();
const { YoutubeTranscript } = require('youtube-transcript'); 

router.post('/get-transcript', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.status(400).json({ success: false, error: "Please provide a YouTube URL." });
        }

        // Package directly video fetch karega
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoUrl);

        // Naye UI ke hisaab se array ko format karenge (taaki timestamps mil jayein)
        const formattedCaptions = transcriptArray.map(item => ({
            start: item.offset / 1000, 
            text: item.text
        }));

        return res.status(200).json({ 
            success: true, 
            script: formattedCaptions 
        });

    } catch (error) {
        console.log("====== YOUTUBE ERROR ======");
        console.log(error.message || error);
        console.log("===========================");
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch captions. Ensure the video is public and has English subtitles." 
        });
    }
});

module.exports = router;