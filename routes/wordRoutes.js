const express = require("express");
const router = express.Router();
const translate = require("google-translate-api-next");
const axios = require("axios");

// 🔥 OpenAI wala part poora saaf kar diya hai taaki Render crash na ho

router.get("/search-live", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false });

    const searchWord = q.trim();
    console.log("🔍 Deep Searching for:", searchWord);

    // 1️⃣ Hindi Meaning (Google Translate)
    let hindiMeaning = "";
    try {
      const translation = await translate(searchWord, { to: "hi" });
      hindiMeaning = translation.text;
    } catch (e) {
      hindiMeaning = "Meaning not found";
    }

    // 2️⃣ Dictionary + Examples (Free Dictionary API)
    let grammarType = "Word";
    let definition = "";
    let exampleSentences = [];

    try {
      const dictRes = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`,
        { timeout: 4000 } // 4 seconds timeout taaki server hang na ho
      );

      if (dictRes.data && dictRes.data[0]) {
        const firstEntry = dictRes.data[0];
        const firstMeaning = firstEntry.meanings[0];

        // ✅ Grammar (Noun, Verb, etc.)
        grammarType = firstMeaning.partOfSpeech;

        // ✅ Definition
        definition = firstMeaning.definitions[0].definition;

        // ✅ Examples (API se nikal rahe hain bina OpenAI ke)
        // Hum saare meanings mein se examples nikalenge
        let allExamples = [];
        firstEntry.meanings.forEach((m) => {
          m.definitions.forEach((d) => {
            if (d.example) allExamples.push(d.example);
          });
        });

        // Agar API mein examples hain toh wo lo, warna fallback sentences banao
        if (allExamples.length > 0) {
          exampleSentences = allExamples.slice(0, 3);
        } else {
          exampleSentences = [
            `I can use the word "${searchWord}" in a sentence.`,
            `Do you know what "${searchWord}" means?`,
            `Let's practice the word "${searchWord}" today.`
          ];
        }
      }
    } catch (e) {
      console.log("Dict API error or Word not found in Dictionary");
      definition = "Detailed explanation available in community posts.";
      exampleSentences = [`Check the posts tab to see how to use "${searchWord}".`];
    }

    // --- NOTE: Yahan 'EnglishPost.find' wala logic agar tune dusri file mein rakha hai 
    // toh theek hai, warna related posts ke liye yahan query add karni hogi ---

    res.json({
      success: true,
      word: searchWord,
      meaning: hindiMeaning,
      grammar: grammarType,
      definition: definition,
      exampleSentences: exampleSentences,
    });
  } catch (err) {
    console.error("🚨 Final Route Error:", err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;