const { query } = require('../config/database');

async function getPetsByUser(userId) {
  return query(`SELECT * FROM pets WHERE user_id = ?`, [userId]);
}

async function createPet(userId, { name, breed, age, species, gender, weight }) {
  const sql = `
    INSERT INTO pets (user_id, name, breed, age, species, gender, weight) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return query(sql, [userId, name, breed, age, species, gender, weight]);
}

async function updatePet(petId, { name, breed, age, species, gender, weight }) {
  const sql = `
    UPDATE pets SET name=?, breed=?, age=?, species=?, gender=?, weight=? 
    WHERE pet_id=?
  `;
  return query(sql, [name, breed, age, species, gender, weight, petId]);
}

async function deletePet(petId) {
  return query(`DELETE FROM pets WHERE pet_id = ?`, [petId]);
}

module.exports = { getPetsByUser, createPet, updatePet, deletePet };
