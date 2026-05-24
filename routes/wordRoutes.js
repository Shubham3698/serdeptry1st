const express = require("express");
const router = express.Router();

const axios = require("axios");

const Vocab = require("../models/Word");



// 🔥 WORD ANALYZE ROUTE

router.post("/define", async (req, res) => {

  const { word, userId } = req.body;



  // ✅ Validation

  if (!word || !word.trim()) {

    return res.status(400).json({
      success: false,
      message: "Word missing hai boss! ✍️",
    });

  }

  if (!userId) {

    return res.status(400).json({
      success: false,
      message: "User session missing!",
    });

  }



  // ✅ API KEY

  let apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {

    return res.status(500).json({
      success: false,
      message: "Server error: API Key missing.",
    });

  }

  apiKey = String(apiKey)
    .replace(/[\r\n\t\s'"]/g, "")
    .trim();


// ✅ AI PROMPT

const promptText = `
You are an elite English vocabulary coach.

Analyze the English word "${word.trim()}".

Return ONLY valid JSON object.

Rules:

1. "partOfSpeech"
- Give exact grammar category
- Example:
  Noun
  Verb
  Adjective
  Adverb

2. "meaning"
- Give short Hindi meaning in Devanagari

3. "explanation"
- Explain in very simple Hinglish
- Explain kab aur kaha use hota hai
- Keep it short and practical
- Maximum 2 short lines only

4. "synonyms"
- Give minimum 8 synonyms
- Comma separated
- Only English words

5. "antonyms"
- Give minimum 6 antonyms
- Comma separated
- Only English words

6. "sentences"
- Give 3 practical daily life sentences
- Each sentence should contain Hindi translation in brackets
- Use \\n for line breaks

Important:
- Response must be valid JSON only
- Do not return markdown
- Do not return extra text
`;

  // ✅ STRICT JSON SCHEMA

  const jsonSchema = {

    type: "object",

    properties: {

      partOfSpeech: {
        type: "string",
      },

      meaning: {
        type: "string",
      },

      explanation: {
        type: "string",
      },

      synonyms: {
        type: "string",
      },

      antonyms: {
        type: "string",
      },

      sentences: {
        type: "string",
      },

    },

    required: [
      "partOfSpeech",
      "meaning",
      "explanation",
      "synonyms",
      "antonyms",
      "sentences",
    ],

  };



  try {

    console.log(`🔄 Analyzing: ${word.trim()}...`);



    const queryParams = new URLSearchParams({
      key: apiKey,
    });



    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?${queryParams.toString()}`;



    const payload = {

      contents: [
        {
          parts: [
            {
              text: promptText,
            },
          ],
        },
      ],

      generationConfig: {

        responseMimeType: "application/json",

        responseSchema: jsonSchema,

      },

    };



    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );



    // ✅ RESPONSE VALIDATION

    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0].content.parts[0].text
    ) {

      const rawText =
        response.data.candidates[0].content.parts[0].text;



      const parsedData = JSON.parse(rawText.trim());



      const targetWord = word.trim().toLowerCase();



      // ✅ REMOVE OLD SAME WORD

      await Vocab.deleteOne({
        userId,
        word: targetWord,
      });



      // ✅ SAVE NEW WORD

      const newVocabEntry = new Vocab({

        userId,

        word: targetWord,

        partOfSpeech: parsedData.partOfSpeech,

        meaning: parsedData.meaning,

        explanation: parsedData.explanation,

        synonyms: parsedData.synonyms,

        antonyms: parsedData.antonyms,

        sentences: parsedData.sentences,

      });



      await newVocabEntry.save();



      // ✅ SEND RESPONSE

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

        },

      });

    } else {

      throw new Error("Invalid response structure from Gemini.");

    }

  } catch (error) {

    const errorDetails = error.response
      ? JSON.stringify(error.response.data)
      : error.message;



    console.error("❌ Gemini API Error:", errorDetails);



    return res.status(503).json({

      success: false,

      message: "AI Engine fail ho gaya ya schema invalid hai!",

    });

  }

});



// 🔥 HISTORY FETCH ROUTE

router.get("/history/:userId", async (req, res) => {

  try {

    const { userId } = req.params;



    const userHistory = await Vocab.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);



    return res.json({
      success: true,
      data: userHistory,
    });

  } catch (error) {

    console.error("❌ History Error:", error.message);



    return res.status(500).json({

      success: false,

      message: "DB History fetch nahi ho payi!",

    });

  }

});



module.exports = router;