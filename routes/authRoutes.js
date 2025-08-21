const HARDCODED_ADMIN_EMAIL = 'admin-petCare-2025@petcare.com';




const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUser, findByEmail, findByUsername, verifyUser, findById } = require('../models/userModel');
const { queryOne } = require('../config/database');
const sendEmail = require('../email/sendVerification');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body || {};
  if (!email || !password || !username) return res.status(400).send('Email, password, and username are required.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).send('Please enter a valid email address.');
  if (password.length < 8) return res.status(400).send('Password must be at least 8 characters long.');

  try {
    const existing = await queryOne('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing) return res.status(400).send(existing.email === email ? 'Email already in use.' : 'Username already taken.');

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    await createUser(username, email, hash, token);
    await sendEmail(email, token, username);

    res.send('Check your email to verify your account.');
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).send('Server error during registration.');
  }
});

// In your authRoutes.js, update the verification route:
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).render('error', {
    title: 'Error',
    message: 'Invalid token.',
    error: {}
  });
  
  try {
    const result = await verifyUser(token);
    if (result.affectedRows === 0) return res.render('error', {
      title: 'Error',
      message: 'Invalid or expired token.',
      error: {}
    });
    
    res.render('verify', { title: 'Email Verified - Pet Care' });
  } catch (e) {
    console.error('Verification error:', e);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during verification.',
      error: process.env.NODE_ENV === 'development' ? e : {}
    });
  }
});

// POST /auth/login



// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password, isAdminLogin } = req.body || {};
  if (!email || !password) return res.status(400).send('Email and password required.');

  try {
    const user = await findByEmail(email);
    if (!user) return res.status(400).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Invalid credentials' 
    });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Wrong password' 
    });
    
    if (!user.is_verified && user.email !== HARDCODED_ADMIN_EMAIL) {
      return res.status(400).render('login', { 
        title: 'Login - Pet Care Management',
        error: 'Please verify your email first.' 
      });
    }

    // Auto-promote hardcoded admin email to admin role
    if (user.email === HARDCODED_ADMIN_EMAIL && user.role !== 'admin') {
      await query('UPDATE users SET role = "admin" WHERE user_id = ?', [user.user_id]);
      user.role = 'admin';
    }

    // Check if trying to access admin panel but not an admin
    if (isAdminLogin && user.role !== 'admin') {
      return res.status(403).render('login', { 
        title: 'Login - Pet Care Management',
        error: 'Access denied. Admin privileges required.' 
      });
    }

    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.email = user.email;

    // Redirect to admin dashboard if admin login or hardcoded admin
    if ((user.role === 'admin' && isAdminLogin) || user.email === HARDCODED_ADMIN_EMAIL) {
      return res.redirect('/admin/dashboard');
    }
    
    // Regular user login
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Database error during login.' 
    });
  }
});


// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Error logging out.',
        error: process.env.NODE_ENV === 'development' ? err : {}
      });
    }
    res.redirect('/login'); // This should point to your EJS route
  });
});

// GET /auth/me (optional helper)
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ user: null });
  const me = await findById(req.session.userId);
  res.json({ user: me ? { id: me.user_id, username: me.username, email: me.email, role: me.role } : null });
});

module.exports = router;
