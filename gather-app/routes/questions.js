// routes/questions.js (Updated)
const express = require('express');
const Question = require('../models/Question');
const auth = require('../middleware/auth');

const router = express.Router();

// Get today's question
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let question = await Question.findOne({
      date: today,
      isActive: true
    });
    
    // If no question exists for today, create a default one
    if (!question) {
      const defaultQuestions = [
        "What's the best thing that happened to you this week?",
        "If you could have dinner with anyone, who would it be and why?",
        "What's your favorite childhood memory?",
        "What's something new you learned recently?",
        "What's your go-to comfort food?",
        "If you could travel anywhere right now, where would you go?",
        "What's the last book or movie that really impressed you?",
        "What's something you're looking forward to?",
        "What's the best advice you've ever received?",
        "What's your favorite way to spend a lazy Sunday?"
      ];
      
      const randomQuestion = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
      
      question = new Question({
        text: randomQuestion,
        date: today,
        category: 'general'
      });
      
      await question.save();
    }
    
    res.json(question);
  } catch (error) {
    console.error('Get today\'s question error:', error);
    res.status(500).json({ error: 'Server error fetching question' });
  }
});

// Create a new question (admin function for now)
router.post('/', auth, async (req, res) => {
  try {
    const { text, category, date } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    const questionDate = date ? new Date(date) : new Date();
    questionDate.setHours(0, 0, 0, 0);
    
    const question = new Question({
      text: text.trim(),
      category: category || 'general',
      date: questionDate
    });
    
    await question.save();
    
    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A question already exists for this date' });
    }
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Server error creating question' });
  }
});

// Get questions history
router.get('/history', async (req, res) => {
  try {
    const questions = await Question.find({ isActive: true })
      .sort({ date: -1 })
      .limit(30);
    
    res.json(questions);
  } catch (error) {
    console.error('Get questions history error:', error);
    res.status(500).json({ error: 'Server error fetching questions history' });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Questions routes working!' });
});

module.exports = router;

// ---
