# TaskFlow Frontend Architecture

**Version:** 1.0.0  
**Framework:** React 18 + TypeScript  
**Build Tool:** Vite 5  
**Last Updated:** 14 August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Component Architecture](#4-component-architecture)
5. [State Management](#5-state-management)
6. [Type System](#6-type-system)
7. [API Integration](#7-api-integration)
8. [Custom Hooks](#8-custom-hooks)
9. [Styling Architecture](#9-styling-architecture)
10. [Performance Optimization](#10-performance-optimization)
11. [Error Handling](#11-error-handling)
12. [Testing Strategy](#12-testing-strategy)
13. [Build & Deployment](#13-build-deployment)

---

## 1. Overview

The TaskFlow frontend is a single-page application (SPA) built with React 18 and TypeScript. It provides an interactive Kanban-style task board with columns representing workflow stages.

### Key Responsibilities

- Render board UI with columns and tasks
- Handle user interactions (create, edit, delete, move tasks)
- Manage application state
- Communicate with backend API
- Display validation errors and loading states

### Design Principles

- **Component-based**: Modular, reusable UI components
- **Typed**: Full TypeScript coverage for type safety
- **Declarative**: React's declarative UI paradigm
- **Responsive**: Mobile-first design approach

---

## 2. Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| UI Library | React | 18.2.x | Component rendering |
| Language | TypeScript | 5.x | Type safety |
| Bundler | Vite | 5.x | Dev server & build |
| Linting | ESLint | 8.x | Code quality |
| Formatting | Prettier | 3.x | Code style |

### Core Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

### Dev Dependencies

```json
{
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.0.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0"
}
```

---

## 3. Project Structure

```
frontend/
├── public/                      # Static assets
│   └── vite.svg                 # Favicon
├── src/
│   ├── components/              # React components
│   │   ├── TaskBoard.tsx        # Main board container
│   │   ├── Column.tsx           # Column component
│   │   └── TaskCard.tsx         # Task card component
│   ├── hooks/                   # Custom React hooks
│   │   └── useBoard.ts          # Data fetching hooks
│   ├── types/                   # TypeScript definitions
│   │   └── index.ts             # Interface definitions
│   ├── api.ts                   # API client module
│   ├── App.tsx                  # Root component
│   ├── App.css                  # Global styles
│   └── main.tsx                 # Entry point
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tsconfig.node.json           # Node TS config
└── vite.config.ts               # Vite config
```

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase with `use` | `useBoard.ts` |
| Types | PascalCase | `index.ts` |
| Utils | camelCase | `api.ts` |
| Styles | PascalCase | `App.css` |

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
main.tsx
└── App.tsx
    └── TaskBoard.tsx
        ├── Header (inline)
        │   ├── Board Title
        │   └── Filter Controls
        ├── Error Toast (conditional)
        └── Columns Container
            └── Column.tsx (×3)
                ├── Column Header
                │   ├── Column Title
                │   └── Task Count Badge
                ├── Task List
                │   └── TaskCard.tsx (×n)
                │       ├── Task Header
                │       │   ├── Title
                │       │   └── Priority Badge
                │       ├── Description
                │       ├── Metadata
                │       └── Actions
                │           ├── Edit Button
                │           ├── Delete Button
                │           └── Move Dropdown
                └── Add Task Button / Form
```

### 4.2 Component Specifications

#### TaskBoard Component

```typescript
// Location: src/components/TaskBoard.tsx
// Purpose: Main container, manages global state

// Props: None (top-level component)
// State:
//   - priorityFilter: string
//   - globalError: string | null

// Responsibilities:
// - Fetch board data on mount
// - Fetch tasks with filter
// - Pass data to child components
// - Handle global error display
```

#### Column Component

```typescript
// Location: src/components/Column.tsx
// Purpose: Render a single column with its tasks

// Props:
interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  allColumns: ColumnType[];
  taskCount: number;
  onUpdate: () => void;
  onError: (message: string) => void;
}

// State:
//   - isAdding: boolean
//   - newTitle: string
//   - newDescription: string
//   - newPriority: Priority

// Responsibilities:
// - Render column header with task count
// - Render task list
// - Handle add task form
// - Pass callbacks to task cards
```

#### TaskCard Component

```typescript
// Location: src/components/TaskCard.tsx
// Purpose: Render individual task with actions

// Props:
interface TaskCardProps {
  task: Task;
  columns: Column[];
  onUpdate: () => void;
  onError: (message: string) => void;
}

// State:
//   - isEditing: boolean
//   - editTitle: string
//   - editDescription: string
//   - editPriority: Priority
//   - isMoving: boolean

// Responsibilities:
// - Display task information
// - Handle edit mode toggle
// - Handle task updates
// - Handle task deletion
// - Handle task movement
```

### 4.3 Component Communication

```
┌─────────────────────────────────────────────────────────┐
│                  DATA FLOW PATTERN                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TaskBoard (State Owner)                                │
│      │                                                  │
│      ├─── tasks ──────────► Column ─────► TaskCard      │
│      │                                                  │
│      ├─── columns ────────► Column ─────► TaskCard      │
│      │                                                  │
│      ├─── onUpdate() ─────► Column ─────► TaskCard      │
│      │        │                                     │   │
│      │        └───────────── Mutation Complete ─────┘   │
│      │                                                  │
│      └─── onError() ──────► Column ─────► TaskCard      │
│               │                                     │   │
│               └───────────── Error Occurs ──────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. State Management

### 5.1 State Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    STATE CATEGORIES                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SERVER STATE (Async, fetched from API)          │   │
│  │ - board: Board | null                           │   │
│  │ - tasks: Task[]                                 │   │
│  │ - stats: ColumnStats[]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ UI STATE (Synchronous, local to components)     │   │
│  │ - loading: boolean                              │   │
│  │ - error: string | null                          │   │
│  │ - isEditing: boolean                            │   │
│  │ - isAdding: boolean                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ FILTER STATE (User-controlled)                  │   │
│  │ - priorityFilter: string                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 State Management Pattern

```typescript
// Using React hooks for state management
// No external state library needed for this scope

// TaskBoard.tsx
const [priorityFilter, setPriorityFilter] = useState<string>('');
const { tasks, loading, error, refetch } = useTasks(priorityFilter);
const { stats, refetch: refetchStats } = useBoardStats();

// Column.tsx
const [isAdding, setIsAdding] = useState(false);
const [newTitle, setNewTitle] = useState('');
const [newDescription, setNewDescription] = useState('');
const [newPriority, setNewPriority] = useState<Priority>('Medium');

// TaskCard.tsx
const [isEditing, setIsEditing] = useState(false);
const [editTitle, setEditTitle] = useState(task.title);
const [editDescription, setEditDescription] = useState(task.description || '');
const [editPriority, setEditPriority] = useState(task.priority);
const [isMoving, setIsMoving] = useState(false);
```

### 5.3 State Update Flow

```
User Action (Click, Input, etc.)
         │
         ▼
Component Event Handler
         │
         ├──► Update Local State (immediate)
         │         │
         │         ▼
         │    Re-render
         │
         └──► Async Operation (API call)
                   │
                   ▼
              Loading State = true
                   │
                   ▼
              API Response
                   │
              ┌────┴────┐
              │ Success │
              └────┬────┘
              Yes  │  No
              │    │
              │    └──► Error State = message
              │              │
              │              ▼
              │         Toast Notification
              │
              ▼
         refetchData()
                   │
                   ▼
              Update Server State
                   │
                   ▼
              Re-render with new data
```

---

## 6. Type System

### 6.1 Core Interfaces

```typescript
// src/types/index.ts

export interface Board {
  id: number;
  name: string;
  created_at: string;
  columns: Column[];
}

export interface Column {
  id: number;
  board_id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
  column_name?: string;
}

export interface ColumnStats {
  id: number;
  name: string;
  task_count: number;
}
```

### 6.2 Input Types

```typescript
export interface CreateTaskInput {
  column_id: number;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
}
```

### 6.3 Type Utilities

```typescript
// Union type for priority
export type Priority = 'Low' | 'Medium' | 'High';

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Optional fields helper
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### 6.4 Type Safety Benefits

| Feature | Benefit |
|---------|---------|
| Compile-time errors | Catch bugs before runtime |
| IDE autocomplete | Faster development |
| Refactoring support | Safe code changes |
| Documentation | Self-documenting code |

---

## 7. API Integration

### 7.1 API Client Module

```typescript
// src/api.ts

const API_BASE = 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Exported API methods
export const api = {
  getBoard: (id: number) => fetchJson<Board>(`${API_BASE}/boards/${id}`),
  getTasks: (boardId: number, priority?: string) => { /* ... */ },
  createTask: (task: CreateTaskInput) => fetchJson<Task>(`${API_BASE}/tasks`, { /* ... */ }),
  updateTask: (id: number, task: UpdateTaskInput) => fetchJson<Task>(`${API_BASE}/tasks/${id}`, { /* ... */ }),
  deleteTask: (id: number) => fetchJson<{ message: string }>(`${API_BASE}/tasks/${id}`, { /* ... */ }),
  moveTask: (taskId: number, columnId: number) => fetchJson<Task>(`${API_BASE}/tasks/${taskId}/move`, { /* ... */ }),
  getBoardStats: (boardId: number) => fetchJson<ColumnStats[]>(`${API_BASE}/boards/${boardId}/stats`),
};
```

### 7.2 Request/Response Types

```typescript
// Request types match backend expectations
interface CreateTaskRequest {
  column_id: number;
  title: string;
  description?: string;
  priority?: Priority;
}

// Response types match backend responses
interface TaskResponse {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  created_at: string;
}
```

### 7.3 Error Handling in API

```typescript
// Centralized error handling
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, { /* ... */ });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Network errors, parse errors, etc.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}
```

---

## 8. Custom Hooks

### 8.1 useBoard Hook

```typescript
// src/hooks/useBoard.ts

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getBoard(BOARD_ID);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return { board, loading, error, refetch: fetchBoard };
}
```

### 8.2 useTasks Hook

```typescript
export function useTasks(priority?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTasks(BOARD_ID, priority);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [priority]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}
```

### 8.3 Hook Patterns

| Pattern | Implementation |
|---------|----------------|
| Memoization | `useCallback` for fetch functions |
| Effect cleanup | Automatic via React |
| State encapsulation | Each hook manages its own state |
| Error boundaries | Try-catch in async operations |

---

## 9. Styling Architecture

### 9.1 CSS Strategy

- **Approach**: Plain CSS with component-scoped classes
- **Naming**: BEM-like convention
- **Responsive**: Mobile-first media queries
- **Theming**: CSS custom properties (future)

### 9.2 Class Naming Convention

```css
/* Block */
.task-card { }

/* Element */
.task-card__header { }
.task-card__title { }
.task-card__priority { }

/* Modifier */
.task-card--editing { }
.task-card--high-priority { }
```

### 9.3 Responsive Breakpoints

```css
/* Mobile first */
.column {
  flex: 0 0 320px;
}

/* Tablet */
@media (max-width: 768px) {
  .columns-container {
    flex-direction: column;
  }
  
  .column {
    flex: none;
    width: 100%;
  }
}
```

### 9.4 CSS Custom Properties

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-danger: #ef4444;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  
  /* Typography */
  --font-size-sm: 0.8rem;
  --font-size-base: 0.9rem;
  --font-size-lg: 1rem;
}
```

---

## 10. Performance Optimization

### 10.1 React Optimizations

| Technique | Implementation | Benefit |
|-----------|----------------|---------|
| Memoization | `useCallback` | Prevent unnecessary re-renders |
| Lazy loading | Dynamic imports | Reduce initial bundle |
| Virtualization | Windowing (future) | Handle large lists |

### 10.2 Bundle Optimization

```typescript
// Lazy load components (future)
const TaskBoard = React.lazy(() => import('./components/TaskBoard'));

// Code splitting by route
const About = React.lazy(() => import('./pages/About'));
```

### 10.3 Network Optimization

| Strategy | Implementation |
|----------|----------------|
| Caching | HTTP cache headers |
| Debouncing | Filter input (future) |
| Pagination | Limit/offset (future) |

---

## 11. Error Handling

### 11.1 Error Types

| Type | Source | Handling |
|------|--------|----------|
| Network Error | API unreachable | Show retry message |
| Validation Error | Invalid input | Show inline error |
| Server Error | Backend failure | Show toast notification |
| Parse Error | Invalid JSON | Show generic error |

### 11.2 Error Display

```typescript
// Toast notification pattern
const [globalError, setGlobalError] = useState<string | null>(null);

const handleError = (message: string) => {
  setGlobalError(message);
  setTimeout(() => setGlobalError(null), 5000);
};

// JSX
{globalError && (
  <div className="error-toast">
    {globalError}
    <button onClick={() => setGlobalError(null)}>×</button>
  </div>
)}
```

### 11.3 Error Boundary (Future)

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

---

## 12. Testing Strategy

### 12.1 Test Types

| Type | Tool | Coverage |
|------|------|----------|
| Unit Tests | Jest | Components, hooks, utils |
| Integration Tests | React Testing Library | Component interactions |
| E2E Tests | Cypress/Playwright (future) | Full user flows |

### 12.2 Component Testing

```typescript
// Example: TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} columns={[]} onUpdate={() => {}} onError={() => {}} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onUpdate after successful edit', async () => {
    const onUpdate = jest.fn();
    render(<TaskCard task={mockTask} columns={[]} onUpdate={onUpdate} onError={() => {}} />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));
    
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### 12.3 Hook Testing

```typescript
// Example: useBoard.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useBoard } from './useBoard';

test('useBoard returns board data', async () => {
  const { result } = renderHook(() => useBoard());
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  expect(result.current.board).toBeDefined();
});
```

---

## 13. Build & Deployment

### 13.1 Build Configuration

```typescript
// vite.config.ts
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
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### 13.2 Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### 13.3 Deployment Options

| Platform | Method | Notes |
|----------|--------|-------|
| Vercel | Git integration | Auto-deploy on push |
| Netlify | Git integration | Auto-deploy on push |
| AWS S3 | CLI upload | Manual deployment |
| Docker | Container build | Custom setup |

### 13.4 Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3001/api

# .env.production
VITE_API_URL=https://your-api.com/api
```

---

## Appendix: Component Props Reference

### TaskBoard Props
```
None (top-level component)
```

### Column Props
```typescript
{
  column: ColumnType;
  tasks: Task[];
  allColumns: ColumnType[];
  taskCount: number;
  onUpdate: () => void;
  onError: (message: string) => void;
}
```

### TaskCard Props
```typescript
{
  task: Task;
  columns: Column[];
  onUpdate: () => void;
  onError: (message: string) => void;
}
```

---

*Frontend Architecture Document — TaskFlow v1.0.0*
