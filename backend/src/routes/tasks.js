const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Validation helpers
const validatePriority = (priority) => {
  const validPriorities = ['Low', 'Medium', 'High'];
  return validPriorities.includes(priority);
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

// GET /api/boards/:id - Get board with columns
router.get('/boards/:id', (req, res) => {
  try {
    const db = getDb();
    const boardId = parseInt(req.params.id, 10);
    
    if (isNaN(boardId)) {
      return res.status(400).json({ error: 'Invalid board ID' });
    }

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(boardId);
    res.json({ ...board, columns });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// GET /api/boards/:id/tasks - Get all tasks for board with optional priority filter
router.get('/boards/:id/tasks', (req, res) => {
  try {
    const db = getDb();
    const boardId = parseInt(req.params.id, 10);
    const { priority } = req.query;

    if (isNaN(boardId)) {
      return res.status(400).json({ error: 'Invalid board ID' });
    }

    let query = `
      SELECT t.*, c.name as column_name 
      FROM tasks t 
      JOIN columns c ON t.column_id = c.id 
      WHERE c.board_id = ?
    `;
    const params = [boardId];

    if (priority) {
      if (!validatePriority(priority)) {
        return res.status(400).json({ error: 'Invalid priority. Must be Low, Medium, or High' });
      }
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY t.created_at DESC';

    const tasks = db.prepare(query).all(...params);
    tasks.forEach((task) => {
      if (task.labels) {
        try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
      }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

const validateAssignee = (assignee) => {
  const validAssignees = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
  return typeof assignee === 'string' && validAssignees.includes(assignee);
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

const parseDueDate = (dueDate) => {
  if (!dueDate) return null;
  if (typeof dueDate !== 'string') return null;
  const trimmed = dueDate.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

// POST /api/tasks - Create a new task
router.post('/tasks', (req, res) => {
  try {
    const db = getDb();
    const { column_id, project_id, title, description, priority, assignee, start_date, due_date, labels } = req.body;

    // Validation
    const sanitizedTitle = sanitizeString(title);
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (sanitizedTitle.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    if (!column_id) {
      return res.status(400).json({ error: 'Column ID is required' });
    }

    const columnId = parseInt(column_id, 10);
    if (isNaN(columnId)) {
      return res.status(400).json({ error: 'Invalid column ID' });
    }

    // Validate priority
    const taskPriority = priority && validatePriority(priority) ? priority : 'Medium';

    // Check if column exists
    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Validate description length
    const sanitizedDescription = sanitizeString(description);
    if (sanitizedDescription && sanitizedDescription.length > 1000) {
      return res.status(400).json({ error: 'Description must be 1000 characters or less' });
    }

    const taskAssignee = validateAssignee(assignee) ? assignee : null;
    const taskStartDate = parseDueDate(start_date);
    const taskDueDate = parseDueDate(due_date);
    const taskLabels = parseLabels(labels);

    // Validate project_id if provided
    let projectId = null;
    if (project_id) {
      projectId = parseInt(project_id, 10);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const result = db.prepare(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, assignee, start_date, due_date, labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(columnId, projectId, sanitizedTitle, sanitizedDescription || null, taskPriority, taskAssignee, taskStartDate, taskDueDate, taskLabels);

    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    if (newTask && newTask.labels) {
      try { newTask.labels = JSON.parse(newTask.labels); } catch (e) { /* keep as-is */ }
    }
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update a task
router.put('/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    const { title, description, priority, assignee, start_date, due_date, labels, status } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Check if task exists
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validation
    const sanitizedTitle = sanitizeString(title);
    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (sanitizedTitle.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    // Validate priority
    const taskPriority = priority && validatePriority(priority) ? priority : existingTask.priority;

    // Validate status
    const validStatuses = ['To Do', 'Doing', 'Completed', 'On Hold'];
    const taskStatus = status && validStatuses.includes(status) ? status : existingTask.status;

    // Validate description length
    const sanitizedDescription = sanitizeString(description);
    if (sanitizedDescription && sanitizedDescription.length > 1000) {
      return res.status(400).json({ error: 'Description must be 1000 characters or less' });
    }

    const taskAssignee = assignee !== undefined
      ? (validateAssignee(assignee) ? assignee : null)
      : existingTask.assignee;
    const taskStartDate = start_date !== undefined
      ? parseDueDate(start_date)
      : existingTask.start_date;
    const taskDueDate = due_date !== undefined
      ? parseDueDate(due_date)
      : existingTask.due_date;
    const taskLabels = labels !== undefined
      ? parseLabels(labels)
      : existingTask.labels;

    db.prepare(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, assignee = ?, start_date = ?, due_date = ?, labels = ?, status = ? WHERE id = ?'
    ).run(sanitizedTitle, sanitizedDescription || null, taskPriority, taskAssignee, taskStartDate, taskDueDate, taskLabels, taskStatus, taskId);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (updatedTask && updatedTask.labels) {
      try { updatedTask.labels = JSON.parse(updatedTask.labels); } catch (e) { /* keep as-is */ }
    }
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);

    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// PATCH /api/tasks/:id/move - Move task to different column
router.patch('/tasks/:id/move', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    const { column_id } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Check if task exists
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate column_id
    if (!column_id) {
      return res.status(400).json({ error: 'Column ID is required' });
    }

    const targetColumnId = parseInt(column_id, 10);
    if (isNaN(targetColumnId)) {
      return res.status(400).json({ error: 'Invalid column ID' });
    }

    // Check if target column exists
    const targetColumn = db.prepare('SELECT * FROM columns WHERE id = ?').get(targetColumnId);
    if (!targetColumn) {
      return res.status(404).json({ error: 'Target column not found' });
    }

    // Check if task is already in the target column
    if (task.column_id === targetColumnId) {
      return res.status(400).json({ error: 'Task is already in this column' });
    }

    db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(targetColumnId, taskId);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// GET /api/boards/:id/stats - Get task count per column (required query)
router.get('/boards/:id/stats', (req, res) => {
  try {
    const db = getDb();
    const boardId = parseInt(req.params.id, 10);

    if (isNaN(boardId)) {
      return res.status(400).json({ error: 'Invalid board ID' });
    }

    const stats = db.prepare(`
      SELECT c.id, c.name, COUNT(t.id) as task_count
      FROM columns c
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE c.board_id = ?
      GROUP BY c.id
      ORDER BY c.position
    `).all(boardId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/boards/:id/tasks/priority/:priority - Get tasks by priority (required query)
router.get('/boards/:id/tasks/priority/:priority', (req, res) => {
  try {
    const db = getDb();
    const boardId = parseInt(req.params.id, 10);
    const { priority } = req.params;

    if (isNaN(boardId)) {
      return res.status(400).json({ error: 'Invalid board ID' });
    }

    if (!validatePriority(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be Low, Medium, or High' });
    }

    const tasks = db.prepare(`
      SELECT t.*, c.name as column_name
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      WHERE c.board_id = ? AND t.priority = ?
      ORDER BY t.created_at DESC
    `).all(boardId, priority);

    tasks.forEach((task) => {
      if (task.labels) {
        try { task.labels = JSON.parse(task.labels); } catch (e) { /* keep as-is */ }
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks by priority:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by priority' });
  }
});

// ── Subtasks ──────────────────────────────────────────

// GET /api/tasks/:id/subtasks
router.get('/tasks/:id/subtasks', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid task ID' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(taskId);
    res.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    res.status(500).json({ error: 'Failed to fetch subtasks' });
  }
});

// POST /api/tasks/:id/subtasks
router.post('/tasks/:id/subtasks', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid task ID' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { title, priority, member } = req.body;
    const sanitizedTitle = sanitizeString(title) || 'Untitled';
    const taskPriority = priority && validatePriority(priority) ? priority : 'Low';
    const validMembers = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
    const taskMember = typeof member === 'string' && validMembers.includes(member) ? member : null;

    const maxPos = db.prepare('SELECT MAX(position) as m FROM subtasks WHERE task_id = ?').get(taskId);
    const nextPos = (maxPos.m ?? -1) + 1;

    const result = db.prepare(
      'INSERT INTO subtasks (task_id, title, priority, member, position) VALUES (?, ?, ?, ?, ?)'
    ).run(taskId, sanitizedTitle, taskPriority, taskMember, nextPos);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(subtask);
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
});

// PUT /api/subtasks/:id
router.put('/subtasks/:id', (req, res) => {
  try {
    const db = getDb();
    const subId = parseInt(req.params.id, 10);
    if (isNaN(subId)) return res.status(400).json({ error: 'Invalid subtask ID' });

    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subId);
    if (!existing) return res.status(404).json({ error: 'Subtask not found' });

    const { title, priority, member, completed } = req.body;
    const newTitle = title !== undefined ? (sanitizeString(title) || existing.title) : existing.title;
    const newPriority = priority !== undefined && validatePriority(priority) ? priority : existing.priority;
    const validMembers = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
    const newMember = member !== undefined
      ? (typeof member === 'string' && validMembers.includes(member) ? member : null)
      : existing.member;
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;

    db.prepare(
      'UPDATE subtasks SET title = ?, priority = ?, member = ?, completed = ? WHERE id = ?'
    ).run(newTitle, newPriority, newMember, newCompleted, subId);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subId);
    res.json(subtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// DELETE /api/subtasks/:id
router.delete('/subtasks/:id', (req, res) => {
  try {
    const db = getDb();
    const subId = parseInt(req.params.id, 10);
    if (isNaN(subId)) return res.status(400).json({ error: 'Invalid subtask ID' });

    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subId);
    if (!existing) return res.status(404).json({ error: 'Subtask not found' });

    db.prepare('DELETE FROM subtasks WHERE id = ?').run(subId);
    res.json({ message: 'Subtask deleted' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

// ── Comments ──────────────────────────────────────────

// GET /api/tasks/:id/comments
router.get('/tasks/:id/comments', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid task ID' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comments = db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC').all(taskId);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/tasks/:id/comments
router.post('/tasks/:id/comments', (req, res) => {
  try {
    const db = getDb();
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid task ID' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { author, text, color } = req.body;
    const sanitizedAuthor = sanitizeString(author) || 'Anonymous';
    const sanitizedText = sanitizeString(text);
    if (!sanitizedText) return res.status(400).json({ error: 'Comment text is required' });

    const commentColor = typeof color === 'string' ? color : null;

    const result = db.prepare(
      'INSERT INTO comments (task_id, author, text, color) VALUES (?, ?, ?, ?)'
    ).run(taskId, sanitizedAuthor, sanitizedText, commentColor);

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', (req, res) => {
  try {
    const db = getDb();
    const commentId = parseInt(req.params.id, 10);
    if (isNaN(commentId)) return res.status(400).json({ error: 'Invalid comment ID' });

    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!existing) return res.status(404).json({ error: 'Comment not found' });

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
