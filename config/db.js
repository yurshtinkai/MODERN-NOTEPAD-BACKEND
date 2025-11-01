// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// 1. Create the Pool (This is what your controllers will use)
// This pool connects directly to the database.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: process.env.DB_POOL_SIZE ? Number(process.env.DB_POOL_SIZE) : 10,
  queueLimit: 0,
  ssl: parseSsl(process.env.DB_SSL),
  connectTimeout: 10000,
  dateStrings: true,
  timezone: 'Z',
});

// 2. Create the Database & Tables Initialization Function
const initDb = async () => {
  const shouldInit = process.env.INIT_DB === 'true';
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  if (isProd && !shouldInit) {
    console.log('Skipping DB init in production (set INIT_DB=true to enable).');
    return;
  }
  let connection;
  try {
    // Connect to MySQL server *without* specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: parseSsl(process.env.DB_SSL),
      connectTimeout: 10000,
    });

    // Create the database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`
    );

    // Now, select the database to use
    await connection.query(`USE \`${process.env.DB_NAME}\`;`);

    // Create the notepad_users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notepad_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'Untitled Note',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES notepad_users(id) ON DELETE CASCADE
      );
    `);

    // Create archived notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS archived_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'Untitled Note',
        content TEXT,
        created_at TIMESTAMP NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES notepad_users(id) ON DELETE CASCADE
      );
    `);

    console.log('Database & tables checked/created successfully.');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1); // Exit the process with an error
  } finally {
    if (connection) {
      await connection.end(); // Close the temporary connection
    }
  }
};

// 3. Export both the pool and the init function
module.exports = { pool, initDb };

// Helpers
function parseSsl(flag) {
  if (!flag) return undefined;
  const value = String(flag).toLowerCase();
  if (value === 'true' || value === 'required' || value === 'on') {
    // Many managed MySQL providers require SSL but use public CA; adjust if needed
    return { rejectUnauthorized: true };
  }
  if (value === 'false' || value === 'off') return undefined;
  // Allow custom modes later
  return { rejectUnauthorized: true };
}