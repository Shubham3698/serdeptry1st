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
    const rawText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText.trim());
  };

  try {
    // Attempt 1: Gemini 2.5 Flash
    console.log("🔄 Attempting 2.5 Flash via Direct HTTP...");
    const parsedData = await callGeminiDirectly("gemini-2.5-flash");
    const finalData = type === "meaning" ? parsedData.meaning : (parsedData.sentence || parsedData.sentences);
    return res.json({ success: true, data: finalData });

  } catch (error) {
    console.error("❌ 2.5 Flash Failed:", error.message);
    console.log(`⚠️ Trying 2.0 Flash stable pool wrapper...`);
    
    try {
      // Attempt 2: Gemini 2.0 Flash (Alag free limit tier aur 100% active endpoint)
      const parsedDataBackup = await callGeminiDirectly("gemini-2.0-flash");
      const finalDataBackup = type === "meaning" ? parsedDataBackup.meaning : (parsedDataBackup.sentence || parsedDataBackup.sentences);
      return res.json({ success: true, data: finalDataBackup });

    } catch (backupError) {
      console.error("❌ 2.0 Flash Failed:", backupError.message);
      console.log("⚠️ Trying Gemini 2.0 Flash Experimental pool...");

      try {
        // Attempt 3: Gemini 2.0 Flash Exp (Bypass quota restrictions via test pipeline)
        const parsedDataExp = await callGeminiDirectly("gemini-2.0-flash-exp");
        const finalDataExp = type === "meaning" ? parsedDataExp.meaning : (parsedDataExp.sentence || parsedDataExp.sentences);
        return res.json({ success: true, data: finalDataExp });

      } catch (expError) {
        console.error("🔥 All free tier pipelines exhausted:", expError.message);
        return res.status(503).json({ 
          success: false, 
          message: "Aapka daily free limit khatam ho gya hai ya Google side down hai. Please thodi der baad try karein!" 
        });
      }
    }
  }
});

module.exports = router;