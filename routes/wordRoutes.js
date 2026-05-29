const express = require("express");
const router = express.Router();
const axios = require("axios");
const Vocab = require("../models/Word");

router.post("/define", async (req, res) => {
  const { word, userId, getAlternative } = req.body;

  if (!word || !word.trim()) return res.status(400).json({ success: false, message: "Word missing hai boss! ✍️" });
  if (!userId) return res.status(400).json({ success: false, message: "User session missing!" });

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: "Server error: API Key missing." });
  
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

const promptText = `
You are an elite English vocabulary coach. Analyze the English word "${word.trim()}". Return ONLY valid JSON object.
Rules:
1. "partOfSpeech": Give exact grammar category
2. "meaning": Give short Hindi meaning in Devanagari
3. "explanation": Explain in very simple Hinglish (max 2 lines)
4. "synonyms": Give minimum 8 synonyms (Comma separated, English only)
5. "antonyms": Give minimum 6 antonyms (Comma separated, English only)
6. "sentences": Give 3 factual, universally true, or scientifically accurate sentences (with Hindi translation in brackets, use \\n for line breaks)
Important: Response must be valid JSON only. Do not return markdown.
`;

  const jsonSchema = {
    type: "object",
    properties: {
      partOfSpeech: { type: "string" },
      meaning: { type: "string" },
      explanation: { type: "string" },
      synonyms: { type: "string" },
      antonyms: { type: "string" },
      sentences: { type: "string" },
    },
    required: ["partOfSpeech", "meaning", "explanation", "synonyms", "antonyms", "sentences"],
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
      const targetWord = word.trim().toLowerCase();

      // 🔥 PURANI IMAGE CHECK KARNA
      const existingWord = await Vocab.findOne({ userId, word: targetWord });
      let savedImageUrl = "";
      // Agar user refine context mang raha hai par image wahi rakhni hai
      if (existingWord && existingWord.imageUrl) {
          savedImageUrl = existingWord.imageUrl;
      }

      await Vocab.deleteOne({ userId, word: targetWord });

      const newVocabEntry = new Vocab({
        userId,
        word: targetWord,
        partOfSpeech: parsedData.partOfSpeech,
        meaning: parsedData.meaning,
        explanation: parsedData.explanation,
        synonyms: parsedData.synonyms,
        antonyms: parsedData.antonyms,
        sentences: parsedData.sentences,
        imageUrl: savedImageUrl // 🔥 Purani image URL wapas attach kardi
      });

      await newVocabEntry.save();

      return res.json({
        success: true,
        data: {
          word: targetWord,
          partOfSpeech: parsedData.partOfSpeech,
          meaning: parsedData.meaning,
          explanation: parsedData.explanation,
          synonyms: parsedData.synonyms,
          antonyms: parsedData.antonyms,
          sentences: parsedData.sentences,
          imageUrl: savedImageUrl // Response me frontend ko URL bhej diya
        },
      });
    } else {
      throw new Error("Invalid response structure from Gemini.");
    }
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    return res.status(503).json({ success: false, message: "AI Engine fail ho gaya!" });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userHistory = await Vocab.find({ userId }).sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, data: userHistory });
  } catch (error) {
    return res.status(500).json({ success: false, message: "DB History fetch nahi ho payi!" });
  }
});

module.exports = router;
