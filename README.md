# TestmanAI

AI-powered end-to-end testing platform that converts natural language instructions into automated Playwright tests.

## Features

- **Natural Language Testing**: Write test steps in plain English - no coding required
- **AI-Powered Conversion**: OpenAI automatically converts instructions to Playwright code
- **Automated Execution**: Tests run automatically using headless Chromium
- **Detailed Results**: View comprehensive test results with screenshots and video recordings
- **Secure Variables**: Store sensitive data with AES-256 encryption
- **Real-time Monitoring**: Track test execution progress in real-time
- **Easy Management**: Intuitive web interface for managing test suites and variables

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose ODM
- **Frontend**: Pug templates + TailwindCSS + Alpine.js
- **Testing**: Playwright + Chromium
- **AI**: OpenAI GPT-4
- **Security**: AES-256-CBC encryption for sensitive variables

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- OpenAI API key
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TestmanAI
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Configure your `.env` file:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/testmanai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here

# Session Secret
SESSION_SECRET=your_session_secret_here
```

6. Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste it as your `ENCRYPTION_KEY` in `.env`

7. Build TailwindCSS:
```bash
npm run build:css
```

## Usage

### Starting the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Creating Test Suites

1. Navigate to **Test Suites** → **New Test Suite**
2. Enter a name and description for your test suite
3. Add test steps in plain English, for example:
   - "Navigate to https://example.com"
   - "Click the Login button"
   - "Enter {{username}} in the username field"
   - "Enter {{password}} in the password field"
   - "Click the Submit button"
   - "Verify the page title contains Dashboard"

4. Reference variables using `{{variableName}}` syntax
5. Save your test suite

### Managing Variables

1. Navigate to **Variables**
2. Click **New Variable**
3. Enter:
   - Name (e.g., `username`, `password`, `apiKey`)
   - Description (optional)
   - Value (will be encrypted)
   - Check "Encrypt this variable" for sensitive data
4. Use variables in your test steps with `{{variableName}}`

**Security Note**: Variables are encrypted using AES-256-CBC. They are never sent to OpenAI or any external service - only used at test runtime.

### Running Tests

1. From **Test Suites**, click **Run Test** on any suite
2. Or, view a test suite and click **Run Test**
3. The test will execute automatically:
   - AI converts each step to Playwright code
   - Chromium browser runs the test in headless mode
   - Screenshots are captured for each step
   - Video recording of the entire test run is saved
4. View real-time progress on the test run page

### Viewing Results

1. Navigate to **Test Runs** to see all test executions
2. Click on any test run to view detailed results:
   - Overall pass/fail status
   - Results for each individual step
   - Generated Playwright code for each step
   - Screenshots for each step
   - Full video recording of the test
   - Error messages and stack traces for failures

## Project Structure

```
TestmanAI/
├── config/
│   └── database.js          # MongoDB connection config
├── models/
│   ├── TestSuite.js         # Test suite schema
│   ├── TestRun.js           # Test run results schema
│   └── Variable.js          # Encrypted variables schema
├── routes/
│   ├── testSuites.js        # Test suite API routes
│   ├── testRuns.js          # Test run API routes
│   └── variables.js         # Variables API routes
├── services/
│   ├── openaiService.js     # OpenAI integration
│   └── playwrightRunner.js  # Playwright test execution
├── utils/
│   └── encryption.js        # AES-256 encryption utilities
├── views/
│   ├── layout.pug           # Base layout template
│   ├── index.pug            # Home page
│   ├── test-suites/         # Test suite views
│   ├── test-runs/           # Test run views
│   └── variables/           # Variables views
├── public/
│   ├── css/                 # TailwindCSS files
│   └── test-results/        # Screenshots and videos
├── server.js                # Express server
└── package.json             # Dependencies
```

## API Endpoints

### Test Suites
- `GET /api/test-suites` - List all test suites
- `GET /api/test-suites/:id` - Get test suite by ID
- `POST /api/test-suites` - Create new test suite
- `PUT /api/test-suites/:id` - Update test suite
- `DELETE /api/test-suites/:id` - Delete test suite
- `GET /api/test-suites/:id/runs` - Get test runs for suite

### Test Runs
- `GET /api/test-runs` - List all test runs
- `GET /api/test-runs/:id` - Get test run by ID
- `POST /api/test-runs` - Start new test run
- `GET /api/test-runs/:id/status` - Get test run status
- `DELETE /api/test-runs/:id` - Cancel test run

### Variables
- `GET /api/variables` - List all variables
- `GET /api/variables/:id` - Get variable by ID
- `POST /api/variables` - Create new variable
- `PUT /api/variables/:id` - Update variable
- `DELETE /api/variables/:id` - Delete variable

## Example Test Instructions

Here are examples of natural language instructions that work well:

**Navigation:**
- "Navigate to https://example.com"
- "Go to the login page"

**Interactions:**
- "Click the Login button"
- "Click on the element with text 'Sign Up'"
- "Press the Enter key"

**Form Inputs:**
- "Enter {{username}} in the username field"
- "Type 'test@example.com' in the email input"
- "Fill the search box with 'Playwright'"

**Assertions:**
- "Verify the page title contains Dashboard"
- "Check that the success message is visible"
- "Ensure the URL includes /dashboard"

**Waits:**
- "Wait for the page to load"
- "Wait 2 seconds"
- "Wait for the loading spinner to disappear"

## Security Considerations

1. **Encryption**: All sensitive variables are encrypted using AES-256-CBC
2. **Key Management**: Keep your `ENCRYPTION_KEY` secure and never commit it to version control
3. **API Keys**: Store your OpenAI API key securely in the `.env` file
4. **Variables**: Sensitive values are never sent to OpenAI or logged
5. **Session Security**: Configure `SESSION_SECRET` for production use

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env`
- Verify MongoDB is accepting connections on port 27017

### OpenAI API Errors
- Verify your API key is valid
- Check your OpenAI account has available credits
- Ensure you have access to GPT-4 API

### Playwright Issues
- Reinstall browsers: `npx playwright install chromium`
- Check Playwright version compatibility
- Review error logs for missing dependencies

### CSS Not Loading
- Build TailwindCSS: `npm run build:css`
- Check that `public/css/output.css` exists
- Clear browser cache

## Development

### Running in Development Mode

```bash
# Start server with auto-reload
npm run dev

# In another terminal, watch CSS changes
npm run build:css
```

### Adding New Test Instructions

To improve AI conversion accuracy, you can update the OpenAI system prompt in `services/openaiService.js` with more examples.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- Powered by [OpenAI GPT-4](https://openai.com/)
- UI components styled with [TailwindCSS](https://tailwindcss.com/)
- Interactive features using [Alpine.js](https://alpinejs.dev/)
