const { query } = require('../config/database');

async function getTasksByUser(userId) {
  const sql = `
    SELECT t.*, p.name as pet_name 
    FROM tasks t
    JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.user_id = ?
    ORDER BY t.due_date ASC
  `;
  return query(sql, [userId]);
}

async function createTask(userId, { pet_id, task_type, title, description, due_date, priority }) {
  const sql = `
    INSERT INTO tasks (user_id, pet_id, task_type, title, description, due_date, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return query(sql, [userId, pet_id, task_type, title, description, due_date, priority]);
}

async function updateTask(taskId, { title, description, due_date, completed, priority }) {
  const sql = `
    UPDATE tasks SET title=?, description=?, due_date=?, completed=?, priority=? 
    WHERE task_id=?
  `;
  return query(sql, [title, description, due_date, completed, priority, taskId]);
}

async function deleteTask(taskId) {
  return query(`DELETE FROM tasks WHERE task_id=?`, [taskId]);
}

module.exports = { getTasksByUser, createTask, updateTask, deleteTask };
