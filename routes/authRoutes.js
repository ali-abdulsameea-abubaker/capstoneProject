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

// GET /auth/verify?token=...
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid token.');
  try {
    const result = await verifyUser(token);
    if (result.affectedRows === 0) return res.send('Invalid or expired token.');
    res.redirect('/verify.html');
  } catch (e) {
    console.error('Verification error:', e);
    res.status(500).send('Database error during verification.');
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).send('Email and password required.');

  try {
    const user = await findByEmail(email);
    if (!user) return res.send('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.send('Wrong password');
    if (!user.is_verified) return res.send('Please verify your email first.');

    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.email = user.email;

    res.redirect('/dashboard');
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).send('Database error during login.');
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error logging out.');
    }
    res.redirect('/login.html');
  });
});

// GET /auth/me (optional helper)
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ user: null });
  const me = await findById(req.session.userId);
  res.json({ user: me ? { id: me.user_id, username: me.username, email: me.email, role: me.role } : null });
});

module.exports = router;
