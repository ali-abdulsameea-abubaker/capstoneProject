const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();

// Database
const { testConnection } = require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');
const communityRoutes = require('./routes/communityRoutes');

// ===== Create Express app =====
const app = express();

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// Debug middleware - FIRST middleware to catch all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ===== Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: false // Temporarily disable CSP for debugging
}));
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.BASE_URL
        : 'http://localhost:3000',
    credentials: true,
  })
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ===== Application Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with error handling
app.use(express.static(path.join(__dirname, 'public'), {
  index: false, // Don't serve index.html automatically
  fallthrough: true // Allow other routes to handle requests
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== Test Routes =====
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

app.get('/direct-login', (req, res) => {
  const loginPath = path.join(__dirname, 'public', 'login.html');
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    res.status(404).send('login.html not found');
  }
});

// ===== Main Routes =====
app.use('/auth', authRoutes);
app.use('/pets', petRoutes);
app.use('/tasks', taskRoutes);
app.use('/health', healthRoutes);
app.use('/community', communityRoutes);

// ===== Page Routes =====
// Serve login.html
app.get('/login.html', (req, res) => {
  const loginPath = path.join(__dirname, 'public', 'login.html');
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    res.status(404).send('Login page not found');
  }
});

// Root route
app.get('/', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  
  const loginPath = path.join(__dirname, 'public', 'login.html');
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    // Fallback if file doesn't exist
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pet Care - Login</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .container { max-width: 400px; margin: 0 auto; }
          .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pet Care Management</h1>
          <p>Login page file not found. Server is running though!</p>
          <p><a href="/test">Test server connection</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Dashboard route (protected)
app.get('/dashboard', requireAuth, async (req, res) => {
  const { query } = require('./config/database');

  try {
    // Get pets for this user
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [
      req.session.userId,
    ]);

    // Get tasks
    const tasks = await query(
      `SELECT t.*, p.name as pet_name 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE t.user_id = ? AND t.completed = false AND t.due_date >= NOW() 
       ORDER BY t.due_date LIMIT 5`,
      [req.session.userId]
    );

    res.render('dashboard', {
      username: req.session.username,
      pets,
      tasks,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard.');
  }
});

// Schedule task form with pet data
app.get('/schedule-task', requireAuth, async (req, res) => {
  try {
    const { query } = require('./config/database');
    
    // Get user's pets
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [
      req.session.userId,
    ]);
    
    if (pets.length === 0) {
      return res.redirect('/dashboard?message=No pets available. Please add a pet first.');
    }
    
    res.render('schedule-task', { pets });
  } catch (err) {
    console.error('Schedule task form error:', err);
    res.status(500).send('Error loading task form.');
  }
});

// Add pet form
app.get('/pets/add', requireAuth, (req, res) => {
  res.render('add-pet');
});

// ===== Redirect Routes for Old URLs =====
app.get('/add-task.html', requireAuth, (req, res) => {
  res.redirect('/schedule-task');
});

app.get('/add-task', requireAuth, (req, res) => {
  res.redirect('/schedule-task');
});

app.get('/add-pet.html', requireAuth, (req, res) => {
  res.redirect('/pets/add');
});

app.get('/health-tracker.html', requireAuth, (req, res) => {
  res.redirect('/health');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const { query } = require('./config/database');
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', {
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Page not found: ${req.url}`);
  res.status(404).render('error', {
    message: 'Page not found',
    error: {},
  });
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;

async function initializeApp() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Check if login.html exists
    const loginPath = path.join(__dirname, 'public', 'login.html');
    if (fs.existsSync(loginPath)) {
      console.log('✅ login.html found at:', loginPath);
    } else {
      console.error('❌ login.html NOT found at:', loginPath);
    }

    // Check public directory contents
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      console.log('📁 Public directory contents:');
      fs.readdirSync(publicDir).forEach(file => {
        console.log('  -', file);
      });
    } else {
      console.error('❌ Public directory does not exist!');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Test route: http://localhost:${PORT}/test`);
      console.log(`🔗 Direct login: http://localhost:${PORT}/direct-login`);
      console.log(`🔗 Login page: http://localhost:${PORT}/login.html`);
      console.log(`📋 Schedule task: http://localhost:${PORT}/schedule-task`);
      console.log(`🐾 Add pet: http://localhost:${PORT}/pets/add`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\nTry these URLs in your browser to test:`);
      console.log(`1. http://localhost:${PORT}/test`);
      console.log(`2. http://localhost:${PORT}/direct-login`);
      console.log(`3. http://localhost:${PORT}/login.html`);
      console.log(`4. http://localhost:${PORT}/schedule-task`);
      console.log(`5. http://localhost:${PORT}/pets/add`);
      console.log(`6. http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

initializeApp();

module.exports = app;