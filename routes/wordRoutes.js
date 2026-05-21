const express = require("express");
const router = express.Router();

router.post("/define", async (req, res) => {
  const { word, type } = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss!" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "Server configuration error: API Key missing." });
  }

  let promptText = "";
  let jsonSchema = {};

  if (type === "meaning") {
    promptText = `You are an elite English vocabulary coach. For the word "${word.trim()}", give the most popular, clear, and extremely easy meaning written completely in Hindi script (Devanagari). Use words that common Indian people use daily.`;
    jsonSchema = {
      type: "OBJECT",
      properties: { meaning: { type: "STRING" } },
      required: ["meaning"]
    };
  } else if (type === "sentence") {
    promptText = `You are an elite English vocabulary coach. For the word "${word.trim()}", provide exactly 3 to 4 factual, highly practical example sentences used in normal daily life. Below each English sentence, write its Hindi translation in brackets. Use newlines between separate examples.`;
    jsonSchema = {
      type: "OBJECT",
      properties: { sentence: { type: "STRING" } },
      required: ["sentence"]
    };
  }

  // Pure Native Fetch Wrapper for Gemini API
  const callGeminiDirectly = async (modelName) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google API Error [${response.status}]: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Parse the standard Gemini text response
    const rawText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText.trim());
  };

  try {
    // Attempt 1: Gemini 2.5 Flash
    console.log("🔄 Attempting 2.5 Flash via Direct HTTP...");
    const parsedData = await callGeminiDirectly("gemini-2.5-flash");
    return res.json({ success: true, data: type === "meaning" ? parsedData.meaning : parsedData.sentence });

  } catch (error) {
    console.log(`⚠️ 2.5 Flash failed/busy, trying 1.5 Flash backup...`);
    
    try {
      // Attempt 2: Gemini 1.5 Flash
      const parsedDataBackup = await callGeminiDirectly("gemini-1.5-flash");
      return res.json({ success: true, data: type === "meaning" ? parsedDataBackup.meaning : parsedDataBackup.sentence });

    } catch (backupError) {
      console.log("🔥 Both models failed direct network call.");
      return res.status(503).json({ 
        success: false, 
        message: "Google AI server abhi busy hai. Kripya 3-5 second baad firse try karein!" 
      });
    }
  }
});

module.exports = router;