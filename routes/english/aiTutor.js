const express = require('express');
const router = express.Router();
const axios = require('axios');
const googleTTS = require('google-tts-api');

// 🔥 SCENARIO-BASED VOICE TUTOR ROUTE 🔥
// Endpoint: POST /api/ai-tutor/scenario-chat
router.post("/scenario-chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: "Message zaroori hai" });
  }

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "Gemini Key missing" });
  }
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

  // 🧠 ELITE SCENARIO-BASED PROMPT
  const promptText = `
    You are an elite, encouraging Scenario-Based Spoken English Tutor. 
    You train users by giving them real-life situations to react to in English.
    
    The user has just replied to your previous scenario:
    User's reply: "${message}"

    Your task (Respond strictly in conversational "Hinglish"):
    1. First, politely correct their grammatical mistakes.
    2. Give them the "Native Way" to say it. Introduce 1 advanced phrasal verb, idiom, or smart prepositional phrase that fits perfectly. Briefly explain HOW that phrase works in the sentence structure.
    3. Finally, give them a NEW, completely different short scenario to react to (e.g., ordering food, arguing with a boss, asking for directions). Tell them to use their mic to respond.
    
    CRITICAL RULES:
    - Keep it short (Maximum 4-5 sentences). 
    - Write exactly like a human talking. 
    - ABSOLUTELY NO markdown formatting (*, #, _, bold, bullet points). Use pure plain text so the TTS engine reads it naturally.
  `;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await axios.post(geminiUrl, { 
        contents: [{ parts: [{ text: promptText }] }] 
    });
    
    let aiReplyText = geminiRes.data.candidates[0].content.parts[0].text.trim().replace(/[\*#_]/g, '');

    // Free TTS Audio Generation (Google TTS)
    let audioBase64 = null;
    try {
      audioBase64 = await googleTTS.getAudioBase64(aiReplyText, {
        lang: 'en-IN',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 10000,
      });
    } catch (ttsError) {
      console.error("Free TTS Error:", ttsError.message);
    }

    return res.json({ 
        success: true, 
        reply: aiReplyText, 
        audioBase64: audioBase64 
    });

  } catch (error) {
    console.error("Scenario Chat Error:", error.message);
    return res.status(503).json({ success: false, message: "Tutor unavailable" });
  }
});

module.exports = router;