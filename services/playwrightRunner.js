const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const TestRun = require('../models/TestRun');
const Variable = require('../models/Variable');
const { decrypt } = require('../utils/encryption');
const { convertStepsToPlaywright } = require('./openaiService');

/**
 * Creates directory if it doesn't exist
 */
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Replaces variable placeholders in code with actual values
 */
async function replaceVariables(code, variables) {
  let processedCode = code;

  // Find all variable references in the format {{variableName}}
  const variablePattern = /\{\{(\w+)\}\}/g;
  const matches = code.matchAll(variablePattern);

  for (const match of matches) {
    const variableName = match[1];
    const variable = variables.find(v => v.name === variableName);

    if (variable) {
      // Decrypt the variable value
      const decryptedValue = decrypt(variable.encryptedValue, variable.iv);
      // Replace the placeholder with the actual value as a quoted string
      processedCode = processedCode.replace(
        new RegExp(`\\{\\{${variableName}\\}\\}`, 'g'),
        `"${decryptedValue.replace(/"/g, '\\"')}"`
      );
    }
  }

  return processedCode;
}

/**
 * Executes a test run
 */
async function executeTestRun(testRunId, testSuite, steps) {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // Update test run status to running
    const testRun = await TestRun.findByIdAndUpdate(
      testRunId,
      {
        status: 'running',
        startedAt: new Date(),
        totalSteps: steps.length
      },
      { new: true }
    );

    // Create directories for screenshots and videos
    const runDir = path.join(process.cwd(), 'public', 'test-results', testRunId.toString());
    const screenshotsDir = path.join(runDir, 'screenshots');
    const videosDir = path.join(runDir, 'videos');

    await ensureDir(screenshotsDir);
    await ensureDir(videosDir);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create context with video recording
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: videosDir,
        size: { width: 1920, height: 1080 }
      }
    });

    page = await context.newPage();

    // Get browser version and platform info
    const browserVersion = browser.version();
    await TestRun.findByIdAndUpdate(testRunId, {
      'metadata.browserVersion': browserVersion,
      'metadata.platform': process.platform
    });

    // Convert steps to Playwright code
    console.log('Converting steps to Playwright code...');
    const convertedSteps = await convertStepsToPlaywright(steps);

    // Load variables if any
    let variables = [];
    if (testSuite.variables && testSuite.variables.length > 0) {
      variables = await Variable.find({ _id: { $in: testSuite.variables } });
    }

    // Execute each step
    let passedSteps = 0;
    let failedSteps = 0;

    for (let i = 0; i < convertedSteps.length; i++) {
      const step = convertedSteps[i];
      const stepStartTime = Date.now();

      // Update step status to running
      testRun.stepResults[i] = {
        stepOrder: step.order,
        instruction: step.instruction,
        playwrightCode: step.playwrightCode,
        status: 'running',
        startedAt: new Date()
      };
      await testRun.save();

      try {
        if (!step.playwrightCode) {
          throw new Error(step.error || 'Failed to generate Playwright code');
        }

        // Replace variables in the code
        const processedCode = await replaceVariables(step.playwrightCode, variables);

        console.log(`Executing step ${i + 1}: ${step.instruction}`);
        console.log(`Code: ${processedCode}`);

        // Execute the Playwright code
        // We use Function constructor to execute the code with page context
        const executeStep = new Function('page', 'expect', `return (async () => { ${processedCode} })();`);

        // Import expect from playwright for assertions
        const { expect } = require('@playwright/test');

        await executeStep(page, expect);

        // Take screenshot after successful step
        const screenshotFilename = `step-${i + 1}-${Date.now()}.png`;
        const screenshotPath = path.join(screenshotsDir, screenshotFilename);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const duration = Date.now() - stepStartTime;

        // Update step result as passed
        testRun.stepResults[i] = {
          stepOrder: step.order,
          instruction: step.instruction,
          playwrightCode: processedCode,
          status: 'passed',
          duration,
          screenshots: [{
            filename: screenshotFilename,
            path: `/test-results/${testRunId}/screenshots/${screenshotFilename}`,
            timestamp: new Date()
          }],
          startedAt: testRun.stepResults[i].startedAt,
          completedAt: new Date()
        };

        passedSteps++;
      } catch (error) {
        console.error(`Step ${i + 1} failed:`, error);

        // Take screenshot of failure
        let screenshotFilename = null;
        try {
          screenshotFilename = `step-${i + 1}-error-${Date.now()}.png`;
          const screenshotPath = path.join(screenshotsDir, screenshotFilename);
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } catch (screenshotError) {
          console.error('Failed to take error screenshot:', screenshotError);
        }

        const duration = Date.now() - stepStartTime;

        // Update step result as failed
        testRun.stepResults[i] = {
          stepOrder: step.order,
          instruction: step.instruction,
          playwrightCode: step.playwrightCode,
          status: 'failed',
          duration,
          error: {
            message: error.message,
            stack: error.stack
          },
          screenshots: screenshotFilename ? [{
            filename: screenshotFilename,
            path: `/test-results/${testRunId}/screenshots/${screenshotFilename}`,
            timestamp: new Date()
          }] : [],
          startedAt: testRun.stepResults[i].startedAt,
          completedAt: new Date()
        };

        failedSteps++;
      }

      await testRun.save();
    }

    // Close the page and context to save video
    await page.close();
    await context.close();

    // Find the video file
    const videoFiles = await fs.readdir(videosDir);
    let videoPath = null;
    if (videoFiles.length > 0) {
      const videoFilename = videoFiles[0];
      videoPath = `/test-results/${testRunId}/videos/${videoFilename}`;

      testRun.video = {
        filename: videoFilename,
        path: videoPath
      };
    }

    // Calculate overall result
    const overallResult = failedSteps === 0 ? 'passed' : (passedSteps > 0 ? 'partial' : 'failed');

    // Update test run with final results
    testRun.status = 'completed';
    testRun.completedAt = new Date();
    testRun.duration = testRun.completedAt - testRun.startedAt;
    testRun.passedSteps = passedSteps;
    testRun.failedSteps = failedSteps;
    testRun.overallResult = overallResult;

    await testRun.save();

    return testRun;

  } catch (error) {
    console.error('Test run failed:', error);

    // Update test run status to failed
    await TestRun.findByIdAndUpdate(testRunId, {
      status: 'failed',
      completedAt: new Date(),
      'stepResults.$[].status': 'failed'
    });

    throw error;
  } finally {
    // Cleanup
    if (page && !page.isClosed()) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Starts a test run (async, returns immediately)
 */
async function startTestRun(testSuite) {
  // Create initial test run record
  const testRun = new TestRun({
    testSuite: testSuite._id,
    testSuiteName: testSuite.name,
    status: 'pending',
    stepResults: testSuite.steps.map(step => ({
      stepOrder: step.order,
      instruction: step.instruction,
      status: 'pending'
    }))
  });

  await testRun.save();

  // Execute test run asynchronously (don't await)
  executeTestRun(testRun._id, testSuite, testSuite.steps)
    .catch(error => {
      console.error('Test run execution failed:', error);
    });

  return testRun;
}

module.exports = {
  startTestRun,
  executeTestRun
};
