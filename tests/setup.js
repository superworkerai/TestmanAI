// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/testmanai-test';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes in hex
process.env.SESSION_SECRET = 'test-session-secret';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
