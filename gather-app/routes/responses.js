// routes/responses.js (Updated)
const express = require('express');
const Response = require('../models/Response');
const Question = require('../models/Question');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();

// Get responses for a group and question
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { questionId } = req.query;
    
    // Verify user is member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }
    
    // If no questionId provided, get today's question
    let question;
    if (questionId) {
      question = await Question.findById(questionId);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      question = await Question.findOne({ date: today, isActive: true });
    }
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get all responses for this group and question
    const responses = await Response.find({
      groupId,
      questionId: question._id
    })
    .populate('userId', 'username')
    .populate('replies.userId', 'username')
    .sort({ createdAt: 1 });
    
    res.json({
      question,
      responses
    });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ error: 'Server error fetching responses' });
  }
});

// Submit a response
router.post('/', auth, async (req, res) => {
  try {
    const { groupId, questionId, text, photoUrl } = req.body;
    
    // Validation
    if (!groupId || !questionId) {
      return res.status(400).json({ error: 'Group ID and Question ID are required' });
    }
    
    if (!text && !photoUrl) {
      return res.status(400).json({ error: 'Either text or photo is required' });
    }
    
    // Verify user is member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }
    
    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Check if user already responded to this question in this group
    const existingResponse = await Response.findOne({
      groupId,
      userId: req.user._id,
      questionId
    });
    
    if (existingResponse) {
      return res.status(400).json({ error: 'You have already responded to this question' });
    }
    
    // Create response
    const response = new Response({
      groupId,
      userId: req.user._id,
      questionId,
      text: text?.trim(),
      photoUrl
    });
    
    await response.save();
    
    // Populate user info
    await response.populate('userId', 'username');
    
    res.status(201).json({
      message: 'Response submitted successfully',
      response
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Server error submitting response' });
  }
});

// Like/unlike a response
router.put('/:responseId/like', auth, async (req, res) => {
  try {
    const { responseId } = req.params;
    const userId = req.user._id;
    
    const response = await Response.findById(responseId);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    // Verify user is member of the group
    const group = await Group.findById(response.groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if user already liked this response
    const likeIndex = response.likes.findIndex(like => like.userId.toString() === userId.toString());
    
    if (likeIndex > -1) {
      // Remove like
      response.likes.splice(likeIndex, 1);
    } else {
      // Add like
      response.likes.push({ userId });
    }
    
    await response.save();
    
    res.json({
      message: likeIndex > -1 ? 'Like removed' : 'Like added',
      isLiked: likeIndex === -1,
      likeCount: response.likes.length
    });
  } catch (error) {
    console.error('Like response error:', error);
    res.status(500).json({ error: 'Server error updating like' });
  }
});

// Add a reply to a response
router.post('/:responseId/reply', auth, async (req, res) => {
  try {
    const { responseId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    
    const response = await Response.findById(responseId);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    // Verify user is member of the group
    const group = await Group.findById(response.groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add reply
    response.replies.push({
      userId,
      text: text.trim()
    });
    
    await response.save();
    
    // Populate the new reply
    await response.populate('replies.userId', 'username');
    
    // Get the newly added reply
    const newReply = response.replies[response.replies.length - 1];
    
    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ error: 'Server error adding reply' });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Responses routes working!' });
});

module.exports = router;