const express = require('express');
const router = express.Router();
const Chapter = require('../../models/english/Course');

// 1. App ke liye data fetch karne ka route
router.get('/syllabus', async (req, res) => {
  try {
    const chapters = await Chapter.find();
    
    // Frontend ke requirement ke hisaab se data format karna
    const courseDatabase = {
      grammar: chapters.filter(ch => ch.category === 'grammar'),
      realLife: chapters.filter(ch => ch.category === 'realLife')
    };
    
    res.json(courseDatabase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Admin Panel se naya Chapter + Lesson add karne ka route
router.post('/add-chapter', async (req, res) => {
  try {
    const newChapter = new Chapter(req.body);
    await newChapter.save();
    res.status(201).json({ message: "Chapter Added Successfully!", chapter: newChapter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;