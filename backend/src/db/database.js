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

function ensureDefaultColumnsForBoard(database, boardId) {
  const existingColumns = database.prepare('SELECT id FROM columns WHERE board_id = ? ORDER BY position').all(boardId);
  if (existingColumns.length > 0) {
    return;
  }

  ['To Do', 'Doing', 'Completed', 'On Hold'].forEach((name, index) => {
    database.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)').run(boardId, name, index);
  });
}

function ensureDefaultUserAndBoard(database) {
  const existing = database.prepare('SELECT id FROM users WHERE email = ?').get('default@example.com');

  if (existing) {
    const board = database.prepare('SELECT id FROM boards WHERE user_id = ? LIMIT 1').get(existing.id);
    if (!board) {
      const result = database.prepare('INSERT INTO boards (name, user_id) VALUES (?, ?)').run('Task Board', existing.id);
      ensureDefaultColumnsForBoard(database, result.lastInsertRowid);
      return;
    }

    const boardColumns = database.prepare('SELECT id FROM columns WHERE board_id = ?').all(board.id);
    if (boardColumns.length === 0) {
      ensureDefaultColumnsForBoard(database, board.id);
    }
    return;
  }

  const result = database.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
    .run('Default User', 'default@example.com', 'reset-required');
  const boardResult = database.prepare('INSERT INTO boards (name, user_id) VALUES (?, ?)').run('Task Board', result.lastInsertRowid);
  ensureDefaultColumnsForBoard(database, boardResult.lastInsertRowid);
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

    // Fix stale or empty databases automatically when the app starts.
    try {
      const users = database.prepare('SELECT id, name, email FROM users ORDER BY id').all();
      if (users.length === 0) {
        ensureDefaultUserAndBoard(database);
      } else {
        for (const user of users) {
          const board = database.prepare('SELECT id FROM boards WHERE user_id = ? ORDER BY id LIMIT 1').get(user.id);
          if (!board) {
            const result = database.prepare('INSERT INTO boards (name, user_id) VALUES (?, ?)').run('Task Board', user.id);
            ensureDefaultColumnsForBoard(database, result.lastInsertRowid);
          } else {
            const boardColumns = database.prepare('SELECT id FROM columns WHERE board_id = ?').all(board.id);
            if (boardColumns.length === 0) {
              ensureDefaultColumnsForBoard(database, board.id);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Automatic board repair failed:', error.message || error);
    }

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
