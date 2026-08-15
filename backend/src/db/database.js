const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'taskflow.db');

let db;

function getDb() {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 5000');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }
  return db;
}

function initializeDb() {
  try {
    const database = getDb();
    const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    database.exec(schema);

    // Migrations: add columns if they don't exist
    try { database.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT"); } catch (_) { /* already exists */ }
    try { database.exec("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE"); } catch (_) { /* already exists */ }
    try { database.exec("ALTER TABLE tasks ADD COLUMN status TEXT CHECK (status IN ('To Do', 'Doing', 'Completed', 'On Hold')) DEFAULT 'To Do'"); } catch (_) { /* already exists */ }
    try { database.exec("ALTER TABLE tasks ADD COLUMN collaborators TEXT"); } catch (_) { /* already exists */ }
    try { database.exec("ALTER TABLE tasks ADD COLUMN reporter TEXT"); } catch (_) { /* already exists */ }
    // Ensure default user exists (needed for boards foreign key)
    try {
      const user = database.prepare('SELECT * FROM users WHERE id = 1').get();
      if (!user) {
        database.exec("INSERT INTO users (name, email) VALUES ('Default User', 'default@example.com')");
      }
    } catch (_) { /* already exists */ }

    // Ensure default board exists
    try { database.exec("INSERT OR IGNORE INTO boards (id, name, user_id) VALUES (1, 'Task Board', 1)"); } catch (_) { /* already exists */ }

    console.log('Database initialized successfully');
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

function closeDb() {
  if (db) {
    try {
      db.close();
      db = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Failed to close database:', error);
      throw error;
    }
  }
}

function resetDb() {
  if (db) {
    db.close();
    db = null;
  }
  // Remove database file
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Database file removed');
  }
}

module.exports = { getDb, initializeDb, closeDb, resetDb, DB_PATH };
