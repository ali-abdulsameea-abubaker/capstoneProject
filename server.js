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
const { testConnection, query } = require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');
const communityRoutes = require('./routes/communityRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ===== Create Express app =====
const app = express();

// ===== Session Middleware (MUST COME FIRST) =====
// Trust Heroku proxy
app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ===== Custom Middleware (AFTER session) =====
// Make profile picture and username available to all views
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.profilePicture = req.session.profilePicture || null;
    res.locals.username = req.session.username || null;
    res.locals.userId = req.session.userId;
    res.locals.role = req.session.role;
  } else {
    res.locals.profilePicture = null;
    res.locals.username = null;
    res.locals.userId = null;
    res.locals.role = null;
  }
  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ===== Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Add this line
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(compression());

// Rate limiting with higher limit for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
});
app.use(limiter);
// ===== Application Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== Authentication Middleware =====
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// ===== Test Route =====
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// ===== Main Routes =====
app.use('/auth', authRoutes);
app.use('/pets', requireAuth, petRoutes);
app.use('/tasks', requireAuth, taskRoutes);
app.use('/health', requireAuth, healthRoutes);
app.use('/community', requireAuth, communityRoutes);
app.use('/profile', requireAuth, profileRoutes);
app.use('/admin', adminRoutes);

// ===== Page Routes =====
// Landing page route
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('landing', { title: 'Pet Care - Home' });
});

// Home route redirect
app.get('/home', (req, res) => {
  res.redirect('/');
});

// Login page
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login - Pet Care Management' });
});

// Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Register - Pet Care Management' });
});

// Forgot password page
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password - Pet Care' });
});

// Reset password page
app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/login');
  }
  res.render('reset-password', { title: 'Reset Password - Pet Care', token });
});

// Verification success page
app.get('/verify', (req, res) => {
  res.render('verify', { title: 'Email Verified - Pet Care' });
});


// Dashboard route (protected)
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [
      req.session.userId,
    ]);

    const tasks = await query(
      `SELECT t.*, p.name as pet_name 
       FROM tasks t 
       JOIN pets p ON t.pet_id = p.pet_id 
       WHERE t.user_id = ? AND t.completed = false AND t.due_date >= NOW() 
       ORDER BY t.due_date LIMIT 5`,
      [req.session.userId]
    );

    res.render('dashboard', {
      title: 'Pet Dashboard',
      username: req.session.username,
      pets,
      tasks,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading dashboard.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Add pet form
app.get('/pets/add', requireAuth, (req, res) => {
  res.render('add-pet', { title: 'Add New Pet' });
});

// Health tracker page
app.get('/health', requireAuth, (req, res) => {
  res.render('health-tracker', { title: 'Health Tracker' });
});

// Community page
app.get('/community', requireAuth, async (req, res) => {
  try {
    const posts = await query(`
      SELECT cp.*, u.username 
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.user_id
      ORDER BY cp.created_at DESC
    `);
    
    res.render('community', { 
      title: 'Community',
      posts
    });
  } catch (err) {
    console.error('Community error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading community page.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Schedule task form with pet data
app.get('/schedule-task', requireAuth, async (req, res) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE user_id = ?', [
      req.session.userId,
    ]);
    
    if (pets.length === 0) {
      return res.redirect('/pets/add?message=Please add a pet first.');
    }
    
    res.render('schedule-task', { 
      title: 'Schedule Task',
      pets 
    });
  } catch (err) {
    console.error('Schedule task form error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading task form.',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Admin login route
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { title: 'Admin Login - Pet Care Management' });
});

// Health check endpoint
app.get('/health-check', async (req, res) => {
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

// Serve CSS files with correct MIME type
app.get('*.css', (req, res, next) => {
  res.setHeader('Content-Type', 'text/css');
  next();
});

// Debug middleware for static files
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    console.log('CSS request:', req.url);
  }
  next();
});

// // Serve theme CSS
// app.get('/css/theme.css', (req, res) => {
//   res.setHeader('Content-Type', 'text/css');
//   res.sendFile(path.join(__dirname, 'public/css/theme.css'));
// });

// // Serve theme JS
// app.get('/js/theme.js', (req, res) => {
//   res.setHeader('Content-Type', 'application/javascript');
//   res.sendFile(path.join(__dirname, 'public/js/theme.js'));
// });

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
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

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health-check`);
      console.log(`🔗 Login page: http://localhost:${PORT}/login`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
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