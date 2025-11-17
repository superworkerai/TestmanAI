const express = require('express');
const router = express.Router();
const TestSuite = require('../models/TestSuite');
const TestRun = require('../models/TestRun');

// GET all test suites
router.get('/', async (req, res) => {
  try {
    const testSuites = await TestSuite.find({ isActive: true })
      .populate('variables', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: testSuites
    });
  } catch (error) {
    console.error('Error fetching test suites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test suites'
    });
  }
});

// GET single test suite by ID
router.get('/:id', async (req, res) => {
  try {
    const testSuite = await TestSuite.findById(req.params.id)
      .populate('variables', 'name description');

    if (!testSuite) {
      return res.status(404).json({
        success: false,
        error: 'Test suite not found'
      });
    }

    res.json({
      success: true,
      data: testSuite
    });
  } catch (error) {
    console.error('Error fetching test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test suite'
    });
  }
});

// POST create new test suite
router.post('/', async (req, res) => {
  try {
    const { name, description, steps, variables } = req.body;

    // Validate required fields
    if (!name || !steps || steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name and at least one step are required'
      });
    }

    // Ensure steps have proper order
    const orderedSteps = steps.map((step, index) => ({
      ...step,
      order: step.order || index + 1
    }));

    const testSuite = new TestSuite({
      name,
      description,
      steps: orderedSteps,
      variables: variables || []
    });

    await testSuite.save();

    res.status(201).json({
      success: true,
      data: testSuite
    });
  } catch (error) {
    console.error('Error creating test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test suite'
    });
  }
});

// PUT update test suite
router.put('/:id', async (req, res) => {
  try {
    const { name, description, steps, variables } = req.body;

    const testSuite = await TestSuite.findById(req.params.id);

    if (!testSuite) {
      return res.status(404).json({
        success: false,
        error: 'Test suite not found'
      });
    }

    // Update fields
    if (name) testSuite.name = name;
    if (description !== undefined) testSuite.description = description;
    if (steps) {
      testSuite.steps = steps.map((step, index) => ({
        ...step,
        order: step.order || index + 1
      }));
    }
    if (variables !== undefined) testSuite.variables = variables;

    await testSuite.save();

    res.json({
      success: true,
      data: testSuite
    });
  } catch (error) {
    console.error('Error updating test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test suite'
    });
  }
});

// DELETE test suite (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const testSuite = await TestSuite.findById(req.params.id);

    if (!testSuite) {
      return res.status(404).json({
        success: false,
        error: 'Test suite not found'
      });
    }

    testSuite.isActive = false;
    await testSuite.save();

    res.json({
      success: true,
      message: 'Test suite deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test suite'
    });
  }
});

// GET test runs for a specific test suite
router.get('/:id/runs', async (req, res) => {
  try {
    const testRuns = await TestRun.find({ testSuite: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: testRuns
    });
  } catch (error) {
    console.error('Error fetching test runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test runs'
    });
  }
});

module.exports = router;
