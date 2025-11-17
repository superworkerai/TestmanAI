# Contributing to TestmanAI

Thank you for your interest in contributing to TestmanAI! This document provides guidelines for both human and AI contributors.

## 🚨 CRITICAL REQUIREMENT: Test-Driven Development (TDD)

**ALL code contributions MUST follow Test-Driven Development practices. No exceptions.**

### For AI Agents

**If you are an AI assistant making changes to this codebase:**

1. **ALWAYS write tests FIRST, before implementing features**
2. **NEVER commit code without accompanying tests**
3. **ALWAYS run the test suite before committing** (`npm test`)
4. **ENSURE test coverage remains above 70%** for all metrics
5. **FOLLOW the TDD workflow** described below

**Failure to follow TDD practices is unacceptable and shows poor software engineering.**

### For Human Contributors

The same TDD requirements apply. Tests are not optional.

## Test-Driven Development Workflow

### 1. Write Failing Tests First

Before writing any production code, write tests that describe the desired behavior:

```javascript
// tests/unit/utils/validator.test.js
describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.name+tag@example.co.uk')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('should throw error for null or undefined input', () => {
    expect(() => validateEmail(null)).toThrow();
    expect(() => validateEmail(undefined)).toThrow();
  });
});
```

### 2. Run Tests and Verify They Fail

```bash
npm test
# Should see: ✗ validateEmail tests failing
# Error: validateEmail is not defined
```

### 3. Write Minimal Code to Pass Tests

```javascript
// utils/validator.js
function validateEmail(email) {
  if (email === null || email === undefined) {
    throw new Error('Email cannot be null or undefined');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = { validateEmail };
```

### 4. Run Tests Again - They Should Pass

```bash
npm test
# Should see: ✓ All validateEmail tests passing
```

### 5. Refactor (If Needed)

Improve the code while keeping tests green:

```javascript
// utils/validator.js
function validateEmail(email) {
  if (email === null || email === undefined) {
    throw new Error('Email cannot be null or undefined');
  }

  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

module.exports = { validateEmail };
```

### 6. Verify Tests Still Pass

```bash
npm test
# Should still see: ✓ All tests passing
```

## Required Testing Standards

### Coverage Requirements

All pull requests must maintain or improve test coverage:

- **Branches**: 70% minimum
- **Functions**: 70% minimum
- **Lines**: 70% minimum
- **Statements**: 70% minimum

Check coverage with:
```bash
npm test
# Coverage report shown at the end
```

### Types of Tests Required

#### 1. Unit Tests (Required for ALL new functions/methods)

Test individual components in isolation:

```javascript
// tests/unit/services/calculator.test.js
const { add, subtract } = require('../../../services/calculator');

describe('Calculator Service', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-5, 3)).toBe(-2);
    });
  });
});
```

#### 2. Integration Tests (Required for ALL new API endpoints)

Test full request/response cycles:

```javascript
// tests/integration/routes/users.test.js
const request = require('supertest');
const app = require('../../../server');

describe('Users API', () => {
  it('POST /api/users - should create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test User');
  });
});
```

#### 3. Edge Case Tests (Required)

Test boundary conditions and error scenarios:

```javascript
it('should handle empty input', () => {
  expect(() => processData('')).toThrow();
});

it('should handle very large inputs', () => {
  const largeArray = new Array(10000).fill(1);
  expect(processArray(largeArray)).toBeDefined();
});

it('should handle special characters', () => {
  expect(sanitize('!@#$%^&*()')).toBe('');
});
```

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Tests were written BEFORE implementation
- [ ] All tests pass (`npm test`)
- [ ] Coverage is at least 70% for all metrics
- [ ] Integration tests added for new API endpoints
- [ ] Unit tests added for new utility functions/services
- [ ] Edge cases are tested
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Test names are descriptive
- [ ] No commented-out tests (use `.skip` if needed temporarily)
- [ ] No `console.log` statements left in code
- [ ] Tests are independent (don't rely on execution order)

## Code Review Standards

### Reviewers Will Check For:

1. **Tests First**: Were tests written before implementation?
2. **Test Quality**: Do tests actually test the right things?
3. **Coverage**: Is coverage maintained or improved?
4. **Edge Cases**: Are edge cases covered?
5. **Independence**: Are tests independent of each other?
6. **Clarity**: Are test names descriptive?
7. **No Mocking Overkill**: Are only external dependencies mocked?

### Common Rejection Reasons

❌ **PR will be rejected if:**
- No tests included
- Tests were clearly written after implementation
- Coverage drops below 70%
- Tests are not independent
- Tests test implementation details instead of behavior
- Integration tests make real API calls instead of using mocks
- Tests are flaky (sometimes pass, sometimes fail)

## Setting Up Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd TestmanAI

# Install dependencies
npm install

# Install Playwright browsers (for full testing)
npx playwright install chromium

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Use test API keys, not production!

# Run tests to verify setup
npm test
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Write Tests First

```bash
# Create test file
touch tests/unit/services/yourFeature.test.js

# Write failing tests
# Run tests and see them fail
npm test
```

### 3. Implement Feature

```bash
# Write minimal code to pass tests
# Run tests frequently
npm test -- --watch
```

### 4. Verify Everything Works

```bash
# Run full test suite
npm test

# Check test coverage
# Open coverage/lcov-report/index.html

# Run linter (if configured)
npm run lint
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add email validation with comprehensive tests"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

## Testing Guidelines by Component

### Models (Mongoose)

```javascript
describe('User Model', () => {
  it('should validate required fields', async () => {
    const user = new User({});
    await expect(user.validate()).rejects.toThrow();
  });

  it('should hash password before saving', async () => {
    const user = new User({ email: 'test@example.com', password: 'plain' });
    await user.save();
    expect(user.password).not.toBe('plain');
  });
});
```

### Routes (Express)

```javascript
describe('POST /api/test-suites', () => {
  it('should create test suite with valid data', async () => {
    const response = await request(app)
      .post('/api/test-suites')
      .send({ name: 'Test Suite', steps: [...] })
      .expect(201);

    expect(response.body.success).toBe(true);
  });

  it('should return 400 for invalid data', async () => {
    const response = await request(app)
      .post('/api/test-suites')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
```

### Services

```javascript
describe('OpenAI Service', () => {
  beforeEach(() => {
    // Mock OpenAI API
    jest.mock('openai');
  });

  it('should convert instruction to Playwright code', async () => {
    mockOpenAI.mockResolvedValue({ code: 'await page.click("button")' });

    const result = await convertToPlaywright('Click the button');
    expect(result).toContain('page.click');
  });
});
```

## Documentation

When adding new features:

1. Update `TESTING.md` if adding new testing patterns
2. Update `README.md` if changing user-facing behavior
3. Add JSDoc comments to functions
4. Include examples in comments

## AI Agent-Specific Guidelines

If you are an AI assistant working on this codebase:

### DO:
✅ Write tests before implementing features
✅ Run tests after every change
✅ Check coverage reports
✅ Test edge cases and error conditions
✅ Mock external dependencies (OpenAI, Playwright, etc.)
✅ Clean up test data after each test
✅ Use descriptive test names
✅ Follow existing code patterns

### DON'T:
❌ Skip writing tests
❌ Write tests after implementation
❌ Ignore failing tests
❌ Lower coverage thresholds
❌ Write integration tests that make real API calls
❌ Leave `console.log` statements in code
❌ Commit commented-out test code
❌ Write interdependent tests

### Example Commit Message

When you commit as an AI agent, acknowledge that you followed TDD:

```
feat: add email validation service

- Wrote comprehensive unit tests first (TDD)
- Implemented validateEmail function to pass tests
- Added edge case tests for special characters and null values
- Coverage: 100% for new code
- All tests passing ✓
```

## Questions?

- Read `TESTING.md` for detailed testing guide
- Look at existing tests in `tests/` for examples
- Ask in project discussions for clarification

---

## Final Reminder

**Test-Driven Development is not optional. It is a core requirement.**

Writing tests first leads to:
- Better designed code
- Fewer bugs
- Easier refactoring
- Clearer documentation
- Higher confidence in changes

Thank you for contributing to TestmanAI with quality, tested code!
