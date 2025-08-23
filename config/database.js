// const mysql = require('mysql2/promise');
// require('dotenv').config();

// const dbConfig = {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT || 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   charset: 'utf8mb4',
//   timezone: '+00:00'
// };

// const pool = mysql.createPool(dbConfig);

// // Test connection
// async function testConnection() {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ Connected to MySQL database successfully');
//     connection.release();
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     return false;
//   }
// }

// // Helper function for queries
// async function query(sql, params) {
//   try {
//     const [rows] = await pool.execute(sql, params);
//     return rows;
//   } catch (error) {
//     console.error('Database query error:', error);
//     throw error;
//   }
// }

// // Helper function for single row queries
// async function queryOne(sql, params) {
//   const rows = await query(sql, params);
//   return rows[0] || null;
// }

// module.exports = {
//   pool,
//   testConnection,
//   query,
//   queryOne
// };
// 
// 
const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {};

if (process.env.JAWSDB_URL) {
  // Parse JAWSDB connection string
  const url = new URL(process.env.JAWSDB_URL);

  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    port: url.port || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00'
  };

  console.log('✅ Using JawsDB connection on Heroku');
} else {
  // Fallback for local development
  dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00'
  };

  console.log('✅ Using local MySQL connection');
}

const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Query helpers
async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = {
  pool,
  testConnection,
  query,
  queryOne
};
