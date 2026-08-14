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
  assignee?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  labels?: string[] | string | null;
  reporter?: string | null;
  collaborators?: string[] | null;
  created_at: string;
  column_name?: string;
}

export interface ColumnStats {
  id: number;
  name: string;
  task_count: number;
}

export interface Project {
  id: number;
  user_id: number;
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  lead: string | null;
  due_date: string | null;
  created_at: string;
  task_count?: number;
}

export type TaskStatus = 'To Do' | 'Doing' | 'Completed' | 'On Hold';

export interface CreateProjectInput {
  title: string;
  priority?: 'Low' | 'Medium' | 'High';
  lead?: string;
  due_date?: string;
}

export interface UpdateProjectInput {
  title?: string;
  priority?: 'Low' | 'Medium' | 'High';
  lead?: string;
  due_date?: string;
}

export interface ProjectTask {
  id: number;
  column_id: number;
  project_id: number;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  assignee: string | null;
  start_date: string | null;
  due_date: string | null;
  labels: string[] | string | null;
  status: TaskStatus;
  collaborators: string[] | string | null;
  reporter: string | null;
  created_at: string;
}

export interface CreateProjectTaskInput {
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string;
  due_date?: string;
  labels?: string[];
  status?: TaskStatus;
  collaborators?: string[];
  reporter?: string;
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string;
  due_date?: string;
  labels?: string[];
  status?: TaskStatus;
  collaborators?: string[];
  reporter?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface CreateTaskInput {
  column_id: number;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string;
  start_date?: string;
  due_date?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string;
  start_date?: string;
  due_date?: string;
  labels?: string[];
}

export type Assignee = 'Admin' | 'Designer' | 'Developer' | 'QA' | 'Security';

export type ViewMode = 'board' | 'list';

export type FieldKey =
  | 'priority'
  | 'members'
  | 'collaborators'
  | 'dueDate'
  | 'labels'
  | 'status'
  | 'reporter';

export type FieldVisibility = Record<FieldKey, boolean>;

export const DEFAULT_FIELDS: FieldVisibility = {
  priority: true,
  members: true,
  collaborators: true,
  dueDate: true,
  labels: false,
  status: false,
  reporter: false,
};

export interface FieldDefinition {
  key: FieldKey;
  label: string;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  { key: 'priority', label: 'Priority' },
  { key: 'members', label: 'Members' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'collaborators', label: 'Teams' },
  { key: 'labels', label: 'Labels' },
  { key: 'status', label: 'Status' },
  { key: 'reporter', label: 'Reporter' },
];
