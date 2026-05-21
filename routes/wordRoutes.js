const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post("/define", async (req, res) => {
  const { word, type } = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss!" });
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

  // Helper function execution to loop across models if load spikes occur
  const tryModelFetch = async (modelName) => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema
      }
    });
    return JSON.parse(response.text.trim());
  };

  try {
    // Attempt 1: Gemini 2.5 Flash (Super Fast)
    console.log("🔄 Attempting 2.5 Flash...");
    const parsedData = await tryModelFetch("gemini-2.5-flash");
    return res.json({ success: true, data: type === "meaning" ? parsedData.meaning : parsedData.sentence });

  } catch (error) {
    console.log("⚠️ 2.5 Flash busy or down, trying 1.5 Flash backup...");
    
    try {
      // Attempt 2: Gemini 1.5 Flash (Highly Stable)
      const parsedDataBackup = await tryModelFetch("gemini-1.5-flash");
      return res.json({ success: true, data: type === "meaning" ? parsedDataBackup.meaning : parsedDataBackup.sentence });

    } catch (backupError) {
      console.log("⚠️ 1.5 Flash also rate limited, trying 1.5 Pro structural bypass...");
      
      try {
        // Attempt 3: Gemini 1.5 Pro (Free tier alternate pipeline)
        const parsedDataPro = await tryModelFetch("gemini-1.5-pro");
        return res.json({ success: true, data: type === "meaning" ? parsedDataPro.meaning : parsedDataPro.sentence });
        
      } catch (proError) {
        console.error("🔥 All Google AI routes temporary exhausted:", proError);
        // Returns clean 503 so frontend handles state fallback elegantly
        return res.status(503).json({ 
          success: false, 
          message: "Google Server load peaks par hai bhai. Kripya 5 second baad firse touch karein!" 
        });
      }
    }
  }
});

module.exports = router;