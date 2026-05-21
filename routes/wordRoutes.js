const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/define", async (req, res) => {
  const { word, type } = req.body;

  // 1. Basic Validation
  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss! ✍️" });
  }

  // 2. Fetch API Key and Sanitize
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "Server configuration error: GEMINI_API_KEY missing in .env" });
  }
  
  // Key ke aage-piche se saare hidden spaces, invisible characters aur quotes hatane ke liye
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

  let promptText = "";
  let jsonSchema = {};

  // 3. Setup Prompt and Schema based on Type
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

  // 4. Axios Request to Google Gemini Matrix
  try {
    console.log("🔄 Contacting Google Gemini 2.5 Flash Network Matrix...");
    
    const queryParams = new URLSearchParams({ key: apiKey });
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?" + queryParams.toString();
    
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
      const parsedData = JSON.parse(rawText.trim());
      
      const finalData = type === "meaning" ? parsedData.meaning : (parsedData.sentence || parsedData.sentences);
      return res.json({ success: true, data: finalData });
    } else {
      throw new Error("Invalid structure response from Google Cluster Node.");
    }

  } catch (error) {
    const statusCode = error.response ? error.response.status : "Local Context";
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    
    console.error("❌ Gemini Engine Failed [Status " + statusCode + "]:", errorDetails);
    return res.status(503).json({ 
      success: false, 
      message: "Google Server load par hai ya daily quota exhausted hai. Key change karein!" 
    });
  }
});

module.exports = router;