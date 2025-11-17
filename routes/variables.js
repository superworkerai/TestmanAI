const express = require('express');
const router = express.Router();
const Variable = require('../models/Variable');
const { encrypt, decrypt } = require('../utils/encryption');

// GET all variables (without decrypted values)
router.get('/', async (req, res) => {
  try {
    const variables = await Variable.find()
      .select('name description isSensitive createdAt updatedAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: variables
    });
  } catch (error) {
    console.error('Error fetching variables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variables'
    });
  }
});

// GET single variable by ID (without decrypted value)
router.get('/:id', async (req, res) => {
  try {
    const variable = await Variable.findById(req.params.id)
      .select('name description isSensitive createdAt updatedAt');

    if (!variable) {
      return res.status(404).json({
        success: false,
        error: 'Variable not found'
      });
    }

    res.json({
      success: true,
      data: variable
    });
  } catch (error) {
    console.error('Error fetching variable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variable'
    });
  }
});

// POST create new variable
router.post('/', async (req, res) => {
  try {
    const { name, value, description, isSensitive } = req.body;

    // Validate required fields
    if (!name || !value) {
      return res.status(400).json({
        success: false,
        error: 'Name and value are required'
      });
    }

    // Check if variable name already exists
    const existingVariable = await Variable.findOne({ name });
    if (existingVariable) {
      return res.status(400).json({
        success: false,
        error: 'Variable with this name already exists'
      });
    }

    // Encrypt the value
    const { encryptedValue, iv } = encrypt(value);

    const variable = new Variable({
      name,
      description,
      encryptedValue,
      iv,
      isSensitive: isSensitive !== false // Default to true
    });

    await variable.save();

    // Return variable without encrypted data
    res.status(201).json({
      success: true,
      data: {
        _id: variable._id,
        name: variable.name,
        description: variable.description,
        isSensitive: variable.isSensitive,
        createdAt: variable.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating variable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create variable'
    });
  }
});

// PUT update variable
router.put('/:id', async (req, res) => {
  try {
    const { name, value, description, isSensitive } = req.body;

    const variable = await Variable.findById(req.params.id);

    if (!variable) {
      return res.status(404).json({
        success: false,
        error: 'Variable not found'
      });
    }

    // Update name if provided and different
    if (name && name !== variable.name) {
      // Check if new name already exists
      const existingVariable = await Variable.findOne({ name });
      if (existingVariable) {
        return res.status(400).json({
          success: false,
          error: 'Variable with this name already exists'
        });
      }
      variable.name = name;
    }

    // Update value if provided
    if (value) {
      const { encryptedValue, iv } = encrypt(value);
      variable.encryptedValue = encryptedValue;
      variable.iv = iv;
    }

    // Update other fields
    if (description !== undefined) variable.description = description;
    if (isSensitive !== undefined) variable.isSensitive = isSensitive;

    await variable.save();

    res.json({
      success: true,
      data: {
        _id: variable._id,
        name: variable.name,
        description: variable.description,
        isSensitive: variable.isSensitive,
        updatedAt: variable.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating variable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update variable'
    });
  }
});

// DELETE variable
router.delete('/:id', async (req, res) => {
  try {
    const variable = await Variable.findByIdAndDelete(req.params.id);

    if (!variable) {
      return res.status(404).json({
        success: false,
        error: 'Variable not found'
      });
    }

    res.json({
      success: true,
      message: 'Variable deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting variable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete variable'
    });
  }
});

module.exports = router;
