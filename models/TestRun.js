const mongoose = require('mongoose');

const testStepResultSchema = new mongoose.Schema({
  stepOrder: {
    type: Number,
    required: true
  },
  instruction: {
    type: String,
    required: true
  },
  playwrightCode: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed', 'skipped'],
    default: 'pending'
  },
  error: {
    message: String,
    stack: String
  },
  duration: {
    type: Number // in milliseconds
  },
  screenshots: [{
    filename: String,
    path: String,
    timestamp: Date
  }],
  startedAt: Date,
  completedAt: Date
}, { _id: false });

const testRunSchema = new mongoose.Schema({
  testSuite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSuite',
    required: true
  },
  testSuiteName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  stepResults: [testStepResultSchema],
  overallResult: {
    type: String,
    enum: ['passed', 'failed', 'partial'],
    default: null
  },
  video: {
    filename: String,
    path: String
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  duration: {
    type: Number // Total duration in milliseconds
  },
  totalSteps: {
    type: Number,
    default: 0
  },
  passedSteps: {
    type: Number,
    default: 0
  },
  failedSteps: {
    type: Number,
    default: 0
  },
  metadata: {
    browserVersion: String,
    platform: String
  }
}, {
  timestamps: true
});

// Index for faster queries
testRunSchema.index({ testSuite: 1, createdAt: -1 });
testRunSchema.index({ status: 1 });

module.exports = mongoose.model('TestRun', testRunSchema);
