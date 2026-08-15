  const googleTTS = require('google-tts-api');
  const express = require("express");
  const router = express.Router();
  const axios = require("axios");
  const Vocab = require("../models/Word"); // Ensure yeh path sahi ho
  const PracticeStats = require("../models/english/PracticeStats");
  const SentenceReview = require("../models/english/SentenceReview");

  router.post("/define", async (req, res) => {
    const { word, userId, getAlternative } = req.body;

    if (!word || !word.trim()) return res.status(400).json({ success: false, message: "Word missing hai boss! ✍️" });
    if (!userId) return res.status(400).json({ success: false, message: "User session missing!" });

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: "Server error: API Key missing." });
    
    apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

    const promptText = `
    You are an elite English vocabulary coach. Analyze the English word "${word.trim()}". Return ONLY a valid JSON object.
    Rules:
    1. "partOfSpeech": Give exact grammar category
    2. "meaning": Give short Hindi meaning in Devanagari
    3. "explanation": Explain in very simple Hinglish (max 2 lines)
    4. "synonyms": Give minimum 8 synonyms (Comma separated, English only)
    5. "antonyms": Give minimum 6 antonyms (Comma separated, English only)
    6. "sentences": Give EXACTLY 3 short, single-line factual sentences using this word. STRICTLY NO paragraphs or long explanations. Each sentence must be a brief, bold, and universally true fact. Format exactly like this: "English sentence. (Hindi translation)" separated by \\n.
    Important: Response must be valid JSON only. Do not return markdown.
    `;

    const jsonSchema = {
      type: "object",
      properties: {
        partOfSpeech: { type: "string" },
        meaning: { type: "string" },
        explanation: { type: "string" },
        synonyms: { type: "string" },
        antonyms: { type: "string" },
        sentences: { type: "string" },
      },
      required: ["partOfSpeech", "meaning", "explanation", "synonyms", "antonyms", "sentences"],
    };

    try {
      const queryParams = new URLSearchParams({ key: apiKey });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?${queryParams.toString()}`;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema },
      };

      const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

      if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
        const rawText = response.data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(rawText.trim());
        const targetWord = word.trim().toLowerCase();

        const existingWord = await Vocab.findOne({ userId, word: targetWord });
        
        let savedImageUrls = []; 
        let savedSingleImageUrl = ""; 
        
        if (existingWord) {
          if (existingWord.imageUrls && existingWord.imageUrls.length > 0) {
              savedImageUrls = existingWord.imageUrls;
              savedSingleImageUrl = existingWord.imageUrls[0];
          } 
          else if (existingWord.imageUrl) {
              savedImageUrls = [existingWord.imageUrl];
              savedSingleImageUrl = existingWord.imageUrl;
          }
        }

        await Vocab.deleteOne({ userId, word: targetWord });

        const newVocabEntry = new Vocab({
          userId,
          word: targetWord,
          partOfSpeech: parsedData.partOfSpeech,
          meaning: parsedData.meaning,
          explanation: parsedData.explanation,
          synonyms: parsedData.synonyms,
          antonyms: parsedData.antonyms,
          sentences: parsedData.sentences,
          imageUrls: savedImageUrls, 
          imageUrl: savedSingleImageUrl,
          chatHistory: [] // Nai search pe history blank
        });

        await newVocabEntry.save();

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
            imageUrls: savedImageUrls, 
            imageUrl: savedSingleImageUrl,
            chatHistory: []
          },
        });
      } else {
        throw new Error("Invalid response structure from Gemini.");
      }
    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      return res.status(503).json({ success: false, message: "AI Engine fail ho gaya!" });
    }
  });

  router.get("/history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const userHistory = await Vocab.find({ userId }).sort({ createdAt: -1 });
      return res.json({ success: true, data: userHistory });
    } catch (error) {
      return res.status(500).json({ success: false, message: "DB History fetch nahi ho payi!" });
    }
  });

  // 1. Get Due Sentences
  router.get("/srs/due/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const now = new Date();
      const dueItems = await SentenceReview.find({ 
        userId, 
        nextReviewDate: { $lte: now } 
      }).limit(20); 
      
      res.json({ success: true, data: dueItems });
    } catch (err) {
      res.status(500).json({ success: false, message: "Review fetch error" });
    }
  });

  // 2. Update SRS
  router.post("/srs/review", async (req, res) => {
    try {
      const { userId, word, hindiSentence, englishSentence, grade } = req.body;
      
      let item = await SentenceReview.findOne({ userId, englishSentence });
      
      if (!item) {
        item = new SentenceReview({ userId, word, hindiSentence, englishSentence });
      }

      if (grade === 'again') {
        item.interval = 0; 
        item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
      } else {
        if (item.interval === 0) {
          if (grade === 'hard') item.interval = 1;
          if (grade === 'good') item.interval = 3;
          if (grade === 'easy') item.interval = 5;
        } else {
          if (grade === 'hard') item.interval = item.interval * 1.2;
          if (grade === 'good') item.interval = (item.interval * item.easeFactor);
          if (grade === 'easy') item.interval = (item.interval * item.easeFactor * 1.3);
        }
        item.interval = Math.round(item.interval);
        if (grade === 'easy') item.easeFactor += 0.15;
      }

      let nextDate = new Date();
      if (grade === 'again') {
        nextDate.setMinutes(nextDate.getMinutes() + 10); 
      } else {
        nextDate.setDate(nextDate.getDate() + item.interval);
      }
      
      item.nextReviewDate = nextDate;
      await item.save();

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "SRS update fail" });
    }
  });

  // Clear Word Mistakes
  router.delete("/srs/clear-word-mistakes", async (req, res) => {
    try {
      const { userId, word } = req.body;

      if (!userId || !word) {
        return res.status(400).json({ success: false, message: "Missing Data!" });
      }

      const result = await SentenceReview.deleteMany({ 
        userId, 
        word: { $regex: new RegExp(`^${word}$`, "i") } 
      });

      res.json({ 
        success: true, 
        message: `${word} ki history clear kar di gayi hai!`,
        deletedCount: result.deletedCount 
      });
    } catch (err) {
      console.error("Clear mistakes error:", err);
      res.status(500).json({ success: false, message: "Mistakes clear nahi ho payi!" });
    }
  });

  // 3. Get ALL Mistakes
  router.get("/srs/all-mistakes/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const allMistakes = await SentenceReview.find({ userId });
      res.json({ success: true, data: allMistakes });
    } catch (err) {
      console.error("Error fetching all mistakes:", err);
      res.status(500).json({ success: false, message: "Mistakes fetch error" });
    }
  });

  // Get User Stats
  router.get("/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const totalSearched = await Vocab.countDocuments({ userId });
      
      let stats = await PracticeStats.findOne({ userId });
      if (!stats) {
        stats = await PracticeStats.create({ userId, totalPracticed: 0, totalMistakes: 0 });
      }

      return res.json({ 
        success: true, 
        data: {
          totalSearched,
          totalPracticed: stats.totalPracticed,
          totalMistakes: stats.totalMistakes
        }
      });
    } catch (error) {
      console.error("Stats fetch error:", error);
      return res.status(500).json({ success: false, message: "Stats fetch fail ho gaye!" });
    }
  });

  // Update Stats
  router.post("/stats/update", async (req, res) => {
    try {
      const { userId, isCorrect } = req.body;
      
      let stats = await PracticeStats.findOne({ userId });
      if (!stats) {
        stats = new PracticeStats({ userId });
      }

      stats.totalPracticed += 1;
      if (!isCorrect) {
        stats.totalMistakes += 1;
      }

      await stats.save();
      return res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Stats update error:", error);
      return res.status(500).json({ success: false, message: "Stats update nahi ho paye!" });
    }
  });

  router.post("/generate-practice", async (req, res) => {
    const { word, userId } = req.body;

    if (!word) return res.status(400).json({ success: false, message: "Target word missing hai! 🎯" });
    
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: "API Key missing." });
    
    apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

    const promptText = `
    You are an English teacher creating a sentence building game for the target word "${word}".
    Create a meaningful and practical sentence. Return ONLY a valid JSON object.
    Rules:
    1. "hindiSentence": A simple Hindi sentence using the concept of the target word.
    2. "englishSentence": The exact English translation of the Hindi sentence (without punctuation marks like periods or commas at the end).
    3. "distractors": An array of 4 English words that grammatically fit the sentence but are incorrect (bholane wale words).
    Important: Response must be valid JSON only. Do not return markdown.
    `;

    const jsonSchema = {
      type: "object",
      properties: {
        hindiSentence: { type: "string" },
        englishSentence: { type: "string" },
        distractors: { 
          type: "array",
          items: { type: "string" }
        },
      },
      required: ["hindiSentence", "englishSentence", "distractors"],
    };

    try {
      const queryParams = new URLSearchParams({ key: apiKey });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?${queryParams.toString()}`;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema },
      };

      const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

      if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
        const rawText = response.data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(rawText.trim());

        return res.json({
          success: true,
          data: parsedData,
        });
      } else {
        throw new Error("Invalid response structure from Gemini.");
      }
    } catch (error) {
      console.error("❌ Gemini Practice API Error:", error.message);
      return res.status(503).json({ success: false, message: "Game generate karne me dikkat aayi!" });
    }
  });

  router.post("/update-images", async (req, res) => {
    try {
      const { word, userId, imageUrls } = req.body;

      if (!word || !userId) {
        return res.status(400).json({ success: false, message: "Missing Data: Word or userId nahi mila!" });
      }

      const targetWord = word.trim().toLowerCase();
      const singleImageUrl = (imageUrls && imageUrls.length > 0) ? imageUrls[0] : "";

      const updatedVocab = await Vocab.findOneAndUpdate(
        { word: targetWord, userId: userId },
        { 
          $set: { 
            imageUrls: imageUrls || [], 
            imageUrl: singleImageUrl 
          } 
        },
        { new: true } 
      );

      if (!updatedVocab) {
        return res.status(404).json({ success: false, message: "History me ye word nahi mila!" });
      }

      return res.json({ 
        success: true, 
        message: "Images permanently deleted/updated from DB! 🗑️", 
        data: updatedVocab 
      });

    } catch (error) {
      console.error("❌ Update Images Error:", error);
      return res.status(500).json({ success: false, message: "Database update fail ho gaya!" });
    }
  });

  router.post("/grammar-explain", async (req, res) => {
    const { correctSentence, userSentence } = req.body;

    if (!correctSentence || !userSentence) {
      return res.status(400).json({ success: false, message: "Sentences missing." });
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: "Server error: API Key missing." });
    
    apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

    const promptText = `
      You are an extremely polite, encouraging, and supportive English grammar mentor.
      The correct sentence is: "${correctSentence}"
      The user wrote: "${userSentence}"

      Task: Politely encourage the user, notice their grammatical fault, and introduce the correct grammar rule as a factual learning point.
      
      CRITICAL RULES:
      1. Start with a very short, polite, and encouraging phrase (e.g., "Good try, par...", "Almost correct!...", "Koi baat nahi...").
      2. DO NOT just point out missing or swapped words. Instead, introduce the underlying grammar rule as an interesting fact.
      3. Make it sound like a friendly tip, not a strict lecture. 
      4. Keep it to exactly 2 short sentences. Be concise and empathetic.
      5. Use simple "Hinglish" (A conversational mix of Hindi and English).
      6. DO NOT use any Markdown formatting like bold (**), italics (*), or bullet points. The output will be read aloud by a Text-to-Speech engine.
    `;

    try {
      const queryParams = new URLSearchParams({ key: apiKey });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?${queryParams.toString()}`;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }]
      };

      const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

      if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
        const rawExplanation = response.data.candidates[0].content.parts[0].text.trim();
        const cleanExplanation = rawExplanation.replace(/[\*#_]/g, ''); 
        
        return res.json({ success: true, explanation: cleanExplanation });
      } else {
        throw new Error("Invalid response from Gemini.");
      }
    } catch (error) {
      console.error("❌ AI Tutor Error:", error.message);
      return res.status(503).json({ success: false, message: "AI Engine busy hai boss!" });
    }
  });

  router.post("/speak", async (req, res) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: "Text missing hai!" });
    }

    const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY; 

    if (!GOOGLE_TTS_API_KEY) {
      return res.status(500).json({ success: false, message: "TTS API Key missing! .env check karo." });
    }

    try {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;

      const payload = {
        input: { text: text },
        voice: { languageCode: "en-IN", name: "en-IN-Neural2-D" },
        audioConfig: { 
          audioEncoding: "MP3",
          pitch: -2.0,
          speakingRate: 0.95 
        }
      };

      const response = await axios.post(url, payload);

      if (response.data && response.data.audioContent) {
        return res.json({ success: true, audioBase64: response.data.audioContent });
      } else {
        throw new Error("Failed to generate audio");
      }
    } catch (error) {
      console.error("❌ Google TTS Error:", error.response?.data || error.message);
      return res.status(500).json({ success: false, message: "Aawaz generate nahi ho payi! API Key check karo." });
    }
  });

  router.post("/voice-chat", async (req, res) => {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ success: false, message: "Message zaroori hai" });

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: "Gemini Key missing" });
    apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

    const promptText = `
      You are a friendly and encouraging spoken English tutor. 
      The user is practicing speaking English with you.
      User's message: "${message}"

      Rules for your reply:
      1. Reply exactly like a normal human having a conversation. 
      2. Keep your response short (1 to 3 sentences maximum).
      3. Ask a simple follow-up question at the end.
      4. Gently correct massive grammar mistakes if any, otherwise just chat normally.
      5. DO NOT use any Markdown formatting (* or #). Just plain text.
    `;

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await axios.post(geminiUrl, { contents: [{ parts: [{ text: promptText }] }] });
      
      let aiReplyText = geminiRes.data.candidates[0].content.parts[0].text.trim().replace(/[\*#_]/g, '');

      let audioBase64 = null;
      try {
        audioBase64 = await googleTTS.getAudioBase64(aiReplyText, {
          lang: 'en-IN',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
      } catch (ttsError) {
        console.error("Free TTS Error:", ttsError.message);
      }

      return res.json({ success: true, reply: aiReplyText, audioBase64: audioBase64 });

    } catch (error) {
      console.error("Voice Chat Error:", error.message);
      return res.status(503).json({ success: false, message: "Tutor unavailable" });
    }
  });


  // 🔥 NAYA ROUTE: Word Follow-up Chat (Contextual, saves to DB)
  router.post("/followup-chat", async (req, res) => {
    const { userId, word, message, history } = req.body;

    if (!userId || !word || !message) {
      return res.status(400).json({ success: false, message: "Missing data for chat." });
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: "Gemini Key missing" });
    apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

    // 🧠 REFINED PROMPT: Deep context of the specific word
    const promptText = `
      You are an elite, modern English tutor. We are currently discussing the word: "${word}".
      
      The user is asking a follow-up question or making a statement related to this word:
      User message: "${message}"

      Rules for your response:
      1. Answer the query directly and accurately. Be ready to explain slangs, phrasal verbs, idioms, or grammar rules related to "${word}".
      2. Write in conversational "Hinglish" (a smooth blend of Hindi and English words written in the English alphabet).
      3. Keep it concise, friendly, and easy to understand (max 2-3 sentences).
      4. ABSOLUTELY NO markdown formatting (*, #, _, etc.). Use pure plain text so a TTS engine can read it properly.
    `;

    try {
      // 1. Get Answer from AI
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await axios.post(geminiUrl, { contents: [{ parts: [{ text: promptText }] }] });
      
      let aiReplyText = geminiRes.data.candidates[0].content.parts[0].text.trim().replace(/[\*#_`]/g, '');

      // 2. Generate Audio (Free TTS)
      let audioBase64 = null;
      try {
        audioBase64 = await googleTTS.getAudioBase64(aiReplyText, {
          lang: 'en-IN',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
      } catch (ttsError) {
        console.error("Free TTS Error in Follow-up Chat:", ttsError.message);
      }

      // 3. Save Chat History in DB for this Word & User
      try {
        const vocabDoc = await Vocab.findOne({ userId, word: word.trim().toLowerCase() });
        if (vocabDoc) {
          vocabDoc.chatHistory.push({ role: 'user', text: message });
          vocabDoc.chatHistory.push({ role: 'ai', text: aiReplyText });
          await vocabDoc.save();
        }
      } catch (dbError) {
        console.error("Failed to save chat to DB:", dbError.message);
        // We continue even if DB save fails so user gets response
      }

      return res.json({ success: true, reply: aiReplyText, audioBase64: audioBase64 });

    } catch (error) {
      console.error("Followup Chat Error:", error.message);
      return res.status(503).json({ success: false, message: "AI Teacher unavailable" });
    }
  });

  module.exports = router;