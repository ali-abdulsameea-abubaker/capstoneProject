const express = require('express');
const { getPosts, createPost, addComment, getComments } = require('../models/communityModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login.html');
}

// GET /community
router.get('/', requireAuth, async (req, res) => {
  try {
    const posts = await getPosts();
    res.render('community', { 
      title: 'Community',
      posts 
    });
  } catch (error) {
    console.error('Community error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading community page.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// POST /community
router.post('/', requireAuth, async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).send('Title and content are required.');
  await createPost(req.session.userId, { title, content });
  res.redirect('/community');
});

// GET /community/:postId/comments
router.get('/:postId/comments', requireAuth, async (req, res) => {
  const comments = await getComments(req.params.postId);
  res.json(comments);
});

// POST /community/:postId/comments
router.post('/:postId/comments', requireAuth, async (req, res) => {
  const { content } = req.body || {};
  if (!content) return res.status(400).send('Content is required.');
  await addComment(req.session.userId, req.params.postId, content);
  res.redirect('/community');
});

module.exports = router;
