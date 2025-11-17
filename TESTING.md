# Testing Guide for TestmanAI

This guide explains how to write and run tests for TestmanAI. **All new features MUST include comprehensive tests.**

## Table of Contents

- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test-Driven Development (TDD)](#test-driven-development-tdd)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Test Structure

Tests are organized in the `tests/` directory:

```
tests/
├── setup.js                    # Test environment configuration
├── unit/                       # Unit tests (isolated component tests)
│   ├── utils/
│   │   └── encryption.test.js
│   ├── services/
│   │   ├── openaiService.test.js
│   │   └── playwrightRunner.test.js
│   └── models/
│       └── Variable.test.js
└── integration/                # Integration tests (API endpoints, full workflows)
    └── routes/
        ├── variables.test.js
        ├── testSuites.test.js
        └── testRuns.test.js
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test
# Coverage report will be generated in coverage/
# Open coverage/lcov-report/index.html in a browser
```

### CI Mode (for continuous integration)
```bash
npm run test:ci
```

## Writing Tests

### Test File Naming Convention

- Unit tests: `[filename].test.js`
- Integration tests: `[filename].test.js`
- Place tests in corresponding `tests/unit/` or `tests/integration/` subdirectories

### Basic Test Structure

```javascript
describe('Component or Feature Name', () => {
  // Setup before all tests in this describe block
  beforeAll(async () => {
    // One-time setup
  });

  // Setup before each test
  beforeEach(() => {
    // Reset state before each test
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up after each test
  });

  // Cleanup after all tests
  afterAll(async () => {
    // One-time cleanup
  });

  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = 'test';

      // Act: Execute the code being tested
      const result = functionUnderTest(input);

      // Assert: Verify the results
      expect(result).toBe('expected');
    });
  });
});
```

### Unit Test Example

```javascript
const { encrypt, decrypt } = require('../../../utils/encryption');

describe('Encryption Utils', () => {
  describe('encrypt', () => {
    it('should encrypt a string value', () => {
      const value = 'password123';
      const result = encrypt(value);

      expect(result).toHaveProperty('encryptedValue');
      expect(result).toHaveProperty('iv');
      expect(result.encryptedValue).not.toBe(value);
    });

    it('should throw error for empty values', () => {
      expect(() => encrypt('')).toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted values', () => {
      const original = 'secret';
      const { encryptedValue, iv } = encrypt(original);
      const decrypted = decrypt(encryptedValue, iv);

      expect(decrypted).toBe(original);
    });
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../../server');

describe('Variables API', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Variable.deleteMany({});
  });

  it('POST /api/variables - should create variable', async () => {
    const response = await request(app)
      .post('/api/variables')
      .send({
        name: 'testVar',
        value: 'secret123'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('testVar');
  });
});
```

### Mocking External Services

```javascript
// Mock OpenAI at the top of your test file
jest.mock('openai');

const OpenAI = require('openai');

describe('OpenAI Service', () => {
  let mockCreate;

  beforeEach(() => {
    mockCreate = jest.fn();
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));
  });

  it('should convert instruction to code', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'await page.click("button");' } }]
    });

    const result = await convertToPlaywrightCode('Click the button');
    expect(result).toContain('page.click');
  });
});
```

## Test-Driven Development (TDD)

**TestmanAI follows Test-Driven Development principles. All new features MUST be developed using TDD.**

### TDD Workflow

1. **Write a failing test first**
   ```javascript
   it('should validate email format', () => {
     expect(validateEmail('invalid')).toBe(false);
     expect(validateEmail('valid@example.com')).toBe(true);
   });
   ```

2. **Run the test and see it fail**
   ```bash
   npm test
   # ✗ should validate email format
   # ReferenceError: validateEmail is not defined
   ```

3. **Write minimal code to make it pass**
   ```javascript
   function validateEmail(email) {
     return email.includes('@') && email.includes('.');
   }
   ```

4. **Run the test and see it pass**
   ```bash
   npm test
   # ✓ should validate email format
   ```

5. **Refactor** (improve code while keeping tests green)
   ```javascript
   function validateEmail(email) {
     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return regex.test(email);
   }
   ```

6. **Repeat** for next feature

### Why TDD?

- **Prevents bugs**: Catch issues before they reach production
- **Better design**: Writing tests first leads to cleaner, more modular code
- **Documentation**: Tests serve as living documentation
- **Confidence**: Refactor fearlessly knowing tests will catch breakage
- **Faster debugging**: Failing tests pinpoint exact problem areas

## Coverage Requirements

All code must meet these coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Checking Coverage

```bash
npm test
# Coverage summary appears at the end
# Detailed report: coverage/lcov-report/index.html
```

### What to Test

✅ **Do Test**:
- All utility functions
- Service layer logic (with mocked external APIs)
- API route handlers
- Model validation
- Error handling
- Edge cases and boundary conditions

❌ **Don't Test**:
- Third-party library internals
- Simple getters/setters without logic
- Configuration files

## Best Practices

### 1. Test Naming

Use descriptive test names that explain the behavior:

```javascript
// ❌ Bad
it('test encryption', () => { ... });

// ✅ Good
it('should encrypt password and return different value each time', () => { ... });
```

### 2. Test Independence

Each test should be completely independent:

```javascript
// ❌ Bad - tests depend on each other
let user;
it('creates user', () => {
  user = createUser();
});
it('updates user', () => {
  updateUser(user); // Depends on previous test
});

// ✅ Good - each test is independent
it('creates user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});
it('updates user', () => {
  const user = createUser(); // Create fresh user
  const updated = updateUser(user);
  expect(updated).toBeDefined();
});
```

### 3. Use AAA Pattern

Organize tests using Arrange-Act-Assert:

```javascript
it('should calculate total price with tax', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  const taxRate = 0.1;

  // Act
  const total = calculateTotal(items, taxRate);

  // Assert
  expect(total).toBe(33); // (10 + 20) * 1.1
});
```

### 4. Test Edge Cases

```javascript
describe('divide', () => {
  it('should divide two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should handle division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it('should handle floating point division', () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 5. Mock External Dependencies

```javascript
// ❌ Bad - makes real API calls
it('should fetch user data', async () => {
  const data = await fetchUserFromAPI(123);
  expect(data.name).toBe('John');
});

// ✅ Good - mocks the API
jest.mock('../api/userService');
it('should fetch user data', async () => {
  userService.fetch.mockResolvedValue({ name: 'John' });
  const data = await fetchUserFromAPI(123);
  expect(data.name).toBe('John');
});
```

### 6. Clean Up After Tests

```javascript
describe('Database tests', () => {
  afterEach(async () => {
    // Always clean up test data
    await User.deleteMany({});
    await Post.deleteMany({});
  });

  it('creates a user', async () => {
    await User.create({ name: 'Test' });
    // Test will clean up automatically
  });
});
```

### 7. Use MongoDB Memory Server for Integration Tests

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

## Common Testing Patterns

### Testing Async Code

```javascript
// Using async/await
it('should resolve promise', async () => {
  const result = await asyncFunction();
  expect(result).toBe('success');
});

// Testing rejections
it('should reject with error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Middleware

```javascript
it('should call next() when authorized', () => {
  const req = { headers: { authorization: 'Bearer token' } };
  const res = {};
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(next).toHaveBeenCalled();
});
```

### Testing Error Handling

```javascript
it('should handle database errors gracefully', async () => {
  jest.spyOn(User, 'findById').mockRejectedValue(new Error('DB Error'));

  const response = await request(app).get('/users/123');

  expect(response.status).toBe(500);
  expect(response.body.error).toContain('Database error');
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- tests/unit/utils/encryption.test.js
```

### Run Single Test

```bash
npm test -- -t "should encrypt a string value"
```

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Continuous Integration

Tests run automatically on every commit in CI. The build will fail if:

- Any test fails
- Coverage drops below 70%
- Tests take longer than 10 minutes

## Getting Help

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Supertest Documentation**: https://github.com/visionmedia/supertest
- **MongoDB Memory Server**: https://github.com/nodkz/mongodb-memory-server

## Questions?

If you're unsure how to test something, look at existing tests in the `tests/` directory for examples, or ask for help in the project discussions.

---

**Remember**: Code without tests is broken by design. Always write tests!
