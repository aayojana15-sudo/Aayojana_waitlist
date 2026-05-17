const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files like index.html

// PostgreSQL Pool
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Render's managed PostgreSQL
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'root',
        port: 5432,
      }
);

// Initialize database table
const initDb = async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS waitlist_entries');
    await pool.query(`
      CREATE TABLE waitlist_entries (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        business_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        city VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
};

initDb();

// Waitlist Endpoint
app.post('/api/waitlist', async (req, res) => {
  const { type, business_name, name, phone, email, city } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO waitlist_entries (type, business_name, name, phone, email, city)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [type, business_name, name, phone, email || null, city]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error inserting waitlist entry:", err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Phone number or email already registered' });
    }
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
