const express = require('express');
const { getPetsByUser, createPet, updatePet, deletePet } = require('../models/petModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// GET /pets
router.get('/', requireAuth, async (req, res) => {
  const pets = await getPetsByUser(req.session.userId);
  res.json(pets);
});

// POST /pets
router.post('/', requireAuth, async (req, res) => {
  const { name, breed, age, species, gender, weight } = req.body || {};
  if (!name) return res.status(400).send('Pet name is required.');
  try {
    await createPet(req.session.userId, { name, breed, age, species, gender, weight });
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Add pet error:', e);
    res.status(500).send('Error adding pet.');
  }
});

// PUT /pets/:petId
router.put('/:petId', requireAuth, async (req, res) => {
  try {
    await updatePet(req.params.petId, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update pet error:', e);
    res.status(500).send('Error updating pet.');
  }
});

// DELETE /pets/:petId

router.delete('/:petId', requireAuth, async (req, res) => {
  try {
    await deletePet(req.params.petId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete pet error:', e);
    res.status(500).send('Error deleting pet.');
  }
});

module.exports = router;
