
// routes/myBucketRoutes.js
const express = require('express');
const router = express.Router();
const MyBucket = require('../../models/english/MyBucket'); // Path check kar lena

// POST: Save a new word from the script
router.post('/add-vocab', async (req, res) => {
  try {
    const { word, context, source, userEmail } = req.body;
    
    if (!word || !context) {
      return res.status(400).json({ success: false, message: "Word and context are required" });
    }

    const newVocab = new MyBucket({ word, context, source, userEmail });
    await newVocab.save();

    res.status(201).json({ success: true, message: `Successfully added '${word}' to DB!` });
  } catch (error) {
    console.error("MyBucket Route Error:", error);
    res.status(500).json({ success: false, message: "Server error while saving word" });
  }
});

// GET: Fetch all words (For later use in your app)
router.get('/get-vocab', async (req, res) => {
  try {
    const words = await MyBucket.find().sort({ addedAt: -1 });
    res.status(200).json({ success: true, data: words });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching words" });
  }
});

module.exports = router;