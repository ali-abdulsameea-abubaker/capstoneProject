const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'Admin privileges required to access this page.'
  });
}

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Get stats for admin dashboard
    const [userCount, petCount, taskCount, postCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM pets'),
      query('SELECT COUNT(*) as count FROM tasks'),
      query('SELECT COUNT(*) as count FROM community_posts')
    ]);

    // Get recent users
    const recentUsers = await query(`
      SELECT user_id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Get pending posts for approval
    const pendingPosts = await query(`
      SELECT p.post_id, p.title, u.username, p.created_at 
      FROM community_posts p 
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.is_approved = FALSE 
      ORDER BY p.created_at DESC
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      userCount: userCount[0].count,
      petCount: petCount[0].count,
      taskCount: taskCount[0].count,
      postCount: postCount[0].count,
      recentUsers,
      pendingPosts
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading admin dashboard.'
    });
  }
});

// User management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT user_id, username, email, role, is_verified, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.render('admin/users', {
      title: 'User Management',
      users
    });
  } catch (error) {
    console.error('User management error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading user management.'
    });
  }
});

// Post moderation
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await query(`
      SELECT p.post_id, p.title, p.content, p.is_approved, u.username, p.created_at 
      FROM community_posts p 
      JOIN users u ON p.user_id = u.user_id 
      ORDER BY p.created_at DESC
    `);
    
    res.render('admin/posts', {
      title: 'Post Moderation',
      posts
    });
  } catch (error) {
    console.error('Post moderation error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading post moderation.'
    });
  }
});

// Approve post
router.post('/posts/:id/approve', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE community_posts SET is_approved = TRUE WHERE post_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ success: false, error: 'Error approving post' });
  }
});

// Delete post
router.post('/posts/:id/delete', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM community_posts WHERE post_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: 'Error deleting post' });
  }
});

// Update user role
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await query('UPDATE users SET role = ? WHERE user_id = ?', [role, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Error updating user role' });
  }
});

module.exports = router;