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

// 3. Update Existing Chapter
router.put('/update-chapter/:id', async (req, res) => {
  try {
    const updatedChapter = await Chapter.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Ye naya updated data return karega
    );
    res.status(200).json({ message: "Chapter Updated Successfully!", chapter: updatedChapter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Chapter
router.delete('/delete-chapter/:id', async (req, res) => {
  try {
    await Chapter.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Chapter Deleted Successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;