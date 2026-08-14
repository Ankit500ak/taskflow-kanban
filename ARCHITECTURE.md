# TaskFlow — Architecture & Technical Design Document

**Version:** 1.0.0  
**Date:** 14 August 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Design](#6-database-design)
7. [API Specification](#7-api-specification)
8. [Data Flow](#8-data-flow)
9. [Security Considerations](#9-security-considerations)
10. [Performance Optimization](#10-performance-optimization)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Future Scalability](#13-future-scalability)

---

## 1. Executive Summary

TaskFlow is a lightweight task management application designed for small teams. It implements a Kanban-style board with columns representing workflow stages (To Do, In Progress, Done). The system follows a modern client-server architecture with a React-based SPA frontend and a RESTful Node.js backend, persisted via SQLite.

### Key Design Principles

- **Simplicity**: Minimal dependencies, straightforward architecture
- **Reliability**: Data persistence with relational integrity
- **Maintainability**: Clean separation of concerns, typed interfaces
- **Performance**: Optimized queries, efficient state management

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   React     │    │   State     │    │   API       │    │   Type      │  │
│  │   Components│◄──►│   Manager   │◄──►│   Client    │◄──►│   System    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                    │                                        │
│                            HTTP/REST (JSON)                                 │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Node.js)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Express   │    │   Route     │    │   Service   │    │   Database  │  │
│  │   Server    │◄──►│   Handlers  │◄──►│   Layer     │◄──►│   Layer     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                    │                                        │
│                              SQLite (WAL)                                   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA STORE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   boards    │    │   columns   │    │   tasks     │                     │
│  │   ────────  │    │   ────────  │    │   ────────  │                     │
│  │   id (PK)   │◄───│   id (PK)   │◄───│   id (PK)   │                     │
│  │   name      │    │   board_id  │    │   column_id │                     │
│  │   created_at│    │   name      │    │   title     │                     │
│  │             │    │   position  │    │   description│                    │
│  │             │    │             │    │   priority  │                     │
│  │             │    │             │    │   created_at│                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Library | React | 18.2.x | Component-based UI |
| Language | TypeScript | 5.x | Type safety |
| Bundler | Vite | 5.x | Fast development & build |
| HTTP Client | Fetch API | Native | API communication |
| Styling | CSS3 | - | Component styling |

### Backend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript execution |
| Framework | Express | 4.18.x | HTTP server |
| Database | SQLite | 3.x | Data persistence |
| DB Driver | better-sqlite3 | 11.x | Synchronous SQLite |
| Testing | Jest | 29.x | Unit/integration tests |
| HTTP Test | Supertest | 6.x | API testing |

### Development Tools

| Tool | Purpose |
|------|---------|
| nodemon | Auto-restart server |
| TypeScript | Type checking |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## 4. Backend Architecture

### 4.1 Directory Structure

```
backend/
├── src/
│   ├── index.js                    # Entry point, server initialization
│   ├── db/
│   │   └── database.js             # Database connection & initialization
│   └── routes/
│       └── tasks.js                # API route handlers
├── tests/
│   └── tasks.test.js               # Test suite
├── schema.sql                      # Database schema definition
├── taskflow.db                     # SQLite database file
├── package.json                    # Dependencies & scripts
└── .gitignore                      # Git ignore rules
```

### 4.2 Module Responsibilities

#### `src/index.js` — Server Entry Point

```javascript
// Responsibilities:
// - Initialize Express application
// - Configure middleware (CORS, JSON parsing)
// - Mount route handlers
// - Initialize database on startup
// - Start HTTP server
// - Export app for testing

// Middleware Stack:
// 1. CORS (Cross-Origin Resource Sharing)
// 2. JSON body parser (limit: 10kb)
// 3. Request logging (production)
// 4. Error handler
```

#### `src/db/database.js` — Database Layer

```javascript
// Responsibilities:
// - Manage SQLite connection pool (single connection with WAL)
// - Initialize database schema
// - Provide database access via getDb()
// - Handle connection lifecycle

// Connection Configuration:
// - Journal Mode: WAL (Write-Ahead Logging)
// - Foreign Keys: Enabled
// - Busy Timeout: 5000ms

// Exported Functions:
// - getDb(): Return database instance
// - initializeDb(): Create tables if not exist
// - closeDb(): Close connection gracefully
```

#### `src/routes/tasks.js` — Route Handlers

```javascript
// Responsibilities:
// - Define API endpoints
// - Validate request inputs
// - Execute database queries
// - Format response payloads
// - Handle errors gracefully

// Route Groups:
// 1. Board Operations (GET)
// 2. Task CRUD Operations
// 3. Task Movement
// 4. Analytics/Stats
```

### 4.3 Request Processing Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│  CORS Middleware │ ─── Validates Origin
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JSON Parser    │ ─── Parses Request Body
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │ ─── Matches URL Pattern
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Input Validation│ ─── Validates Payload
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
    Yes  │  No
    │    │
    │    └──► 400 Bad Request
    ▼
┌─────────────────┐
│  Database Query │ ─── Executes SQL
└────────┬────────┘
         │
    ┌────┴────┐
    │ Success?│
    └────┬────┘
    Yes  │  No
    │    │
    │    └──► 500 Server Error
    ▼
┌─────────────────┐
│  Format Response│ ─── JSON Payload
└────────┬────────┘
         │
         ▼
   200/201 OK
```

### 4.4 Error Handling Strategy

| Error Type | HTTP Code | Response Format |
|-----------|-----------|-----------------|
| Validation Error | 400 | `{ error: "Message" }` |
| Not Found | 404 | `{ error: "Resource not found" }` |
| Server Error | 500 | `{ error: "Internal server error" }` |

---

## 5. Frontend Architecture

### 5.1 Directory Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Root component
│   ├── App.css                     # Global styles
│   ├── api.ts                      # API client module
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── hooks/
│   │   └── useBoard.ts             # Custom React hooks
│   └── components/
│       ├── TaskBoard.tsx           # Main board container
│       ├── Column.tsx              # Column component
│       └── TaskCard.tsx            # Individual task card
├── index.html                      # HTML template
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
├── tsconfig.node.json              # Node TypeScript config
└── package.json                    # Dependencies & scripts
```

### 5.2 Component Hierarchy

```
App
└── TaskBoard
    ├── Board Header
    │   ├── Title
    │   └── Filter Controls
    ├── Error Toast (conditional)
    └── Columns Container
        ├── Column (To Do)
        │   ├── Column Header
        │   │   ├── Title
        │   │   └── Task Count
        │   ├── Task Card List
        │   │   ├── TaskCard
        │   │   │   ├── Task Header
        │   │   │   │   ├── Title
        │   │   │   │   └── Priority Badge
        │   │   │   ├── Description
        │   │   │   ├── Metadata
        │   │   │   └── Actions
        │   │   │       ├── Edit Button
        │   │   │       ├── Delete Button
        │   │   │       └── Move Dropdown
        │   │   └── ... more TaskCards
        │   └── Add Task Button / Form
        ├── Column (In Progress)
        │   └── ... similar structure
        └── Column (Done)
            └── ... similar structure
```

### 5.3 State Management

```typescript
// Application State Shape
interface AppState {
  // Board State
  board: Board | null;
  boardLoading: boolean;
  boardError: string | null;

  // Tasks State
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string | null;

  // Filter State
  priorityFilter: string;

  // UI State
  globalError: string | null;
}

// State Updates Flow
User Action
    │
    ▼
Component Handler
    │
    ├──► API Call (async)
    │        │
    │        ▼
    │    Update Backend
    │        │
    │        ▼
    │    Refetch Data
    │        │
    │        ▼
    │    Update Local State
    │
    └──► Optimistic Update (optional)
             │
             ▼
         Re-render Components
```

### 5.4 Custom Hooks

#### `useBoard` Hook

```typescript
// Purpose: Fetch and cache board data
// Returns: { board, loading, error, refetch }

// Implementation Details:
// - Uses useCallback for memoized fetch
// - Implements error boundary
// - Auto-fetches on mount
// - Supports manual refetch
```

#### `useTasks` Hook

```typescript
// Purpose: Fetch tasks with optional filtering
// Parameters: priority?: string
// Returns: { tasks, loading, error, refetch }

// Implementation Details:
// - Reacts to priority filter changes
// - Debounces filter requests (optional)
// - Handles race conditions
```

#### `useBoardStats` Hook

```typescript
// Purpose: Fetch task count per column
// Returns: { stats, loading, refetch }

// Implementation Details:
// - Updates after task mutations
// - Used for column header badges
```

### 5.5 Data Fetching Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    API Client (api.ts)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  fetchJson<T>(url, options) ─── Generic HTTP client     │
│          │                                              │
│          ├── Adds Content-Type header                   │
│          ├── Handles response status                    │
│          ├── Parses JSON response                       │
│          └── Throws on error                            │
│                                                         │
│  Exported Methods:                                      │
│  - getBoard(id)                                         │
│  - getTasks(boardId, priority?)                         │
│  - createTask(input)                                    │
│  - updateTask(id, input)                                │
│  - deleteTask(id)                                       │
│  - moveTask(taskId, columnId)                           │
│  - getBoardStats(boardId)                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.6 Component State Patterns

#### TaskCard Component State

```typescript
// Local State
{
  isEditing: boolean;        // Toggle edit mode
  editTitle: string;         // Edit form title
  editDescription: string;   // Edit form description
  editPriority: Priority;    // Edit form priority
  isMoving: boolean;         // Move operation in progress
}

// State Transitions
IDLE ──────► EDITING ──────► SAVING ──────► IDLE
  │              │              │
  │              │              └─► ERROR ──────► IDLE
  │              │
  │              └─► CANCELLED ──────► IDLE
  │
  └─► MOVING ──────► IDLE
         │
         └─► ERROR ──────► IDLE
```

---

## 6. Database Design

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                     │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │   BOARD     │         │   COLUMN    │         │    TASK     │
    ├─────────────┤    1:N  ├─────────────┤    1:N  ├─────────────┤
    │ id (PK)     │◄────────│ id (PK)     │◄────────│ id (PK)     │
    │ name        │         │ board_id(FK)│         │ column_id(FK│
    │ created_at  │         │ name        │         │ title       │
    └─────────────┘         │ position    │         │ description │
                            └─────────────┘         │ priority    │
                                                    │ created_at  │
                                                    └─────────────┘

    Relationships:
    - Board 1:N Column (one board has many columns)
    - Column 1:N Task (one column has many tasks)
    - Task N:1 Column (one task belongs to one column)
```

### 6.2 Schema Definition

```sql
-- =====================================================
-- BOARD TABLE
-- =====================================================
CREATE TABLE boards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Constraints:
-- - id: Auto-incrementing primary key
-- - name: Required, non-empty string

-- =====================================================
-- COLUMN TABLE
-- =====================================================
CREATE TABLE columns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Constraints:
-- - id: Auto-incrementing primary key
-- - board_id: Foreign key to boards table
-- - name: Required column name
-- - position: Ordering within board

-- Indexes:
CREATE INDEX idx_columns_board_id ON columns(board_id);

-- =====================================================
-- TASK TABLE
-- =====================================================
CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id   INTEGER NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    priority    TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);

-- Constraints:
-- - id: Auto-incrementing primary key
-- - column_id: Foreign key to columns table
-- - title: Required, non-empty string
-- - priority: Enum constraint (Low, Medium, High)

-- Indexes:
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

### 6.3 Data Integrity Rules

| Rule | Type | Description |
|------|------|-------------|
| FK_Cascade_Board_Column | CASCADE | Deleting a board deletes its columns |
| FK_Cascade_Column_Task | CASCADE | Deleting a column deletes its tasks |
| CK_Priority | CHECK | Priority must be Low, Medium, or High |
| NN_Title | NOT NULL | Task title cannot be null |
| NN_ColumnId | NOT NULL | Task must belong to a column |

### 6.4 Required SQL Queries

#### Query 1: Task Count Per Column

```sql
-- Purpose: Get count of tasks in each column for a board
-- Use Case: Display task count badges in column headers

SELECT 
    c.id,
    c.name,
    COUNT(t.id) as task_count
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = ?
GROUP BY c.id
ORDER BY c.position;

-- Performance Notes:
-- - Uses LEFT JOIN to include columns with 0 tasks
-- - GROUP BY aggregates at column level
-- - Index on column_id optimizes JOIN
```

#### Query 2: Tasks by Priority (Newest First)

```sql
-- Purpose: Filter tasks by priority level
-- Use Case: Priority filter dropdown

SELECT 
    t.*,
    c.name as column_name
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE c.board_id = ? 
  AND t.priority = ?
ORDER BY t.created_at DESC;

-- Performance Notes:
-- - Composite index on (priority, created_at) recommended
-- - DESC ordering for newest first
-- - Board filter ensures scope isolation
```

---

## 7. API Specification

### 7.1 Base URL

```
http://localhost:3001/api
```

### 7.2 Endpoints

#### Board Endpoints

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/boards/:id` | Get board with columns | - | Board object with columns array |

#### Task Endpoints

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/boards/:id/tasks` | Get all tasks | Query: `priority` | Task array |
| POST | `/tasks` | Create task | Task body | Created task |
| PUT | `/tasks/:id` | Update task | Task body | Updated task |
| DELETE | `/tasks/:id` | Delete task | - | Success message |
| PATCH | `/tasks/:id/move` | Move task | `{ column_id }` | Updated task |

#### Analytics Endpoints

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/boards/:id/stats` | Task count per column | - | Stats array |

### 7.3 Request/Response Schemas

#### POST /api/tasks — Create Task

```typescript
// Request Body
{
  column_id: number;      // Required
  title: string;          // Required, non-empty
  description?: string;   // Optional
  priority?: "Low" | "Medium" | "High";  // Default: "Medium"
}

// Success Response (201)
{
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High";
  created_at: string;     // ISO datetime
}

// Error Response (400)
{
  error: string;          // "Title is required"
}
```

#### PATCH /api/tasks/:id/move — Move Task

```typescript
// Request Body
{
  column_id: number;      // Required, target column
}

// Success Response (200)
{
  id: number;
  column_id: number;
  title: string;
  // ... other task fields
}

// Error Response (404)
{
  error: string;          // "Task not found"
}
```

### 7.4 Error Responses

| Status | Error Message | Cause |
|--------|---------------|-------|
| 400 | "Title is required" | Empty or null title |
| 400 | "Column ID is required" | Missing column_id |
| 400 | "Invalid priority" | Priority not in enum |
| 404 | "Board not found" | Invalid board ID |
| 404 | "Task not found" | Invalid task ID |
| 404 | "Column not found" | Invalid column ID |
| 500 | "Failed to create task" | Database error |

---

## 8. Data Flow

### 8.1 Task Creation Flow

```
User clicks "+ Add Task"
         │
         ▼
┌─────────────────────┐
│ Column Component    │
│ - Shows add form    │
└──────────┬──────────┘
           │
User fills form, clicks "Add Task"
           │
           ▼
┌─────────────────────┐
│ Validate Input      │
│ - Title required    │
│ - Priority valid    │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │ Valid?  │
      └────┬────┘
      Yes  │  No
      │    │
      │    └──► Show Error Toast
      ▼
┌─────────────────────┐
│ api.createTask()    │
│ POST /api/tasks     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Handler     │
│ - Validate again    │
│ - Insert into DB    │
│ - Return new task   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Frontend Updates    │
│ - refetchTasks()    │
│ - refetchStats()    │
│ - Clear form        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UI Re-renders       │
│ - New task appears  │
│ - Column count ↑    │
└─────────────────────┘
```

### 8.2 Task Move Flow

```
User selects column from dropdown
         │
         ▼
┌─────────────────────┐
│ TaskCard Component  │
│ - handleMove()      │
│ - Set isMoving=true │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ api.moveTask()      │
│ PATCH /api/tasks/:id│
│ Body: { column_id } │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Handler     │
│ - Validate task     │
│ - Validate column   │
│ - Update column_id  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Frontend Updates    │
│ - refetchTasks()    │
│ - refetchStats()    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UI Re-renders       │
│ - Task in new column│
│ - Counts updated    │
└─────────────────────┘
```

### 8.3 Filter Flow

```
User changes priority filter
         │
         ▼
┌─────────────────────┐
│ TaskBoard Component │
│ - setPriorityFilter │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useTasks hook       │
│ - priority changes  │
│ - useEffect fires   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ api.getTasks()      │
│ GET /api/boards/1/  │
│     tasks?priority= │
│     High            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Query       │
│ - Filter by priority│
│ - Return matching   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UI Updates          │
│ - Show filtered     │
│   tasks only        │
└─────────────────────┘
```

---

## 9. Security Considerations

### 9.1 Input Validation

| Input | Validation Rule | Location |
|-------|-----------------|----------|
| task.title | Required, trimmed, max 255 chars | Backend + Frontend |
| task.description | Optional, max 1000 chars | Backend |
| task.priority | Enum: Low, Medium, High | Backend + Frontend |
| column_id | Valid integer, exists in DB | Backend |

### 9.2 SQL Injection Prevention

```javascript
// ✅ SAFE: Parameterized query
db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

// ❌ UNSAFE: String interpolation (NEVER DO THIS)
db.prepare(`SELECT * FROM tasks WHERE id = ${taskId}`).get();
```

### 9.3 CORS Configuration

```javascript
// Production CORS settings
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
```

### 9.4 Error Handling

```javascript
// Never expose internal errors to client
try {
  // database operation
} catch (error) {
  console.error('Internal error:', error);  // Log internally
  res.status(500).json({ error: 'Failed to create task' });  // Generic message
}
```

---

## 10. Performance Optimization

### 10.1 Database Optimization

```sql
-- Indexes for common queries
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_columns_board_id ON columns(board_id);

-- WAL mode for concurrent reads
PRAGMA journal_mode = WAL;
```

### 10.2 Frontend Optimization

| Technique | Implementation |
|-----------|----------------|
| Memoization | useCallback for fetch functions |
| Lazy Loading | Component-based code splitting |
| Debouncing | Filter input (optional) |
| Optimistic Updates | Immediate UI feedback (optional) |

### 10.3 API Optimization

| Technique | Implementation |
|-----------|----------------|
| Query Select | Only fetch needed columns |
| Pagination | Limit/offset for large datasets |
| Caching | HTTP cache headers |

---

## 11. Testing Strategy

### 11.1 Test Pyramid

```
                    ┌─────────┐
                    │  E2E    │  ← Future: Cypress/Playwright
                    │ Tests   │
                   ┌┴─────────┴┐
                   │Integration │  ← Supertest API tests
                   │   Tests    │
                  ┌┴───────────┴┐
                  │   Unit      │  ← Jest unit tests
                  │   Tests     │
                  └─────────────┘
```

### 11.2 Test Coverage

| Area | Test Type | Coverage |
|------|-----------|----------|
| Validation | Unit | 100% of validation rules |
| CRUD Operations | Integration | All endpoints |
| Database Queries | Integration | Required queries |
| Error Handling | Integration | All error paths |

### 11.3 Test Cases

```javascript
// 1. Validation Tests
describe('POST /api/tasks', () => {
  it('rejects empty title', () => { /* ... */ });
  it('rejects null title', () => { /* ... */ });
  it('creates task with valid data', () => { /* ... */ });
});

// 2. Business Logic Tests
describe('PATCH /api/tasks/:id/move', () => {
  it('moves task to different column', () => { /* ... */ });
  it('returns 404 for non-existent task', () => { /* ... */ });
});

// 3. Database Query Tests
describe('Database Queries', () => {
  it('returns correct task count per column', () => { /* ... */ });
  it('filters tasks by priority', () => { /* ... */ });
});
```

---

## 12. Deployment Architecture

### 12.1 Production Setup

```
┌─────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                         │
│                    (nginx/HAProxy)                       │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │  Server 1 │   │  Server 2 │   │  Server 3 │
    │  (Node)   │   │  (Node)   │   │  (Node)   │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  Shared SQLite  │
                │  (NFS/EFS)      │
                └─────────────────┘
```

### 12.2 Deployment Options

| Platform | Type | Effort |
|----------|------|--------|
| Render | PaaS | Low |
| Railway | PaaS | Low |
| Fly.io | Containers | Medium |
| Vercel + PlanetScale | Serverless | Medium |
| AWS EC2 | IaaS | High |

### 12.3 Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=3001
DB_PATH=/data/taskflow.db

# Frontend
VITE_API_URL=https://your-api-url.com/api
```

---

## 13. Future Scalability

### 13.1 Short-term Enhancements

| Feature | Complexity | Impact |
|---------|-----------|--------|
| Drag-and-drop | Medium | High UX |
| Task search | Low | Medium |
| Dark mode | Low | Medium |
| Task comments | Medium | High |

### 13.2 Medium-term Enhancements

| Feature | Complexity | Impact |
|---------|-----------|--------|
| User authentication | High | High |
| Multiple boards | Medium | High |
| Real-time updates | High | High |
| File attachments | Medium | Medium |

### 13.3 Long-term Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MICROSERVICES                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Auth      │  │   Board     │  │   Task      │    │
│  │   Service   │  │   Service   │  │   Service   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│                    Message Queue                        │
│                    (Redis/RabbitMQ)                     │
│                          │                             │
│                          ▼                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  PostgreSQL │  │   Redis     │  │   S3        │    │
│  │  (Primary)  │  │   (Cache)   │  │  (Files)    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix A: Configuration Files

### A.1 Backend package.json

```json
{
  "name": "taskflow-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --detectOpenHandles",
    "seed": "node src/seed.js"
  }
}
```

### A.2 Frontend vite.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Appendix B: Coding Standards

### B.1 JavaScript Style

- Use `const` by default, `let` when reassignment needed
- Async/await over raw promises
- Descriptive variable names
- Early returns for guard clauses

### B.2 TypeScript Style

- Prefer interfaces over types
- Explicit return types on functions
- No `any` type usage
- Strict null checks enabled

### B.3 CSS Style

- BEM naming convention
- CSS custom properties for theming
- Mobile-first responsive design
- Consistent spacing (8px grid)

---

*Document prepared by TaskFlow Development Team*  
*Last updated: 14 August 2026*
