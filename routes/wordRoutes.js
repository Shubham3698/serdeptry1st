const express = require("express");
const router = express.Router();
const axios = require("axios");
const Vocab = require("../models/Word");

// 🔥 ROUTE 1: Word Analyze karna aur DB me automatically save karna
router.post("/define", async (req, res) => {
  const { word, userId } = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss! ✍️" });
  }
  if (!userId) {
    return res.status(400).json({ success: false, message: "User session identification missing!" });
  }

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "Server error: GEMINI_API_KEY missing." });
  }
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

  // Unified clean prompt text
  const promptText = `You are an elite English vocabulary coach. Analyze the word "${word.trim()}".
  Provide the following details in a strict JSON object matching the structure below:
  1. "meaning": The most popular, clear, and extremely easy meaning written completely in Hindi script (Devanagari).
  2. "sentences": Exactly 3 practical everyday example sentences. Below each English sentence, write its Hindi translation inside brackets (). Use newlines (\\n) between separate examples.`;

  // 🔥 SIMPLIFIED kompatible Schema structure for Gemini 400 Bad Request fix
  const jsonSchema = {
    type: "object",
    properties: {
      meaning: { type: "string" },
      sentences: { type: "string" }
    },
    required: ["meaning", "sentences"]
  };

  try {
    console.log(`🔄 Contacting Google Gemini Matrix for: ${word.trim()}...`);
    const queryParams = new URLSearchParams({ key: apiKey });
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?" + queryParams.toString();
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema // Binds clean structure
      }
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

    if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
      const rawText = response.data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(rawText.trim());

      const targetWord = word.trim().toLowerCase();

      // DB Duplicate cleaner
      await Vocab.deleteOne({ userId, word: targetWord });

      // Saving directly to user account cluster
      const newVocabEntry = new Vocab({
        userId,
        word: targetWord,
        meaning: parsedData.meaning,
        sentences: parsedData.sentences
      });
      await newVocabEntry.save();

      return res.json({ 
        success: true, 
        data: {
          word: targetWord,
          meaning: parsedData.meaning,
          sentences: parsedData.sentences
        }
      });
    } else {
      throw new Error("Invalid structure from Gemini Cluster.");
    }

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ Gemini Engine Failed:", errorDetails);
    
    return res.status(503).json({ 
      success: false, 
      message: "Google Pipeline standard validation alert! Check schema or parameters." 
    });
  }
});

// 🔥 ROUTE 2: User account ki history MongoDB se nikalna
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userHistory = await Vocab.find({ userId }).sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, data: userHistory });
  } catch (error) {
    console.error("❌ History fetch failed:", error.message);
    return res.status(500).json({ success: false, message: "Database se history nahi nikal paayi!" });
  }
});

module.exports = router;