const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const { startTestRun } = require('../services/playwrightRunner');

// GET all test runs
router.get('/', async (req, res) => {
  try {
    const { status, testSuiteId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (testSuiteId) query.testSuite = testSuiteId;

    const testRuns = await TestRun.find(query)
      .populate('testSuite', 'name description')
      .sort({ createdAt: -1 })
      .limit(50);

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

// GET single test run by ID
router.get('/:id', async (req, res) => {
  try {
    const testRun = await TestRun.findById(req.params.id)
      .populate('testSuite', 'name description steps');

    if (!testRun) {
      return res.status(404).json({
        success: false,
        error: 'Test run not found'
      });
    }

    res.json({
      success: true,
      data: testRun
    });
  } catch (error) {
    console.error('Error fetching test run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test run'
    });
  }
});

// POST start a new test run
router.post('/', async (req, res) => {
  try {
    const { testSuiteId } = req.body;

    if (!testSuiteId) {
      return res.status(400).json({
        success: false,
        error: 'Test suite ID is required'
      });
    }

    // Get the test suite
    const testSuite = await TestSuite.findById(testSuiteId)
      .populate('variables');

    if (!testSuite) {
      return res.status(404).json({
        success: false,
        error: 'Test suite not found'
      });
    }

    if (!testSuite.steps || testSuite.steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Test suite has no steps'
      });
    }

    // Start the test run asynchronously
    const testRun = await startTestRun(testSuite);

    res.status(201).json({
      success: true,
      data: testRun,
      message: 'Test run started successfully'
    });
  } catch (error) {
    console.error('Error starting test run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start test run'
    });
  }
});

// GET test run status (for polling)
router.get('/:id/status', async (req, res) => {
  try {
    const testRun = await TestRun.findById(req.params.id)
      .select('status overallResult passedSteps failedSteps totalSteps duration');

    if (!testRun) {
      return res.status(404).json({
        success: false,
        error: 'Test run not found'
      });
    }

    res.json({
      success: true,
      data: testRun
    });
  } catch (error) {
    console.error('Error fetching test run status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test run status'
    });
  }
});

// DELETE cancel a running test run
router.delete('/:id', async (req, res) => {
  try {
    const testRun = await TestRun.findById(req.params.id);

    if (!testRun) {
      return res.status(404).json({
        success: false,
        error: 'Test run not found'
      });
    }

    if (testRun.status === 'running') {
      testRun.status = 'cancelled';
      testRun.completedAt = new Date();
      await testRun.save();
    }

    res.json({
      success: true,
      message: 'Test run cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling test run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel test run'
    });
  }
});

module.exports = router;
