const mongoose = require('mongoose');

const variableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  encryptedValue: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true // Initialization vector for AES encryption
  },
  isSensitive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
variableSchema.index({ name: 1 });

// Virtual field to indicate this is an encrypted variable
variableSchema.virtual('isEncrypted').get(function() {
  return true;
});

module.exports = mongoose.model('Variable', variableSchema);
