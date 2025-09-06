const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const Response = require('../models/Response');

// Helper function to generate unique invite code
async function generateUniqueInviteCode() {
  let inviteCode;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    // Generate 8-character alphanumeric code
    inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Ensure it's 8 characters (pad if needed)
    while (inviteCode.length < 8) {
      inviteCode += Math.random().toString(36).charAt(2).toUpperCase();
    }
    inviteCode = inviteCode.substring(0, 8);
    
    // Check if code already exists
    const existingGroup = await Group.findOne({ inviteCode });
    if (!existingGroup) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Could not generate unique invite code');
  }
  
  return inviteCode;
}

// Get all groups for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'groups',
        populate: {
          path: 'members',
          select: 'username'
        }
      });
    
    res.json(user.groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error fetching groups' });
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // Generate unique invite code
    const inviteCode = await generateUniqueInviteCode();
    
    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      inviteCode,
      createdBy: req.user._id,
      members: [req.user._id]
    });
    
    await group.save();
    
    // Add group to user's groups array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });
    
    // Populate the group with member details
    await group.populate('members', 'username');
    
    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error creating group' });
  }
});

// Join a group using invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }
    
    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    // Check if user is already a member
    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }
    
    // Add user to group
    group.members.push(req.user._id);
    await group.save();
    
    // Add group to user's groups array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });
    
    // Populate the group with member details
    await group.populate('members', 'username');
    
    res.json({
      message: 'Successfully joined group',
      group
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Server error joining group' });
  }
});

// Get specific group details
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username')
      .populate('createdBy', 'username');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Server error fetching group' });
  }
});

// Toggle favorite status for a group
router.put('/:id/favorite', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    
    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }
    
    const user = await User.findById(userId);
    const isFavorite = user.favoriteGroups.includes(groupId);
    
    if (isFavorite) {
      // Remove from favorites
      user.favoriteGroups = user.favoriteGroups.filter(
        id => id.toString() !== groupId.toString()
      );
    } else {
      // Add to favorites
      user.favoriteGroups.push(groupId);
    }
    
    await user.save();
    
    res.json({
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      isFavorite: !isFavorite
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Server error toggling favorite' });
  }
});

// Leave a group
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }
    
    // Remove user from group
    group.members = group.members.filter(
      memberId => memberId.toString() !== userId.toString()
    );
    await group.save();
    
    // Remove group from user's groups and favorites
    await User.findByIdAndUpdate(userId, {
      $pull: { 
        groups: groupId,
        favoriteGroups: groupId
      }
    });
    
    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Server error leaving group' });
  }
});

// Add this route to your routes/groups.js file
router.get('/:id/activity', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000); // Default to 1 minute ago
    
    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check for new responses since the last check
    const newResponses = await Response.find({
      groupId: groupId,
      createdAt: { $gt: since }
    }).populate('userId', 'username');
    
    // Check for new likes/replies since the last check
    const updatedResponses = await Response.find({
      groupId: groupId,
      $or: [
        { 'likes.createdAt': { $gt: since } },
        { 'replies.createdAt': { $gt: since } }
      ]
    }).populate('userId', 'username');
    
    const hasNewActivity = newResponses.length > 0 || updatedResponses.length > 0;
    let message = '';
    
    if (newResponses.length > 0) {
      message = `${newResponses[0].userId.username} shared a new response`;
    } else if (updatedResponses.length > 0) {
      message = 'New likes and replies in your group';
    }
    
    res.json({
      hasNewActivity,
      message,
      newResponses: newResponses.length,
      updatedResponses: updatedResponses.length
    });
    
  } catch (error) {
    console.error('Activity check error:', error);
    res.status(500).json({ error: 'Server error checking activity' });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Groups routes working!' });
});

module.exports = router;