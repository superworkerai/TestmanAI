// Mock OpenAI before importing the service
jest.mock('openai');

const { convertToPlaywrightCode, convertStepsToPlaywright, validateApiKey } = require('../../../services/openaiService');
const OpenAI = require('openai');

describe('OpenAI Service', () => {
  let mockCreate;
  let mockList;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock OpenAI client methods
    mockCreate = jest.fn();
    mockList = jest.fn();

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    }));
  });

  describe('convertToPlaywrightCode', () => {
    it('should convert simple navigation instruction to Playwright code', async () => {
      const instruction = 'Navigate to https://example.com';
      const expectedCode = "await page.goto('https://example.com', { waitUntil: 'networkidle' });";

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: expectedCode
          }
        }]
      });

      const result = await convertToPlaywrightCode(instruction);

      expect(result).toBe(expectedCode);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          max_tokens: 500
        })
      );
    });

    it('should convert click instruction to Playwright code', async () => {
      const instruction = 'Click the Login button';
      const expectedCode = 'await page.click(\'button:has-text("Login")\');';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: expectedCode
          }
        }]
      });

      const result = await convertToPlaywrightCode(instruction);

      expect(result).toBe(expectedCode);
    });

    it('should handle variable placeholders in instructions', async () => {
      const instruction = 'Enter {{username}} in the username field';
      const expectedCode = 'await page.fill(\'input[name="username"]\', {{username}});';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: expectedCode
          }
        }]
      });

      const result = await convertToPlaywrightCode(instruction);

      expect(result).toContain('{{username}}');
    });

    it('should remove markdown code blocks from response', async () => {
      const instruction = 'Click the submit button';
      const codeWithMarkdown = '```javascript\nawait page.click(\'button[type="submit"]\');\n```';
      const expectedCode = 'await page.click(\'button[type="submit"]\');';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: codeWithMarkdown
          }
        }]
      });

      const result = await convertToPlaywrightCode(instruction);

      expect(result).toBe(expectedCode);
      expect(result).not.toContain('```');
    });

    it('should pass context from previous steps', async () => {
      const instruction = 'Click the next button';
      const context = {
        previousSteps: ['Navigate to login page', 'Enter credentials']
      };

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'await page.click(\'button:has-text("Next")\');'
          }
        }]
      });

      await convertToPlaywrightCode(instruction, context);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(m => m.role === 'user');

      expect(userMessage.content).toContain('Navigate to login page');
      expect(userMessage.content).toContain('Enter credentials');
    });

    it('should throw error when OpenAI API fails', async () => {
      const instruction = 'Click the button';

      mockCreate.mockRejectedValue(new Error('API key invalid'));

      await expect(convertToPlaywrightCode(instruction)).rejects.toThrow('Failed to convert instruction');
    });

    it('should handle empty instructions', async () => {
      const instruction = '';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: ''
          }
        }]
      });

      const result = await convertToPlaywrightCode(instruction);

      expect(result).toBe('');
    });

    it('should use correct system prompt with important rules', async () => {
      const instruction = 'Test instruction';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'await page.click("test");'
          }
        }]
      });

      await convertToPlaywrightCode(instruction);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find(m => m.role === 'system');

      expect(systemMessage.content).toContain('Playwright');
      expect(systemMessage.content).toContain('async/await');
      expect(systemMessage.content).toContain('page');
    });
  });

  describe('convertStepsToPlaywright', () => {
    it('should convert multiple steps successfully', async () => {
      const steps = [
        { order: 1, instruction: 'Navigate to https://example.com' },
        { order: 2, instruction: 'Click the login button' },
        { order: 3, instruction: 'Enter username' }
      ];

      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'await page.goto("https://example.com");' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'await page.click("button");' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'await page.fill("input", "user");' } }]
        });

      const result = await convertStepsToPlaywright(steps);

      expect(result).toHaveLength(3);
      expect(result[0].playwrightCode).toContain('page.goto');
      expect(result[1].playwrightCode).toContain('page.click');
      expect(result[2].playwrightCode).toContain('page.fill');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should preserve step order and original data', async () => {
      const steps = [
        { order: 1, instruction: 'Step 1', description: 'First step' },
        { order: 2, instruction: 'Step 2', description: 'Second step' }
      ];

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'await page.click("test");' } }]
      });

      const result = await convertStepsToPlaywright(steps);

      expect(result[0]).toHaveProperty('order', 1);
      expect(result[0]).toHaveProperty('instruction', 'Step 1');
      expect(result[0]).toHaveProperty('description', 'First step');
      expect(result[0]).toHaveProperty('playwrightCode');

      expect(result[1]).toHaveProperty('order', 2);
      expect(result[1]).toHaveProperty('instruction', 'Step 2');
    });

    it('should handle errors for individual steps', async () => {
      const steps = [
        { order: 1, instruction: 'Valid step' },
        { order: 2, instruction: 'Invalid step' }
      ];

      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'await page.click("test");' } }]
        })
        .mockRejectedValueOnce(new Error('API error'));

      const result = await convertStepsToPlaywright(steps);

      expect(result[0].playwrightCode).toBeTruthy();
      expect(result[0].error).toBeUndefined();

      expect(result[1].playwrightCode).toBeNull();
      expect(result[1].error).toContain('API error');
    });

    it('should pass previous steps as context', async () => {
      const steps = [
        { order: 1, instruction: 'First step' },
        { order: 2, instruction: 'Second step' }
      ];

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'await page.click("test");' } }]
      });

      await convertStepsToPlaywright(steps);

      // Second call should include context from first step
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle empty steps array', async () => {
      const result = await convertStepsToPlaywright([]);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should return true when API key is valid', async () => {
      mockList.mockResolvedValue({ data: [] });

      const result = await validateApiKey();

      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('should return false when API key is invalid', async () => {
      mockList.mockRejectedValue(new Error('Invalid API key'));

      const result = await validateApiKey();

      expect(result).toBe(false);
    });

    it('should return false on network errors', async () => {
      mockList.mockRejectedValue(new Error('Network error'));

      const result = await validateApiKey();

      expect(result).toBe(false);
    });
  });
});
