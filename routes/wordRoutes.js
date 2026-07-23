const express = require("express");
const router = express.Router();
const axios = require("axios");
const Vocab = require("../models/Word");
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

      // 🔥 PURANI AUR NAYI IMAGES CHECK KARNA (MULTIPLE IMAGES SUPPORT)
      const existingWord = await Vocab.findOne({ userId, word: targetWord });
      
      let savedImageUrls = []; // Array to store multiple images
      let savedSingleImageUrl = ""; // Fallback for older frontend compatibility
      
      if (existingWord) {
        // Naya format check
        if (existingWord.imageUrls && existingWord.imageUrls.length > 0) {
            savedImageUrls = existingWord.imageUrls;
            savedSingleImageUrl = existingWord.imageUrls[0];
        } 
        // Purana format check (agar pehle ek hi image save thi)
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
        imageUrls: savedImageUrls, // 🔥 ARRAY: Saari images save hongi
        imageUrl: savedSingleImageUrl // 🔥 STRING: Purana field bhi maintain kar rahe for safety
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
          imageUrls: savedImageUrls, // Array sent to frontend
          imageUrl: savedSingleImageUrl // String sent to frontend (backward compatibility)
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
    const userHistory = await Vocab.find({ userId }).sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, data: userHistory });
  } catch (error) {
    return res.status(500).json({ success: false, message: "DB History fetch nahi ho payi!" });
  }
});

// 1. Get Due Sentences (Jo aaj practice karne hain)
router.get("/srs/due/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    // Jo sentences ka time aa gaya hai ya pehle se pending hain
    const dueItems = await SentenceReview.find({ 
      userId, 
      nextReviewDate: { $lte: now } 
    }).limit(20); // Ek baar me max 20 review
    
    res.json({ success: true, data: dueItems });
  } catch (err) {
    res.status(500).json({ success: false, message: "Review fetch error" });
  }
});

// 2. Update SRS (Jab user Again/Hard/Good/Easy dabaye)
router.post("/srs/review", async (req, res) => {
  try {
    const { userId, word, hindiSentence, englishSentence, grade } = req.body;
    
    let item = await SentenceReview.findOne({ userId, englishSentence });
    
    if (!item) {
      item = new SentenceReview({ userId, word, hindiSentence, englishSentence });
    }

    // Anki/SuperMemo-2 Basic Algorithm
    if (grade === 'again') {
      item.interval = 0; // Aaj hi wapas aayega (ya kuch minutes me)
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

    // Nayi date set karo
    let nextDate = new Date();
    if (grade === 'again') {
      nextDate.setMinutes(nextDate.getMinutes() + 10); // 10 minute baad wapas
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

// Specific word ki saari mistakes aur SRS records clear karne ke liye
router.delete("/srs/clear-word-mistakes", async (req, res) => {
  try {
    const { userId, word } = req.body;

    if (!userId || !word) {
      return res.status(400).json({ success: false, message: "Missing Data!" });
    }

    // Is word se related saare sentence reviews delete kar do
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

// 3. Get ALL Mistakes (Mistakes Tab ke liye saara data fetch karega)
router.get("/srs/all-mistakes/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Database se user ke saare record nikal lo
    const allMistakes = await SentenceReview.find({ userId });
    
    res.json({ 
      success: true, 
      data: allMistakes 
    });
  } catch (err) {
    console.error("Error fetching all mistakes:", err);
    res.status(500).json({ success: false, message: "Mistakes fetch error" });
  }
});

// 1. Get User Stats (Total Searched, Total Practiced, Total Mistakes)
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Total words searched in dictionary
    const totalSearched = await Vocab.countDocuments({ userId });
    
    // User ke practice stats fetch ya create karo
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

// 2. Update Stats on Every Attempt
router.post("/stats/update", async (req, res) => {
  try {
    const { userId, isCorrect } = req.body;
    
    let stats = await PracticeStats.findOne({ userId });
    if (!stats) {
      stats = new PracticeStats({ userId });
    }

    // Har attempt pe sentence count badhao
    stats.totalPracticed += 1;
    
    // Agar galat jawab diya to mistake count badhao
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

// words.js (Ya tumhara vocab router) me ye naya route add karo
router.post("/generate-practice", async (req, res) => {
  const { word, userId } = req.body;

  if (!word) return res.status(400).json({ success: false, message: "Target word missing hai! 🎯" });
  
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: "API Key missing." });
  
  apiKey = String(apiKey).replace(/[\r\n\t\s'"]/g, "").trim();

  // Prompt specifically designed for distractor game
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

// 🔥 NAYA ROUTE: Image remove/update handle karne ke liye
router.post("/update-images", async (req, res) => {
  try {
    const { word, userId, imageUrls } = req.body;

    if (!word || !userId) {
      return res.status(400).json({ success: false, message: "Missing Data: Word or userId nahi mila!" });
    }

    const targetWord = word.trim().toLowerCase();

    // Purane frontend/format ke liye single imageUrl ko bhi sync kar lo
    const singleImageUrl = (imageUrls && imageUrls.length > 0) ? imageUrls[0] : "";

    // Database me word dhoondo aur image arrays ko overwrite/khali kar do
    const updatedVocab = await Vocab.findOneAndUpdate(
      { word: targetWord, userId: userId },
      { 
        $set: { 
          imageUrls: imageUrls || [], 
          imageUrl: singleImageUrl 
        } 
      },
      { new: true } // Updated data return karega
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

// Ye tumhari file ki aakhri line hogi:
// module.exports = router;

module.exports = router;