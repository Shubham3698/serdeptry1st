const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: String,
  duration: String,
  videoId: String,
  // 🔴 Unlimited Live Video Quizzes (Direct MCQ)
  videoQuizzes: [{
    time: Number, 
    question: String,
    options: [String], // [A, B, C, D]
    correct: Number // 0, 1, 2, ya 3
  }],
  // 🔴 Unlimited Standalone Quick Tests
  standaloneQuiz: [{
    q: String,
    o: [String],
    c: Number
  }],
  speakingData: {
    hindi: String,
    english: String
  }
});

const ChapterSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  category: { type: String, enum: ['grammar', 'realLife'] },
  lessons: [LessonSchema]
});

module.exports = mongoose.model('Chapter', ChapterSchema);