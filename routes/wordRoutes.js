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

  // Common helper function for clean calling
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
    // Attempt 1: Gemini 2.5 Flash (Pehele priority, super fast)
    console.log("🔄 Attempting 2.5 Flash...");
    const parsedData = await tryModelFetch("gemini-2.5-flash");
    return res.json({ success: true, data: type === "meaning" ? parsedData.meaning : parsedData.sentence });

  } catch (error) {
    console.log("⚠️ 2.5 Flash busy, trying 1.5 Flash backup...");
    
    try {
      // Attempt 2: Gemini 1.5 Flash (Yeh API Key par 100% chalta hai aur stable hai)
      const parsedDataBackup = await tryModelFetch("gemini-1.5-flash");
      return res.json({ success: true, data: type === "meaning" ? parsedDataBackup.meaning : parsedDataBackup.sentence });

    } catch (backupError) {
      console.log("⚠️ 1.5 Flash rate limited, trying 2.0 Flash Exp pool...");
      
      try {
        // Attempt 3: Gemini 2.0 Flash Exp (Normal API Key supported alternate pool)
        const parsedDataExp = await tryModelFetch("gemini-2.0-flash-exp");
        return res.json({ success: true, data: type === "meaning" ? parsedDataExp.meaning : parsedDataExp.sentence });

      } catch (expError) {
        console.error("🔥 All Google AI Free Key routes temporary exhausted:", expError);
        
        // Final response jab bilkul hi server dead ho
        return res.status(503).json({ 
          success: false, 
          message: "Google API Server abhi bohot heavy load par hai. Kripya 5 second baad firse click karein!" 
        });
      }
    }
  }
});

module.exports = router;