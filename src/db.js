const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rakshakx.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB connection error:", err);
    else console.log("Connected to SQLite DB");
});

// Create users table if not exists
db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    premium INTEGER DEFAULT 0
)
`);

module.exports = db;
