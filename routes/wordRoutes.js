const express = require("express");
const router = express.Router();
const axios = require("axios"); // Axios import kiya safely

router.post("/define", async (req, res) => {
  const { word, type } = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss!" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "Server error: GEMINI_API_KEY missing in Env configuration." });
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

  // Axios based network caller configuration
  const callGeminiDirectly = async (modelName) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema
      }
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
      const rawText = response.data.candidates[0].content.parts[0].text;
      return JSON.parse(rawText.trim());
    } else {
      throw new Error("Invalid response format from Google API structure.");
    }
  };

  try {
    // Attempt 1: Gemini 2.5 Flash
    console.log("🔄 Attempting 2.5 Flash via Axios Network Call...");
    const parsedData = await callGeminiDirectly("gemini-2.5-flash");
    const finalData = type === "meaning" ? parsedData.meaning : (parsedData.sentence || parsedData.sentences);
    return res.json({ success: true, data: finalData });

  } catch (error) {
    // Extract actual response details safely from Axios metrics
    const statusCode = error.response ? error.response.status : "Local Context";
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    
    console.error(`❌ 2.5 Flash Failed [Status ${statusCode}]:`, errorDetails);
    console.log(`⚠️ Falling back to Gemini 1.5 Flash 8B core...`);
    
    try {
      // Attempt 2: Gemini 1.5 Flash 8b
      const parsedDataBackup = await callGeminiDirectly("gemini-1.5-flash-8b");
      const finalDataBackup = type === "meaning" ? parsedDataBackup.meaning : (parsedDataBackup.sentence || parsedDataBackup.sentences);
      return res.json({ success: true, data: finalDataBackup });

    } catch (backupError) {
      const backupStatusCode = backupError.response ? backupError.response.status : "Local Context";
      const backupDetails = backupError.response ? JSON.stringify(backupError.response.data) : backupError.message;
      
      console.error(`❌ 1.5 Flash 8B Failed [Status ${backupStatusCode}]:`, backupDetails);
      console.log("🔥 All free tier engine pools failed.");
      
      return res.status(503).json({ 
        success: false, 
        message: "Google Server load peak par hai ya key limited hai. Please thodi der baad try karein!" 
      });
    }
  }
});

module.exports = router;