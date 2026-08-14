# TaskFlow Backend — Technical Documentation

**Version:** 1.0.0  
**Runtime:** Node.js 18+  
**Framework:** Express 4.18  
**Database:** SQLite 3  
**Last Updated:** 14 August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Reference](#4-api-reference)
5. [Implementation Details](#5-implementation-details)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)

---

## 1. Overview

The TaskFlow backend is a RESTful API server that handles all data operations for the task management application. It provides endpoints for managing boards, columns, and tasks with SQLite for data persistence.

### Key Features

- RESTful API design
- SQLite database with WAL mode
- Input validation and error handling
- CORS support for frontend integration
- Comprehensive test suite

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4.18 |
| Database | SQLite 3 |
| Driver | better-sqlite3 11.x |
| Testing | Jest 29.x |
| HTTP Testing | Supertest 6.x |

---

## 2. Architecture

### 2.1 Directory Structure

```
backend/
├── src/
│   ├── index.js              # Server entry point
│   ├── db/
│   │   └── database.js       # Database connection
│   └── routes/
│       └── tasks.js          # API routes
├── tests/
│   └── tasks.test.js         # Test suite
├── schema.sql                # Database schema
├── taskflow.db               # SQLite database
└── package.json              # Dependencies
```

### 2.2 Module Responsibilities

| Module | Purpose |
|--------|---------|
| `src/index.js` | Server setup, middleware, startup |
| `src/db/database.js` | DB connection, initialization |
| `src/routes/tasks.js` | API endpoints |
| `schema.sql` | Database DDL |
| `tests/tasks.test.js` | Test cases |

### 2.3 Request Flow

```
Client → Express Server → Router → Handler → Database → Response
```

---

## 3. Database Schema

### 3.1 Tables

#### boards

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### columns

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| board_id | INTEGER | NOT NULL, FK → boards(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| position | INTEGER | NOT NULL DEFAULT 0 |

#### tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| column_id | INTEGER | NOT NULL, FK → columns(id) ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| description | TEXT | OPTIONAL |
| priority | TEXT | NOT NULL, CHECK (Low/Medium/High), DEFAULT Medium |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 3.2 Indexes

```sql
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_columns_board_id ON columns(board_id);
```

### 3.3 Entity Relationships

```
boards (1) ──── (N) columns (1) ──── (N) tasks
```

---

## 4. API Reference

### 4.1 Base URL

```
http://localhost:3001/api
```

### 4.2 Endpoints

#### GET /api/boards/:id

Get board with its columns.

**Response:**
```json
{
  "id": 1,
  "name": "My Task Board",
  "created_at": "2026-08-14 05:08:48",
  "columns": [
    {
      "id": 1,
      "board_id": 1,
      "name": "To Do",
      "position": 0
    }
  ]
}
```

#### GET /api/boards/:id/tasks

Get all tasks for a board with optional priority filter.

**Query Parameters:**
- `priority` (optional): Filter by "Low", "Medium", or "High"

**Response:**
```json
[
  {
    "id": 1,
    "column_id": 1,
    "title": "Design database",
    "description": "Create schema",
    "priority": "High",
    "created_at": "2026-08-14 05:08:48",
    "column_name": "To Do"
  }
]
```

#### POST /api/tasks

Create a new task.

**Request Body:**
```json
{
  "column_id": 1,
  "title": "New Task",
  "description": "Optional description",
  "priority": "High"
}
```

**Response (201):**
```json
{
  "id": 8,
  "column_id": 1,
  "title": "New Task",
  "description": "Optional description",
  "priority": "High",
  "created_at": "2026-08-14 05:12:00"
}
```

#### PUT /api/tasks/:id

Update an existing task.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "Medium"
}
```

**Response:**
```json
{
  "id": 1,
  "column_id": 1,
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "Medium",
  "created_at": "2026-08-14 05:08:48"
}
```

#### DELETE /api/tasks/:id

Delete a task.

**Response:**
```json
{
  "message": "Task deleted successfully"
}
```

#### PATCH /api/tasks/:id/move

Move task to a different column.

**Request Body:**
```json
{
  "column_id": 2
}
```

**Response:**
```json
{
  "id": 1,
  "column_id": 2,
  "title": "Task Title",
  "description": "Description",
  "priority": "High",
  "created_at": "2026-08-14 05:08:48"
}
```

#### GET /api/boards/:id/stats

Get task count per column.

**Response:**
```json
[
  { "id": 1, "name": "To Do", "task_count": 3 },
  { "id": 2, "name": "In Progress", "task_count": 2 },
  { "id": 3, "name": "Done", "task_count": 2 }
]
```

#### GET /api/boards/:id/tasks/priority/:priority

Get tasks filtered by priority (newest first).

**Response:**
```json
[
  {
    "id": 4,
    "column_id": 2,
    "title": "High Priority Task",
    "priority": "High",
    "created_at": "2026-08-14 05:08:48",
    "column_name": "In Progress"
  }
]
```

### 4.3 Error Responses

| Status | Error Message | Cause |
|--------|---------------|-------|
| 400 | "Title is required" | Empty title |
| 400 | "Column ID is required" | Missing column_id |
| 400 | "Invalid priority" | Bad priority value |
| 404 | "Board not found" | Invalid board ID |
| 404 | "Task not found" | Invalid task ID |
| 404 | "Column not found" | Invalid column ID |
| 500 | "Failed to create task" | Server error |

---

## 5. Implementation Details

### 5.1 Database Connection

```javascript
// database.js
const Database = require('better-sqlite3');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');  // Better concurrency
    db.pragma('foreign_keys = ON');   // Enforce integrity
  }
  return db;
}
```

### 5.2 Query Pattern

```javascript
// Safe parameterized query
const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

// Insert with result
const result = db.prepare(
  'INSERT INTO tasks (column_id, title, priority) VALUES (?, ?, ?)'
).run(columnId, title, priority);

const newId = result.lastInsertRowid;
```

### 5.3 Validation Logic

```javascript
// Title validation
if (!title || title.trim() === '') {
  return res.status(400).json({ error: 'Title is required' });
}

// Priority validation
const validPriorities = ['Low', 'Medium', 'High'];
const taskPriority = priority && validPriorities.includes(priority) 
  ? priority 
  : 'Medium';
```

### 5.4 Required Queries

#### Query 1: Task Count Per Column

```sql
SELECT c.id, c.name, COUNT(t.id) as task_count
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = ?
GROUP BY c.id
ORDER BY c.position;
```

**Purpose:** Display task count badges in column headers.

#### Query 2: Tasks by Priority (Newest First)

```sql
SELECT t.*, c.name as column_name
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE c.board_id = ? AND t.priority = ?
ORDER BY t.created_at DESC;
```

**Purpose:** Filter tasks by priority level.

---

## 6. Testing

### 6.1 Test Cases

| # | Test | Type |
|---|------|------|
| 1 | Creating task with empty title fails | Validation |
| 2 | Creating task with null title fails | Validation |
| 3 | Creating task with valid data succeeds | CRUD |
| 4 | Moving task updates column correctly | Business Logic |
| 5 | Moving non-existent task returns 404 | Error Handling |
| 6 | Task count per column returns correct counts | Database Query |
| 7 | Tasks by priority filter works correctly | Database Query |
| 8 | Deleting task removes it from database | CRUD |
| 9 | Deleting non-existent task returns 404 | Error Handling |

### 6.2 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### 6.3 Test Results

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

## 7. Deployment

### 7.1 Environment Variables

```bash
PORT=3001                    # Server port
NODE_ENV=production          # Environment
DB_PATH=./taskflow.db        # Database path
```

### 7.2 Production Setup

```bash
# Install dependencies
npm install --production

# Seed database
npm run seed

# Start server
npm start
```

### 7.3 Health Check

```bash
curl http://localhost:3001/api/health

# Response:
# {"status":"ok","timestamp":"2026-08-14T05:11:39.027Z"}
```

### 7.4 Docker

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

---

## Appendix: Seed Data

### Default Board

```javascript
// Board: "My Task Board"
// Columns: To Do, In Progress, Done

// Sample Tasks:
// 1. Design database schema (High)
// 2. Set up project structure (Medium)
// 3. Write unit tests (Low)
// 4. Build API endpoints (High)
// 5. Implement frontend UI (Medium)
// 6. Project planning (Medium)
// 7. Set up version control (Low)
```

---

*Backend Technical Documentation — TaskFlow v1.0.0*
