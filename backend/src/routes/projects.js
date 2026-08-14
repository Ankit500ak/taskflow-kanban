const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

const validatePriority = (priority) => {
  const validPriorities = ['Low', 'Medium', 'High'];
  return validPriorities.includes(priority);
};

const validateStatus = (status) => {
  const validStatuses = ['To Do', 'Doing', 'Completed', 'On Hold'];
  return validStatuses.includes(status);
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

const parseDueDate = (dueDate) => {
  if (!dueDate) return null;
  if (typeof dueDate !== 'string') return null;
  const trimmed = dueDate.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const parseLabels = (labels) => {
  if (!labels) return null;
  if (Array.isArray(labels)) {
    return JSON.stringify(labels.map((l) => sanitizeString(l)).filter(Boolean));
  }
  if (typeof labels === 'string') {
    return sanitizeString(labels) || null;
  }
  return null;
};

const validateAssignee = (assignee) => {
  const validAssignees = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
  return typeof assignee === 'string' && validAssignees.includes(assignee);
};

// ─── Project CRUD ────────────────────────────────────────────

// GET /api/projects - Get all projects for the user
router.get('/projects', (req, res) => {
  try {
    const db = getDb();
    const userId = 1;
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get a single project
router.get('/projects/:id', (req, res) => {
  try {
    const db = getDb();
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create a new project
router.post('/projects', (req, res) => {
  try {
    const db = getDb();
    const userId = 1;
    const { title, priority, lead, due_date } = req.body;

    const sanitizedTitle = sanitizeString(title);
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (sanitizedTitle.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    const projectPriority = priority && validatePriority(priority) ? priority : 'Medium';
    const projectLead = sanitizeString(lead) || null;
    const projectDueDate = parseDueDate(due_date);

    const result = db.prepare(
      'INSERT INTO projects (user_id, title, priority, lead, due_date) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, sanitizedTitle, projectPriority, projectLead, projectDueDate);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update a project
router.put('/projects/:id', (req, res) => {
  try {
    const db = getDb();
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, priority, lead, due_date } = req.body;
    const sanitizedTitle = title !== undefined ? sanitizeString(title) : existing.title;
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const projectPriority = priority !== undefined
      ? (validatePriority(priority) ? priority : existing.priority)
      : existing.priority;
    const projectLead = lead !== undefined ? sanitizeString(lead) || null : existing.lead;
    const projectDueDate = due_date !== undefined ? parseDueDate(due_date) : existing.due_date;

    db.prepare(
      'UPDATE projects SET title = ?, priority = ?, lead = ?, due_date = ? WHERE id = ?'
    ).run(sanitizedTitle, projectPriority, projectLead, projectDueDate, projectId);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/projects/:id', (req, res) => {
  try {
    const db = getDb();
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ─── Project Tasks ───────────────────────────────────────────

// GET /api/projects/:id/tasks - Get all tasks for a project
router.get('/projects/:id/tasks', (req, res) => {
  try {
    const db = getDb();
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tasks = db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC'
    ).all(projectId);

    tasks.forEach((task) => {
      if (task.labels) {
        try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
      }
      if (task.collaborators) {
        try { task.collaborators = JSON.parse(task.collaborators); } catch (e) { /* keep as-is */ }
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: 'Failed to fetch project tasks' });
  }
});

// POST /api/projects/:id/tasks - Create a task in a project
router.post('/projects/:id/tasks', (req, res) => {
  try {
    const db = getDb();
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, description, priority, assignee, due_date, labels, status, collaborators, reporter, start_date } = req.body;

    const sanitizedTitle = sanitizeString(title);
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (sanitizedTitle.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    const taskPriority = priority && validatePriority(priority) ? priority : 'Medium';
    const taskStatus = status && validateStatus(status) ? status : 'To Do';
    const taskAssignee = validateAssignee(assignee) ? assignee : null;
    const taskDueDate = parseDueDate(due_date);
    const taskStartDate = parseDueDate(start_date);
    const taskLabels = parseLabels(labels);
    const taskCollaborators = parseLabels(collaborators);
    const taskReporter = sanitizeString(reporter) || null;
    const sanitizedDescription = sanitizeString(description);
    if (sanitizedDescription && sanitizedDescription.length > 1000) {
      return res.status(400).json({ error: 'Description must be 1000 characters or less' });
    }

    // Use the first column as default (for backward compatibility)
    const defaultColumn = db.prepare('SELECT id FROM columns ORDER BY position LIMIT 1').get();
    const columnId = defaultColumn ? defaultColumn.id : 1;

    const result = db.prepare(
      `INSERT INTO tasks (column_id, project_id, title, description, priority, assignee, start_date, due_date, labels, status, collaborators, reporter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(columnId, projectId, sanitizedTitle, sanitizedDescription || null, taskPriority, taskAssignee, taskStartDate, taskDueDate, taskLabels, taskStatus, taskCollaborators, taskReporter);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    if (task.labels) {
      try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
    }
    if (task.collaborators) {
      try { task.collaborators = JSON.parse(task.collaborators); } catch (e) { /* keep as-is */ }
    }
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating project task:', error);
    res.status(500).json({ error: 'Failed to create project task' });
  }
});

// PUT /api/projects/tasks/:id - Update a project task
router.put('/projects/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, priority, assignee, due_date, labels, status, collaborators, reporter } = req.body;

    const sanitizedTitle = title !== undefined ? sanitizeString(title) : existing.title;
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const taskPriority = priority !== undefined
      ? (validatePriority(priority) ? priority : existing.priority)
      : existing.priority;
    const taskStatus = status !== undefined
      ? (validateStatus(status) ? status : existing.status)
      : existing.status;
    const taskAssignee = assignee !== undefined
      ? (validateAssignee(assignee) ? assignee : null)
      : existing.assignee;
    const taskDueDate = due_date !== undefined ? parseDueDate(due_date) : existing.due_date;
    const taskLabels = labels !== undefined ? parseLabels(labels) : existing.labels;
    const taskCollaborators = collaborators !== undefined ? parseLabels(collaborators) : existing.collaborators;
    const taskReporter = reporter !== undefined ? (sanitizeString(reporter) || null) : existing.reporter;
    const taskDescription = description !== undefined
      ? (sanitizeString(description) || null)
      : existing.description;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, assignee = ?, due_date = ?, labels = ?, status = ?, collaborators = ?, reporter = ?
       WHERE id = ?`
    ).run(sanitizedTitle, taskDescription, taskPriority, taskAssignee, taskDueDate, taskLabels, taskStatus, taskCollaborators, taskReporter, taskId);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (task.labels) {
      try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
    }
    if (task.collaborators) {
      try { task.collaborators = JSON.parse(task.collaborators); } catch (e) { /* keep as-is */ }
    }
    res.json(task);
  } catch (error) {
    console.error('Error updating project task:', error);
    res.status(500).json({ error: 'Failed to update project task' });
  }
});

// PATCH /api/projects/tasks/:id/status - Change task status
router.patch('/projects/tasks/:id/status', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { status } = req.body;
    if (!status || !validateStatus(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be To Do, Doing, or Completed' });
    }

    if (existing.status === status) {
      return res.status(400).json({ error: 'Task is already in this status' });
    }

    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (task.labels) {
      try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
    }
    res.json(task);
  } catch (error) {
    console.error('Error changing task status:', error);
    res.status(500).json({ error: 'Failed to change task status' });
  }
});

// DELETE /api/projects/tasks/:id - Delete a project task
router.delete('/projects/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting project task:', error);
    res.status(500).json({ error: 'Failed to delete project task' });
  }
});

module.exports = router;
