const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');

// ❤️ 1. Toggle Wishlist (Add/Remove)
router.post('/toggle', async (req, res) => {
  const { userId, productId, productData } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ success: false, message: "UserId and ProductId required" });
  }

  try {
    const existingItem = await Wishlist.findOne({ userId, productId });

    if (existingItem) {
      // Agar pehle se hai to Delete karo
      await Wishlist.deleteOne({ userId, productId });
      return res.json({ 
        success: true, 
        isWishlisted: false, // Frontend isi variable ko check kar raha hai
        message: "Removed from wishlist" 
      });
    } else {
      // Agar nahi hai to Save karo
      const newItem = new Wishlist({ userId, productId, productData });
      await newItem.save();
      return res.json({ 
        success: true, 
        isWishlisted: true, // Frontend isi variable ko check kar raha hai
        productData: productData,
        message: "Added to wishlist" 
      });
    }
  } catch (error) {
    console.error("Wishlist Toggle Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 2. Get User's Wishlist
router.get('/:userId', async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    // Frontend ko data array format mein chahiye
    res.json({ 
      success: true, 
      data: items.map(item => item.productData) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// words.js (Ya tumhara vocab router) me ye naya route add karo
router.post("/generate-practice", async (req, res) => {
  const { word, userId } = req.body;

  if (!word) return res.status(400).json({ success: false, message: "Target word missing hai! 🎯" });
  
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: "API Key missing." });
  
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

  // Prompt specifically designed for distractor game
  const promptText = `
  You are an English teacher creating a sentence building game for the target word "${word}".
  Create a meaningful and practical sentence. Return ONLY a valid JSON object.
  Rules:
  1. "hindiSentence": A simple Hindi sentence using the concept of the target word.
  2. "englishSentence": The exact English translation of the Hindi sentence (without punctuation marks like periods or commas at the end).
  3. "distractors": An array of 4 English words that grammatically fit the sentence but are incorrect (bholane wale words).
  Important: Response must be valid JSON only. Do not return markdown.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      hindiSentence: { type: "string" },
      englishSentence: { type: "string" },
      distractors: { 
        type: "array",
        items: { type: "string" }
      },
    },
    required: ["hindiSentence", "englishSentence", "distractors"],
  };

  try {
    const queryParams = new URLSearchParams({ key: apiKey });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?${queryParams.toString()}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema },
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

    if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
      const rawText = response.data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(rawText.trim());

      return res.json({
        success: true,
        data: parsedData,
      });
    } else {
      throw new Error("Invalid response structure from Gemini.");
    }
  } catch (error) {
    console.error("❌ Gemini Practice API Error:", error.message);
    return res.status(503).json({ success: false, message: "Game generate karne me dikkat aayi!" });
  }
});

module.exports = router;
