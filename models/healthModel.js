const { query } = require('../config/database');

async function getHealthRecords(petId) {
  return query(`SELECT * FROM health_tracker WHERE pet_id=? ORDER BY date_recorded DESC`, [petId]);
}

async function addHealthRecord({ pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded }) {
  const sql = `
    INSERT INTO health_tracker (pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return query(sql, [pet_id, weight, diet, medical_notes, vet_visit_date, vaccination_date, next_vaccination_date, date_recorded]);
}

module.exports = { getHealthRecords, addHealthRecord };
