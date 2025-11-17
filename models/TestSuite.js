const mongoose = require('mongoose');

const testStepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  instruction: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, { _id: false });

const testSuiteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  steps: [testStepSchema],
  variables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variable'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
testSuiteSchema.index({ name: 1, createdAt: -1 });

module.exports = mongoose.model('TestSuite', testSuiteSchema);
