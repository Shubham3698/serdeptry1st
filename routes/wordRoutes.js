const express = require("express");
const router = express.Router();
const translate = require("google-translate-api-next");
const axios = require("axios");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/search-live", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false });

    const searchWord = q.trim();
    console.log("🔍 Searching for:", searchWord);

    // 1️⃣ Hindi Meaning
    let hindiMeaning = "";
    try {
      const translation = await translate(searchWord, { to: "hi" });
      hindiMeaning = translation.text;
    } catch (e) {
      hindiMeaning = "Meaning not found";
    }

    // 2️⃣ Dictionary
    let grammarType = "Word";
    let definition = "";
    try {
      const dictRes = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`
      );
      grammarType = dictRes.data[0].meanings[0].partOfSpeech;
      definition =
        dictRes.data[0].meanings[0].definitions[0].definition;
    } catch (e) {
      console.log("Dict API error");
    }

    // 3️⃣ 🔥 OPENAI GPT SENTENCES
    let exampleSentences = [];
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // fast + cheap + best for this
        messages: [
          {
            role: "system",
            content:
              "You generate simple English sentences for vocabulary learners.",
          },
          {
            role: "user",
            content: `Give exactly 3 short and simple sentences using the word "${searchWord}". 
Rules:
- No numbering
- No bullet points
- Each sentence in new line
- Easy English`,
          },
        ],
        temperature: 0.7,
      });

      const aiText = completion.choices[0].message.content;

      exampleSentences = aiText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 5)
        .slice(0, 3);

      console.log("✅ OpenAI Success!");
    } catch (err) {
      console.error("🚨 OpenAI Error:", err.message);
      exampleSentences = [];
    }

    res.json({
      success: true,
      word: searchWord,
      meaning: hindiMeaning,
      grammar: grammarType,
      definition: definition,
      exampleSentences: exampleSentences,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;