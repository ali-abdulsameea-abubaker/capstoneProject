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

// ===== Create Express app =====
const app = express();

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

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
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
    }
  }
}));

app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Session middleware
// Trust Heroku proxy
app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // keep true
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ===== Application Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== Test Route =====
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// ===== Main Routes =====
app.use('/auth', authRoutes);
app.use('/pets', petRoutes);
app.use('/tasks', taskRoutes);
app.use('/health', healthRoutes);
app.use('/community', communityRoutes);

// ===== Page Routes =====
// Add this route before your other routes in server.js
// Landing page route
app.get('/', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('landing', { title: 'Pet Care - Home' });
});

// Update the root route to redirect to landing page
app.get('/home', (req, res) => {
  res.redirect('/');
});

// Serve login page

app.get('/login', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login - Pet Care Management' });
});

// Serve register page
app.get('/register', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Register - Pet Care Management' });
});

// Serve forgot password page
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password - Pet Care' });
});

// Serve reset password page
app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/login');
  }
  res.render('reset-password', { title: 'Reset Password - Pet Care', token });
});

// Serve verification success page
app.get('/verify', (req, res) => {
  res.render('verify', { title: 'Email Verified - Pet Care' });
});

// Root route
app.get('/', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
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

// Admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// Admin login route
app.get('/admin/login', (req, res) => {
  if (req.session?.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { title: 'Admin Login - Pet Care Management' });
});

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