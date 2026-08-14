# TaskFlow Backend Architecture

**Version:** 1.0.0  
**Runtime:** Node.js 18+  
**Framework:** Express 4.18  
**Database:** SQLite 3 (via better-sqlite3)  
**Last Updated:** 14 August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Server Architecture](#4-server-architecture)
5. [Database Layer](#5-database-layer)
6. [Route Handlers](#6-route-handlers)
7. [Data Models](#7-data-models)
8. [API Endpoints](#8-api-endpoints)
9. [Query Analysis](#9-query-analysis)
10. [Error Handling](#10-error-handling)
11. [Security](#11-security)
12. [Testing](#12-testing)
13. [Deployment](#13-deployment)

---

## 1. Overview

The TaskFlow backend is a RESTful API server built with Node.js and Express. It provides endpoints for managing boards, columns, and tasks with SQLite for data persistence.

### Key Responsibilities

- Serve RESTful API endpoints
- Validate and sanitize inputs
- Execute database operations
- Return JSON responses
- Handle errors gracefully

### Design Principles

- **Simplicity**: Minimal dependencies, straightforward code
- **Reliability**: Data integrity via foreign keys and constraints
- **Testability**: Modular design for easy unit/integration testing
- **Security**: Input validation and parameterized queries

---

## 2. Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript execution |
| Framework | Express | 4.18.x | HTTP server |
| Database | SQLite | 3.x | Data persistence |
| DB Driver | better-sqlite3 | 11.x | Synchronous SQLite |
| Testing | Jest | 29.x | Test runner |
| HTTP Test | Supertest | 6.x | API testing |

### Core Dependencies

```json
{
  "better-sqlite3": "^11.0.0",
  "cors": "^2.8.5",
  "express": "^4.18.2"
}
```

### Dev Dependencies

```json
{
  "jest": "^29.7.0",
  "nodemon": "^3.0.0",
  "supertest": "^6.3.3"
}
```

---

## 3. Project Structure

```
backend/
├── src/
│   ├── index.js                    # Server entry point
│   ├── db/
│   │   └── database.js             # Database connection & init
│   └── routes/
│       └── tasks.js                # API route handlers
├── tests/
│   └── tasks.test.js               # Test suite
├── schema.sql                      # Database schema
├── taskflow.db                     # SQLite database file
├── package.json                    # Dependencies & scripts
└── .gitignore                      # Git ignore rules
```

### File Responsibilities

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.js` | Server setup, middleware, startup | ~40 |
| `src/db/database.js` | DB connection, initialization | ~35 |
| `src/routes/tasks.js` | All API endpoints | ~200 |
| `schema.sql` | Database schema DDL | ~30 |
| `tests/tasks.test.js` | Test suite | ~150 |

---

## 4. Server Architecture

### 4.1 Server Initialization

```javascript
// src/index.js

const express = require('express');
const cors = require('cors');
const { initializeDb } = require('./db/database');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware stack
app.use(cors());
app.use(express.json());

// Initialize database
initializeDb();

// Mount routes
app.use('/api', taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
```

### 4.2 Middleware Stack

```
Request
   │
   ▼
┌─────────────────┐
│  CORS           │ ─── Handle cross-origin requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JSON Parser    │ ─── Parse request body
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Router         │ ─── Match route handlers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Error Handler  │ ─── Catch unhandled errors
└─────────────────┘
```

### 4.3 Request Processing

```javascript
// Request lifecycle
1. Client sends HTTP request
2. CORS middleware validates origin
3. JSON parser decodes body
4. Router matches URL to handler
5. Handler validates input
6. Handler executes database query
7. Handler formats response
8. Response sent to client
9. Error handler catches any errors
```

---

## 5. Database Layer

### 5.1 Connection Management

```javascript
// src/db/database.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'taskflow.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');  // Write-Ahead Logging
    db.pragma('foreign_keys = ON');   // Enforce foreign keys
  }
  return db;
}

function initializeDb() {
  const database = getDb();
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
  database.exec(schema);
  return database;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initializeDb, closeDb, DB_PATH };
```

### 5.2 Connection Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Journal Mode | WAL | Better concurrent reads |
| Foreign Keys | ON | Enforce referential integrity |
| Busy Timeout | 5000ms | Wait on locked database |

### 5.3 Schema Definition

```sql
-- schema.sql

-- Board table
CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Column table
CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Task table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
```

### 5.4 Database Operations Pattern

```javascript
// Parameterized query pattern (SAFE)
const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

// Insert pattern
const result = db.prepare(
  'INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)'
).run(columnId, title, description, priority);

// Update pattern
db.prepare(
  'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?'
).run(title, description, priority, taskId);

// Delete pattern
db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
```

---

## 6. Route Handlers

### 6.1 Route Organization

```javascript
// src/routes/tasks.js

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Board routes
router.get('/boards/:id', getBoard);
router.get('/boards/:id/tasks', getTasks);
router.get('/boards/:id/stats', getBoardStats);
router.get('/boards/:id/tasks/priority/:priority', getTasksByPriority);

// Task routes
router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);
router.patch('/tasks/:id/move', moveTask);

module.exports = router;
```

### 6.2 Handler Structure

```javascript
// Common handler pattern
async function handler(req, res) {
  try {
    const db = getDb();
    const { param1, param2 } = req.params;
    const { body1, body2 } = req.body;
    const { query1 } = req.query;

    // 1. Validate input
    if (!body1) {
      return res.status(400).json({ error: 'Field required' });
    }

    // 2. Check existence
    const existing = db.prepare('SELECT * FROM table WHERE id = ?').get(param1);
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 3. Execute operation
    const result = db.prepare('INSERT INTO ...').run(/* ... */);

    // 4. Return response
    const newRecord = db.prepare('SELECT * FROM ...').get(result.lastInsertRowid);
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to ...' });
  }
}
```

---

## 7. Data Models

### 7.1 Board Model

```javascript
// Board object shape
{
  id: number,           // Primary key
  name: string,         // Board name
  created_at: string,   // ISO datetime
  columns: Column[]     // Associated columns
}
```

### 7.2 Column Model

```javascript
// Column object shape
{
  id: number,           // Primary key
  board_id: number,     // Foreign key to boards
  name: string,         // Column name
  position: number      // Sort order
}
```

### 7.3 Task Model

```javascript
// Task object shape
{
  id: number,           // Primary key
  column_id: number,    // Foreign key to columns
  title: string,        // Task title (required)
  description: string,  // Task description (optional)
  priority: string,     // "Low" | "Medium" | "High"
  created_at: string,   // ISO datetime
  column_name: string   // Joined from columns table
}
```

### 7.4 Stats Model

```javascript
// ColumnStats object shape
{
  id: number,           // Column ID
  name: string,         // Column name
  task_count: number    // Count of tasks
}
```

---

## 8. API Endpoints

### 8.1 Board Endpoints

#### GET /api/boards/:id

```javascript
// Description: Get board with columns
// Parameters: id (path) - Board ID
// Response: Board object with columns array

// Handler:
router.get('/boards/:id', (req, res) => {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  
  const columns = db.prepare(
    'SELECT * FROM columns WHERE board_id = ? ORDER BY position'
  ).all(req.params.id);
  
  res.json({ ...board, columns });
});
```

### 8.2 Task Endpoints

#### GET /api/boards/:id/tasks

```javascript
// Description: Get all tasks for board
// Parameters: 
//   - id (path): Board ID
//   - priority (query): Optional filter
// Response: Array of task objects

// Handler:
router.get('/boards/:id/tasks', (req, res) => {
  const db = getDb();
  const { priority } = req.query;
  
  let query = `
    SELECT t.*, c.name as column_name 
    FROM tasks t 
    JOIN columns c ON t.column_id = c.id 
    WHERE c.board_id = ?
  `;
  const params = [req.params.id];
  
  if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }
  
  query += ' ORDER BY t.created_at DESC';
  
  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});
```

#### POST /api/tasks

```javascript
// Description: Create a new task
// Request Body: { column_id, title, description?, priority? }
// Response: Created task object

// Handler:
router.post('/tasks', (req, res) => {
  const db = getDb();
  const { column_id, title, description, priority } = req.body;
  
  // Validation
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  if (!column_id) {
    return res.status(400).json({ error: 'Column ID is required' });
  }
  
  // Validate priority
  const validPriorities = ['Low', 'Medium', 'High'];
  const taskPriority = priority && validPriorities.includes(priority) 
    ? priority 
    : 'Medium';
  
  // Check column exists
  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(column_id);
  if (!column) {
    return res.status(404).json({ error: 'Column not found' });
  }
  
  // Insert
  const result = db.prepare(
    'INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)'
  ).run(column_id, title.trim(), description || null, taskPriority);
  
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newTask);
});
```

#### PUT /api/tasks/:id

```javascript
// Description: Update a task
// Parameters: id (path) - Task ID
// Request Body: { title, description?, priority? }
// Response: Updated task object

// Handler:
router.put('/tasks/:id', (req, res) => {
  const db = getDb();
  const { title, description, priority } = req.body;
  
  // Check exists
  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Validation
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  // Validate priority
  const validPriorities = ['Low', 'Medium', 'High'];
  const taskPriority = priority && validPriorities.includes(priority) 
    ? priority 
    : existingTask.priority;
  
  // Update
  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?'
  ).run(title.trim(), description || null, taskPriority, req.params.id);
  
  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updatedTask);
});
```

#### DELETE /api/tasks/:id

```javascript
// Description: Delete a task
// Parameters: id (path) - Task ID
// Response: Success message

// Handler:
router.delete('/tasks/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted successfully' });
});
```

#### PATCH /api/tasks/:id/move

```javascript
// Description: Move task to different column
// Parameters: id (path) - Task ID
// Request Body: { column_id }
// Response: Updated task object

// Handler:
router.patch('/tasks/:id/move', (req, res) => {
  const db = getDb();
  const { column_id } = req.body;
  
  // Check task exists
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Check target column exists
  const targetColumn = db.prepare('SELECT * FROM columns WHERE id = ?').get(column_id);
  if (!targetColumn) {
    return res.status(404).json({ error: 'Target column not found' });
  }
  
  // Update
  db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(column_id, req.params.id);
  
  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updatedTask);
});
```

### 8.3 Analytics Endpoints

#### GET /api/boards/:id/stats

```javascript
// Description: Get task count per column
// Parameters: id (path) - Board ID
// Response: Array of column stats

// Handler:
router.get('/boards/:id/stats', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT c.id, c.name, COUNT(t.id) as task_count
    FROM columns c
    LEFT JOIN tasks t ON c.id = t.column_id
    WHERE c.board_id = ?
    GROUP BY c.id
    ORDER BY c.position
  `).all(req.params.id);
  
  res.json(stats);
});
```

#### GET /api/boards/:id/tasks/priority/:priority

```javascript
// Description: Get tasks by priority (newest first)
// Parameters: 
//   - id (path): Board ID
//   - priority (path): Priority level
// Response: Array of task objects

// Handler:
router.get('/boards/:id/tasks/priority/:priority', (req, res) => {
  const db = getDb();
  const { priority } = req.params;
  
  if (!['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }
  
  const tasks = db.prepare(`
    SELECT t.*, c.name as column_name
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    WHERE c.board_id = ? AND t.priority = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id, priority);
  
  res.json(tasks);
});
```

---

## 9. Query Analysis

### 9.1 Query 1: Task Count Per Column

```sql
SELECT 
    c.id,
    c.name,
    COUNT(t.id) as task_count
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = ?
GROUP BY c.id
ORDER BY c.position;
```

**Execution Plan:**
1. Scan `columns` table using `idx_columns_board_id` index
2. For each column, perform LEFT JOIN with `tasks` table
3. Use `idx_tasks_column_id` index for JOIN
4. GROUP BY column ID
5. COUNT tasks per group
6. ORDER BY position

**Performance Characteristics:**
- Time Complexity: O(n + m) where n = columns, m = tasks
- Space Complexity: O(n) for result set
- Index Usage: 2 indexes utilized

### 9.2 Query 2: Tasks by Priority

```sql
SELECT 
    t.*,
    c.name as column_name
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE c.board_id = ? 
  AND t.priority = ?
ORDER BY t.created_at DESC;
```

**Execution Plan:**
1. Scan `tasks` table using `idx_tasks_priority` index
2. For each task, JOIN with `columns` table
3. Use primary key index on `columns.id`
4. Filter by board_id (from joined column)
5. ORDER BY created_at DESC

**Performance Characteristics:**
- Time Complexity: O(m) where m = matching tasks
- Space Complexity: O(m) for result set
- Index Usage: 1 index utilized (priority)

---

## 10. Error Handling

### 10.1 Error Types

| Error Type | HTTP Code | Response |
|-----------|-----------|----------|
| Validation Error | 400 | `{ error: "Message" }` |
| Not Found | 404 | `{ error: "Resource not found" }` |
| Server Error | 500 | `{ error: "Internal server error" }` |

### 10.2 Validation Errors

```javascript
// Title validation
if (!title || title.trim() === '') {
  return res.status(400).json({ error: 'Title is required' });
}

// Column ID validation
if (!column_id) {
  return res.status(400).json({ error: 'Column ID is required' });
}

// Priority validation
if (!['Low', 'Medium', 'High'].includes(priority)) {
  return res.status(400).json({ error: 'Invalid priority' });
}
```

### 10.3 Not Found Errors

```javascript
// Board not found
const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
if (!board) {
  return res.status(404).json({ error: 'Board not found' });
}

// Task not found
const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
if (!task) {
  return res.status(404).json({ error: 'Task not found' });
}
```

### 10.4 Server Errors

```javascript
try {
  // Database operation
} catch (error) {
  console.error('Database error:', error);
  res.status(500).json({ error: 'Failed to create task' });
}
```

### 10.5 Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

---

## 11. Security

### 11.1 SQL Injection Prevention

```javascript
// ✅ SAFE: Parameterized queries
db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

// ❌ UNSAFE: String interpolation (NEVER DO THIS)
db.prepare(`SELECT * FROM tasks WHERE id = ${taskId}`).get();
```

### 11.2 Input Validation

| Input | Validation | Location |
|-------|-----------|----------|
| title | Required, trimmed | Backend + Frontend |
| description | Optional, string | Backend |
| priority | Enum check | Backend + Frontend |
| column_id | Integer, exists | Backend |

### 11.3 CORS Configuration

```javascript
// Development
app.use(cors());

// Production
app.use(cors({
  origin: ['https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
```

### 11.4 Rate Limiting (Future)

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 12. Testing

### 12.1 Test Setup

```javascript
// tests/tasks.test.js

const request = require('supertest');
const app = require('../src/index');
const { initializeDb, getDb, closeDb } = require('../src/db/database');

beforeAll(() => {
  initializeDb();
});

afterAll(() => {
  closeDb();
});
```

### 12.2 Test Cases

#### Validation Tests

```javascript
describe('POST /api/tasks', () => {
  it('should reject creating a task with empty title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        column_id: columnId,
        title: '',
        description: 'Test',
        priority: 'High'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  it('should reject creating a task with null title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        column_id: columnId,
        title: null
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });
});
```

#### Business Logic Tests

```javascript
describe('PATCH /api/tasks/:id/move', () => {
  it('should move task to a different column', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/move`)
      .send({ column_id: newColumnId });

    expect(res.status).toBe(200);
    expect(res.body.column_id).toBe(newColumnId);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/api/tasks/99999/move')
      .send({ column_id: columnId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});
```

#### Database Query Tests

```javascript
describe('Database Queries', () => {
  it('should return correct task count per column', async () => {
    const res = await request(app)
      .get(`/api/boards/${boardId}/stats`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    const firstStat = res.body[0];
    expect(firstStat).toHaveProperty('id');
    expect(firstStat).toHaveProperty('name');
    expect(firstStat).toHaveProperty('task_count');
  });

  it('should filter tasks by priority', async () => {
    const res = await request(app)
      .get(`/api/boards/${boardId}/tasks/priority/Low`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    res.body.forEach(task => {
      expect(task.priority).toBe('Low');
    });
  });
});
```

### 12.3 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/tasks.test.js
```

### 12.4 Test Results

```
PASS tests/tasks.test.js
  Task API
    POST /api/tasks
      ✓ should reject creating a task with empty title
      ✓ should reject creating a task with null title
      ✓ should create a new task successfully
    PATCH /api/tasks/:id/move
      ✓ should move task to a different column
      ✓ should return 404 for non-existent task
    Database Queries
      ✓ should return correct task count per column
      ✓ should filter tasks by priority
    DELETE /api/tasks/:id
      ✓ should delete a task
      ✓ should return 404 for non-existent task

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

---

## 13. Deployment

### 13.1 Environment Variables

```bash
# Required
NODE_ENV=production
PORT=3001

# Optional
DB_PATH=/data/taskflow.db
```

### 13.2 Production Build

```bash
# Install dependencies
npm install --production

# Seed database
npm run seed

# Start server
npm start
```

### 13.3 Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npm run seed

EXPOSE 3001

CMD ["npm", "start"]
```

### 13.4 Deployment Platforms

| Platform | Method | Notes |
|----------|--------|-------|
| Render | Git push | Auto-deploy |
| Railway | Git push | Auto-deploy |
| Fly.io | CLI deploy | Container-based |
| AWS EC2 | Manual | Full control |

### 13.5 Health Check

```javascript
// GET /api/health
{
  "status": "ok",
  "timestamp": "2026-08-14T05:11:39.027Z"
}
```

---

## Appendix A: Database Queries Reference

### A.1 All Queries

```sql
-- Get board with columns
SELECT * FROM boards WHERE id = ?;
SELECT * FROM columns WHERE board_id = ? ORDER BY position;

-- Get tasks for board
SELECT t.*, c.name as column_name 
FROM tasks t 
JOIN columns c ON t.column_id = c.id 
WHERE c.board_id = ?
ORDER BY t.created_at DESC;

-- Create task
INSERT INTO tasks (column_id, title, description, priority) 
VALUES (?, ?, ?, ?);

-- Update task
UPDATE tasks SET title = ?, description = ?, priority = ? 
WHERE id = ?;

-- Delete task
DELETE FROM tasks WHERE id = ?;

-- Move task
UPDATE tasks SET column_id = ? WHERE id = ?;

-- Task count per column
SELECT c.id, c.name, COUNT(t.id) as task_count
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = ?
GROUP BY c.id
ORDER BY c.position;

-- Tasks by priority
SELECT t.*, c.name as column_name
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE c.board_id = ? AND t.priority = ?
ORDER BY t.created_at DESC;
```

---

## Appendix B: Configuration Reference

### B.1 package.json Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --detectOpenHandles",
    "seed": "node src/seed.js"
  }
}
```

### B.2 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ]
};
```

---

*Backend Architecture Document — TaskFlow v1.0.0*
