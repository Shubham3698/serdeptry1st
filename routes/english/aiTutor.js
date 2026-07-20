// routes/aiTutor.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Router initialize karna
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/gemini-voice', async (req, res) => {
  try {
    const { message, email } = req.body;

    // ✅ Model name update kar diya hai: 'gemini-1.5-flash-latest'
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `You are an English AI tutor. The user said: "${message}". Reply naturally and correct any grammar mistakes at the end.`;

    const result = await model.generateContent(prompt);
    const aiReply = result.response.text();

    res.json({
      reply: aiReply,
      audioUrl: null // Frontend ka fallbackSpeak chalega
    });

  } catch (error) {
    console.error("Error connecting to Gemini:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// Router ko export karna zaroori hai
module.exports = router;