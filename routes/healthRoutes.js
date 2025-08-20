const express = require('express');
const { getHealthRecords, addHealthRecord } = require('../models/healthModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// GET /health/records/:petId
router.get('/records/:petId', requireAuth, async (req, res) => {
  const records = await getHealthRecords(req.params.petId);
  res.json(records);
});

// POST /health
router.post('/', requireAuth, async (req, res) => {
  try {
    await addHealthRecord(req.body);
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Health tracker error:', e);
    res.status(500).send('Error adding health record.');
  }
});

module.exports = router;
