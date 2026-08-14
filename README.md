# TaskFlow

A simple task board for small teams — a lightweight version of Trello.

## Tech Stack

- **Frontend**: React 18 + TypeScript (Vite)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Testing**: Jest + Supertest

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd taskflow
```

2. Install dependencies:
```bash
npm run install:all
```

3. Seed the database:
```bash
npm run seed
```

4. Start the development servers:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:5173
```

The backend runs on `http://localhost:3001`.

## Features

- ✅ Create, edit, and delete tasks
- ✅ Move tasks between columns
- ✅ Filter tasks by priority
- ✅ Task count per column
- ✅ Responsive design
- ✅ Error handling with toast notifications

## Database Schema

```sql
CREATE TABLE boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:id` | Get board with columns |
| GET | `/api/boards/:id/tasks` | Get all tasks (optional `?priority=High`) |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/move` | Move task to column |
| GET | `/api/boards/:id/stats` | Get task count per column |
| GET | `/api/boards/:id/tasks/priority/:priority` | Get tasks by priority |

## Required SQL Queries

### 1. Task Count Per Column

```sql
SELECT c.id, c.name, COUNT(t.id) as task_count
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = ?
GROUP BY c.id
ORDER BY c.position;
```

### 2. Tasks by Priority (Newest First)

```sql
SELECT t.*, c.name as column_name
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE c.board_id = ? AND t.priority = ?
ORDER BY t.created_at DESC;
```

## Testing

Run the backend tests:

```bash
npm test
```

Tests include:
1. Creating a task with empty title fails (validation)
2. Moving a task updates its column correctly
3. Database query tests (tasks per column, tasks by priority)

## Running Tests

```bash
cd backend
npm test
```

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js      # SQLite connection & initialization
│   │   ├── routes/
│   │   │   └── tasks.js         # API route handlers
│   │   ├── index.js             # Express server
│   │   └── seed.js              # Database seeder
│   ├── tests/
│   │   └── tasks.test.js        # API tests
│   ├── schema.sql               # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskBoard.tsx    # Main board component
│   │   │   ├── Column.tsx       # Column component
│   │   │   └── TaskCard.tsx     # Task card component
│   │   ├── hooks/
│   │   │   └── useBoard.ts      # Custom React hooks
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── api.ts               # API client
│   │   ├── App.tsx              # Main App component
│   │   ├── App.css              # Styles
│   │   └── main.tsx             # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── package.json                 # Root package.json
└── README.md
```

## Decisions & Assumptions

1. **SQLite chosen for simplicity**: Works out of the box without additional setup
2. **Single board assumption**: The app starts with one default board (ID: 1)
3. **Dropdown for moving tasks**: Simpler and more reliable than drag-and-drop for this scope
4. **Priority filter via query parameter**: Backend filtering for efficiency
5. **Toast notifications for errors**: Non-intrusive error display

## What I'd Improve With More Time

1. **Drag-and-drop**: Implement @dnd-kit for better UX
2. **Multiple boards**: Allow creating and switching between boards
3. **User authentication**: Add login and board sharing
4. **Real-time updates**: WebSocket support for collaborative editing
5. **Task comments and attachments**
6. **Dark mode support**

## Time Spent

Approximately 4-5 hours for the complete implementation including:
- Backend API and database: 2 hours
- Frontend components and styling: 2 hours
- Testing and documentation: 1 hour

## Interesting Learning

While building this, I found it interesting how SQLite's WAL (Write-Ahead Logging) mode significantly improves concurrent read performance while maintaining data integrity. The `better-sqlite3` library's synchronous API also simplifies error handling compared to callback-based alternatives.
