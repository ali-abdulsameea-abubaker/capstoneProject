const express = require('express');
const { getTasksByUser, createTask, updateTask, deleteTask } = require('../models/taskModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// GET /tasks
router.get('/', requireAuth, async (req, res) => {
  const tasks = await getTasksByUser(req.session.userId);
  res.json(tasks);
});

// POST /tasks
router.post('/', requireAuth, async (req, res) => {
  const { pet_id, task_type, title, description, due_date, priority } = req.body || {};
  if (!pet_id || !task_type || !title || !due_date) return res.status(400).send('Missing fields.');
  try {
    await createTask(req.session.userId, { pet_id, task_type, title, description, due_date, priority });
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Create task error:', e);
    res.status(500).send('Error creating task.');
  }
});

// PUT /tasks/:taskId
router.put('/:taskId', requireAuth, async (req, res) => {
  try {
    await updateTask(req.params.taskId, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update task error:', e);
    res.status(500).send('Error updating task.');
  }
});

// DELETE /tasks/:taskId

router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    await deleteTask(req.params.taskId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete task error:', e);
    res.status(500).send('Error deleting task.');
  }
});

module.exports = router;
