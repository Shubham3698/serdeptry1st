const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post("/define", async (req, res) => {
  const { word, type } = req.body; // type can be "meaning" or "sentence"

  if (!word || !word.trim()) {
    return res.status(400).json({ success: false, message: "Word missing hai boss!" });
  }

  let promptText = "";
  let jsonSchema = {};

  // Operational Split based on User click focus
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    return res.json({
      success: true,
      data: type === "meaning" ? parsedData.meaning : parsedData.sentence
    });

  } catch (error) {
    console.log("⚠️ Flash model busy, hitting 1.5 backup...");
    try {
      const backupResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: jsonSchema
        }
      });

      const parsedDataBackup = JSON.parse(backupResponse.text.trim());
      return res.json({
        success: true,
        data: type === "meaning" ? parsedDataBackup.meaning : parsedDataBackup.sentence
      });
    } catch (backupError) {
      console.error("🔥 Gemini Fatal:", backupError);
      return res.status(503).json({ success: false, message: "Google Server busy!" });
    }
  }
});

module.exports = router;