require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const connectDB = require('./config/database');

// Import routes
const testSuitesRouter = require('./routes/testSuites');
const variablesRouter = require('./routes/variables');
const testRunsRouter = require('./routes/testRuns');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development; configure properly for production
}));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'testman-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/test-suites', testSuitesRouter);
app.use('/api/variables', variablesRouter);
app.use('/api/test-runs', testRunsRouter);

// Frontend Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'TestmanAI - Home'
  });
});

app.get('/test-suites', (req, res) => {
  res.render('test-suites/index', {
    title: 'Test Suites'
  });
});

app.get('/test-suites/new', (req, res) => {
  res.render('test-suites/new', {
    title: 'Create Test Suite'
  });
});

app.get('/test-suites/:id/edit', (req, res) => {
  res.render('test-suites/edit', {
    title: 'Edit Test Suite',
    testSuiteId: req.params.id
  });
});

app.get('/test-suites/:id', (req, res) => {
  res.render('test-suites/view', {
    title: 'Test Suite Details',
    testSuiteId: req.params.id
  });
});

app.get('/test-runs', (req, res) => {
  res.render('test-runs/index', {
    title: 'Test Runs'
  });
});

app.get('/test-runs/:id', (req, res) => {
  res.render('test-runs/view', {
    title: 'Test Run Results',
    testRunId: req.params.id
  });
});

app.get('/variables', (req, res) => {
  res.render('variables/index', {
    title: 'Variables'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TestmanAI server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
