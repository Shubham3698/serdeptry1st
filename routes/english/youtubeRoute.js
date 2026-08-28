const express = require('express');
const router = express.Router();
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript'); // 🚀 NAYA SIMPLE TARIKA IMPORT KIYA
const YoutubeBucket = require('../../models/english/YoutubeBucket'); 

// URL se Video ID nikalne ka function
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// 🚀 FOOLPROOF ARRAY EXTRACTOR (RapidAPI ke liye fallback)
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
// 1. FETCH YOUTUBE TRANSCRIPT (DUAL ENGINE)
// ==========================================
router.post('/get-transcript', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) return res.status(400).json({ success: false, error: "Please provide a YouTube URL." });
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return res.status(400).json({ success: false, error: "Invalid YouTube URL format." });

    console.log(`🎬 Fetching Transcript for Video ID: ${videoId}`);

    // ==========================================
    // 🛠️ ENGINE 1: DIRECT FREE METHOD (youtube-transcript)
    // ==========================================
    try {
        console.log("⚡ Engine 1: Direct Fetch try kar raha hai...");
        
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
        if (transcript && transcript.length > 0) {
            const formattedScript = transcript.map(item => {
                // youtube-transcript offset ko milliseconds me deta hai, usko seconds me convert kar rahe hain
                const timeInSeconds = item.offset / 1000; 
                return {
                    start: timeInSeconds,
                    text: String(item.text)
                        .replace(/&amp;/g, "&")
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/&gt;/g, ">")
                        .replace(/&lt;/g, "<")
                };
            });
            
            console.log(`✅ Engine 1 Success! Sent ${formattedScript.length} lines to frontend.`);
            return res.status(200).json({ success: true, script: formattedScript });
        }
    } catch (engine1Error) {
        console.log("⚠️ Engine 1 Fail ho gaya (Shayad YouTube ne block kiya):", engine1Error.message);
        console.log("🔄 Engine 2 (RapidAPI) par switch kar rahe hain...");
    }

    // ==========================================
    // 🛠️ ENGINE 2: RAPID API FALLBACK
    // ==========================================
    try {
        const options = {
            method: 'GET',
            url: `https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url?url=${encodeURIComponent(videoUrl)}&flat_text=false&lang=en`,
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            },
            timeout: 50000 // 🚀 TIMEOUT 50 SECONDS
        };

        const response = await axios.request(options);
        let rawTranscript = response.data;

        // 1. API Error Handle
        if (rawTranscript && rawTranscript.success === false && rawTranscript.error) {
            console.log("⚠️ RapidAPI ke hisaab se video me captions nahi hain:", rawTranscript.error.trim());
            return res.status(404).json({ success: false, error: "Is video ke liye subtitles available nahi hain (RapidAPI Error)." });
        }
        
        // 2. Limit cross ya subscription issue
        if (rawTranscript && rawTranscript.message) {
            return res.status(400).json({ success: false, error: `RapidAPI Error: ${rawTranscript.message}` });
        }

        // 🚨 3. SMART EXTRACTION
        let transcriptArray = findTranscriptArray(rawTranscript);

        if (!transcriptArray || transcriptArray.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Is video par captions/subtitles available nahi hain ya API response invalid hai."
            });
        }

        // 🚀 4. FORMATTING
        const formattedScript = transcriptArray.map((item) => {
            let time = 0;
            if (item.start !== undefined) time = parseFloat(item.start);
            else if (item.offset !== undefined) time = parseFloat(item.offset);
            
            let rawText = (item.text !== undefined && item.text !== null) ? String(item.text) : "";
            
            return {
                start: time, 
                text: rawText
                    .replace(/&amp;/g, "&")
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&gt;/g, ">")
                    .replace(/&lt;/g, "<")
            };
        });

        console.log(`✅ Engine 2 (RapidAPI) Success! Sent ${formattedScript.length} lines.`);
        return res.status(200).json({ success: true, script: formattedScript });

    } catch (engine2Error) {
        console.error("🔥 Dono Engine Fail! Final Error:", engine2Error.message); 
        
        if (engine2Error.code === 'ECONNABORTED' || engine2Error.message.includes('timeout')) {
            return res.status(504).json({ success: false, error: "Server bohot slow hai. Kripya 2-3 minute baad try karein." });
        }

        return res.status(500).json({ success: false, error: "Transcript fetch karne mein error aayi. API block ho gayi hai." });
    }
});

// ==========================================
// 2. SAVE WORD TO YT BUCKET ROUTE
// ==========================================
router.post('/add-vocab', async (req, res) => {
    try {
        const { word, context, videoUrl, timestamp, userEmail } = req.body;
        
        const newWord = new YoutubeBucket({ word, context, videoUrl, timestamp, userEmail });
        
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