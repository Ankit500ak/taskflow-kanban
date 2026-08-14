import { Board, Task, CreateTaskInput, UpdateTaskInput, ColumnStats, AuthUser, Project, CreateProjectInput, UpdateProjectInput, ProjectTask, CreateProjectTaskInput, UpdateProjectTaskInput } from './types';

const API_BASE = 'https://taskflow-kanban-trcl.onrender.com/api';

export function getToken() {
  return localStorage.getItem('taskflow_token');
}

export function setToken(token: string) {
  localStorage.setItem('taskflow_token', token);
}

export function clearToken() {
  localStorage.removeItem('taskflow_token');
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  
  // Check if url is already a full URL or just a path
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
  const fullUrl = isFullUrl ? url : API_BASE + url;
  
  // Debug: Log the full URL being fetched
  if (typeof window !== 'undefined') {
    console.log('API Request:', fullUrl);
    console.log('Auth token present:', !!token);
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    // Detailed error reporting
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      let errorMsg;
      switch (response.status) {
        case 0:
          errorMsg = 'NETWORK_ERROR: Unable to connect to server. Check if backend is running and CORS is configured. Full URL: ' + fullUrl;
          break;
        case 400:
          errorMsg = 'BAD_REQUEST: Invalid request data. Check form inputs.';
          break;
        case 401:
          errorMsg = 'UNAUTHORIZED: Invalid credentials or expired token.';
          break;
        case 409:
          errorMsg = 'CONFLICT: Account with this email already exists.';
          break;
        case 500:
          errorMsg = 'SERVER_ERROR: Something went wrong on the backend.';
          break;
        default:
          errorMsg = 'HTTP ' + response.status + ' ' + (response.statusText || '');
      }
      throw new Error(errorMsg + ' | Response: ' + errorText.substring(0, 150));
    }

    // Log successful response
    if (typeof window !== 'undefined') {
      console.log('API Success:', fullUrl);
    }
    return response.json();
  } catch (error: any) {
    // Comprehensive error handling
    if (typeof window !== 'undefined') {
      console.error('API Fetch Error:', error.message);
      console.error('Full URL:', isFullUrl ? url : API_BASE + url);
    }
    throw error;
  }
}

export const api = {
  // Auth
  register: (name: string, email: string, password: string) =>
    fetchJson<{ token: string; user: AuthUser }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    fetchJson<{ token: string; user: AuthUser }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  guestLogin: () =>
    fetchJson<{ token: string; user: AuthUser }>(`${API_BASE}/auth/guest`, {
      method: 'POST',
    }),

  getMe: () =>
    fetchJson<{ user: AuthUser }>(`${API_BASE}/auth/me`),

  // Board
  getBoard: (id: number) =>
    fetchJson<Board>(`${API_BASE}/boards/${id}`),

  getTasks: (boardId: number, priority?: string) => {
    const url = priority
      ? `${API_BASE}/boards/${boardId}/tasks?priority=${priority}`
      : `${API_BASE}/boards/${boardId}/tasks`;
    return fetchJson<Task[]>(url);
  },

  createTask: (task: CreateTaskInput) =>
    fetchJson<Task>(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  updateTask: (id: number, task: UpdateTaskInput) =>
    fetchJson<Task>(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),

  deleteTask: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    }),

  moveTask: (taskId: number, columnId: number) =>
    fetchJson<Task>(`${API_BASE}/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ column_id: columnId }),
    }),

  getBoardStats: (boardId: number) =>
    fetchJson<ColumnStats[]>(`${API_BASE}/boards/${boardId}/stats`),

  // Subtasks
  getSubtasks: (taskId: number) =>
    fetchJson<any[]>(`${API_BASE}/tasks/${taskId}/subtasks`),

  createSubtask: (taskId: number, sub: { title: string; priority?: string; member?: string }) =>
    fetchJson<any>(`${API_BASE}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(sub),
    }),

  updateSubtask: (subId: number, patch: { title?: string; priority?: string; member?: string | null; completed?: boolean }) =>
    fetchJson<any>(`${API_BASE}/subtasks/${subId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  deleteSubtask: (subId: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/subtasks/${subId}`, {
      method: 'DELETE',
    }),

  // Comments
  getComments: (taskId: number) =>
    fetchJson<any[]>(`${API_BASE}/tasks/${taskId}/comments`),

  createComment: (taskId: number, comment: { author: string; text: string; color?: string }) =>
    fetchJson<any>(`${API_BASE}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    }),

  deleteComment: (commentId: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Projects
  getProjects: () =>
    fetchJson<Project[]>(`${API_BASE}/projects`),

  getProject: (id: number) =>
    fetchJson<Project>(`${API_BASE}/projects/${id}`),

  createProject: (project: CreateProjectInput) =>
    fetchJson<Project>(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  updateProject: (id: number, project: UpdateProjectInput) =>
    fetchJson<Project>(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    }),

  deleteProject: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    }),

  // Project Tasks
  getProjectTasks: (projectId: number) =>
    fetchJson<ProjectTask[]>(`${API_BASE}/projects/${projectId}/tasks`),

  createProjectTask: (projectId: number, task: CreateProjectTaskInput) =>
    fetchJson<ProjectTask>(`${API_BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  updateProjectTask: (taskId: number, task: UpdateProjectTaskInput) =>
    fetchJson<ProjectTask>(`${API_BASE}/projects/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),

  updateProjectTaskStatus: (taskId: number, status: string) =>
    fetchJson<ProjectTask>(`${API_BASE}/projects/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteProjectTask: (taskId: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/projects/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};