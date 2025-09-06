// models/Response.js
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  text: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  photoUrl: {
    type: String
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Ensure one response per user per question per group -- taking this constraint out for now
//responseSchema.index({ groupId: 1, userId: 1, questionId: 1 }, { unique: true });

// Helper method to check if user liked this response
responseSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Helper method to get like count
responseSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Helper method to get reply count
responseSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Include virtual fields in JSON output
responseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Response', responseSchema);