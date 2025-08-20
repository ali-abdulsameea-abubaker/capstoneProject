const { query, queryOne } = require('../config/database');

async function createUser(username, email, passwordHash, token) {
  const sql = `
    INSERT INTO users (username, email, password_hash, verification_token) 
    VALUES (?, ?, ?, ?)
  `;
  return query(sql, [username, email, passwordHash, token]);
}

async function findByEmail(email) {
  return queryOne(`SELECT * FROM users WHERE email = ?`, [email]);
}

async function findByUsername(username) {
  return queryOne(`SELECT * FROM users WHERE username = ?`, [username]);
}

async function findById(id) {
  return queryOne(`SELECT * FROM users WHERE user_id = ?`, [id]);
}

async function verifyUser(token) {
  const sql = `UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = ?`;
  return query(sql, [token]);
}

async function updateProfile(userId, { username, email, bio, profile_picture_url }) {
  const sql = `UPDATE users SET username=?, email=?, bio=?, profile_picture_url=? WHERE user_id=?`;
  return query(sql, [username, email, bio, profile_picture_url, userId]);
}

async function deleteUser(userId) {
  return query(`DELETE FROM users WHERE user_id=?`, [userId]);
}

module.exports = {
  createUser,
  findByEmail,
  findByUsername,
  findById,
  verifyUser,
  updateProfile,
  deleteUser
};
