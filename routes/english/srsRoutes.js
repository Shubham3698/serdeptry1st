const express = require('express');
const router = express.Router();

// Tumhare models (Path check kar lena agar alag folder mein hain)
const UserSRS = require('../../models/english/UserSRS'); 
const Vocab = require('../../models/Word'); 

router.post('/srs-update', async (req, res) => {
  try {
    const { wordId, rating } = req.body; 

    if (!wordId) {
      return res.status(400).json({ success: false, message: "wordId is missing!" });
    }

    // 1. Original word dhoondo taaki humein word ka text aur userId mil jaye
    const wordDoc = await Vocab.findById(wordId);
    
    if (!wordDoc) {
      console.log(`❌ ERROR: Word ID ${wordId} DB mein nahi mila!`);
      return res.status(404).json({ success: false, message: "Word not found in database" });
    }

    const { userId, word } = wordDoc;

    // 2. SRS DB mein dhoondo, nahi mila toh naya banao (Upsert)
    let srsItem = await UserSRS.findOne({ userId, word });
    if (!srsItem) {
      srsItem = new UserSRS({ userId, word });
    }

    // 3. SM-2 Algorithm Logic
    let { interval, easeFactor, reviewCount } = srsItem;

    if (rating === 'again') {
      interval = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else if (rating === 'hard') {
      interval = interval === 0 ? 1 : interval * 1.2;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
    } else if (rating === 'easy') {
      interval = interval === 0 ? 1 : interval * easeFactor;
      easeFactor += 0.15;
    } else if (rating === 'mastered') { 
      // 🔥 NAYA OPTION: Word completely mastered, SRS se bahar
      interval = 36500; // 100 saal ke liye review postpone
    }

    reviewCount += 1;

    // Calculate next review date
    const nextReview = new Date();
    if (interval === 0) {
      nextReview.setMinutes(nextReview.getMinutes() + 10); // 10 minute baad dobara aayega
    } else {
      nextReview.setDate(nextReview.getDate() + Math.round(interval)); // X din ya 100 saal baad
    }

    // Update & Save to separate collection
    srsItem.nextReviewDate = nextReview;
    srsItem.interval = interval;
    srsItem.easeFactor = easeFactor;
    srsItem.reviewCount = reviewCount;
    
    await srsItem.save();
    
    console.log(`✅ SUCCESS: Separate SRS DB updated for "${word}" [Rating: ${rating}]`);
    res.json({ success: true, srsData: srsItem });

  } catch (error) {
    console.error("SRS Update Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 🔥 NAYA ROUTE: SRS Progress Reset karne ke liye
router.post('/srs-reset', async (req, res) => {
  try {
    const { wordId } = req.body; 

    if (!wordId) return res.status(400).json({ success: false, message: "wordId is missing!" });

    // 1. Original word find karo taaki userId aur word text mil jaye
    const Vocab = require('../../models/Word'); // Path adjust kar lena agar zaroorat ho
    const UserSRS = require('../../models/english/UserSRS'); 

    const wordDoc = await Vocab.findById(wordId);
    if (!wordDoc) return res.status(404).json({ success: false, message: "Word not found" });

    const { userId, word } = wordDoc;

    // 2. SRS DB mein word dhoondo
    let srsItem = await UserSRS.findOne({ userId, word });
    if (!srsItem) {
      srsItem = new UserSRS({ userId, word });
    }

    // 3. Sab kuch ZERO (default) pe set kar do (Turant Due ho jayega)
    srsItem.nextReviewDate = new Date(); // Abhi ke abhi due
    srsItem.interval = 0;
    srsItem.easeFactor = 2.5;
    srsItem.reviewCount = 0;

    await srsItem.save();
    
    console.log(`🔄 SUCCESS: SRS Reset for "${word}"`);
    res.json({ success: true, message: "Progress reset successfully!" });

  } catch (error) {
    console.error("SRS Reset Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;