// models/Question.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['friends', 'family', 'general'],
    default: 'general'
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Ensure only one active question per day
questionSchema.index({ date: 1, isActive: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);

// ---