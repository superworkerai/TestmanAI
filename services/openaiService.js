const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Converts natural language instruction to Playwright code
 * @param {string} instruction - The natural language instruction
 * @param {object} context - Optional context about previous steps
 * @returns {Promise<string>} - Playwright code
 */
async function convertToPlaywrightCode(instruction, context = {}) {
  try {
    const systemPrompt = `You are an expert at converting natural language instructions into Playwright test code.

IMPORTANT RULES:
1. Generate ONLY executable Playwright code snippets
2. Assume 'page' object is already available (do not create browser or context)
3. Use async/await syntax
4. Include appropriate waits and assertions
5. Handle common edge cases
6. Use modern Playwright best practices
7. Do NOT include comments unless absolutely necessary
8. Do NOT wrap code in markdown code blocks or backticks
9. Return only the JavaScript code that can be directly executed
10. For variables referenced with {{variableName}}, use them as-is in the code (they will be replaced at runtime)

Examples:
Input: "Navigate to https://example.com"
Output: await page.goto('https://example.com', { waitUntil: 'networkidle' });

Input: "Click the Login button"
Output: await page.click('button:has-text("Login")');

Input: "Enter {{username}} in the username field"
Output: await page.fill('input[name="username"], input[placeholder*="username" i]', {{username}});

Input: "Wait for the page to load"
Output: await page.waitForLoadState('networkidle');

Input: "Verify the title contains Dashboard"
Output: await expect(page).toHaveTitle(/Dashboard/);`;

    const userPrompt = `Convert this instruction to Playwright code: "${instruction}"

${context.previousSteps ? `Previous steps context:\n${context.previousSteps.slice(-3).join('\n')}` : ''}

Remember: Return ONLY the executable JavaScript code, no markdown, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    let code = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    code = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');

    return code;
  } catch (error) {
    console.error('Error converting instruction to Playwright code:', error);
    throw new Error(`Failed to convert instruction: ${error.message}`);
  }
}

/**
 * Converts multiple instructions to Playwright code
 * @param {Array<object>} steps - Array of step objects with instruction property
 * @returns {Promise<Array<object>>} - Steps with added playwrightCode property
 */
async function convertStepsToPlaywright(steps) {
  const convertedSteps = [];
  const previousSteps = [];

  for (const step of steps) {
    try {
      const playwrightCode = await convertToPlaywrightCode(step.instruction, {
        previousSteps
      });

      convertedSteps.push({
        ...step,
        playwrightCode
      });

      previousSteps.push(step.instruction);
    } catch (error) {
      convertedSteps.push({
        ...step,
        playwrightCode: null,
        error: error.message
      });
    }
  }

  return convertedSteps;
}

/**
 * Validates if the OpenAI API is properly configured
 * @returns {Promise<boolean>}
 */
async function validateApiKey() {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI API key validation failed:', error.message);
    return false;
  }
}

module.exports = {
  convertToPlaywrightCode,
  convertStepsToPlaywright,
  validateApiKey
};
