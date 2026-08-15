const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDb } = require('../db/database');
const { signToken } = require('../middleware/auth');

const sanitizeString = (str) => (typeof str === 'string' ? str.trim() : '');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;

const ensureDefaultBoardForUser = (db, userId) => {
  const existingBoard = db.prepare('SELECT id FROM boards WHERE user_id = ? ORDER BY id LIMIT 1').get(userId);
  if (!existingBoard) {
    db.prepare('INSERT INTO boards (name, user_id) VALUES (?, ?)').run('Task Board', userId);
  }
};

// POST /api/auth/register - Create a new user
router.post('/register', (req, res) => {
  try {
    const db = getDb();
    const { name, email, password } = req.body;

    const cleanName = sanitizeString(name);
    const cleanEmail = sanitizeString(email).toLowerCase();

    // Validation
    if (!cleanName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (cleanName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be at most ${MAX_NAME_LENGTH} characters` });
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    ).run(cleanName, cleanEmail, hashedPassword);

    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    ensureDefaultBoardForUser(db, user.id);

    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - Authenticate a user
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;

    const cleanEmail = sanitizeString(email).toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    ensureDefaultBoardForUser(db, user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    };
    const token = signToken(safeUser);

    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me - Get current user from token
router.get('/me', (req, res) => {
  try {
    const db = getDb();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7);
    const { verifyToken } = require('../middleware/auth');
    const payload = verifyToken(token);

    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// POST /api/auth/guest - Login or create guest user
router.post('/guest', (req, res) => {
  try {
    const db = getDb();
    const guestEmail = 'guest@taskflow.local';

    let user = db.prepare('SELECT id, name, email, created_at FROM users WHERE email = ?').get(guestEmail);

    if (!user) {
      const hashedPassword = bcrypt.hashSync('guest_password_123', 10);
      const result = db.prepare(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
      ).run('Guest', guestEmail, hashedPassword);
      user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    ensureDefaultBoardForUser(db, user.id);

    const token = signToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('Error with guest login:', error);
    res.status(500).json({ error: 'Failed to login as guest' });
  }
});

module.exports = router;
