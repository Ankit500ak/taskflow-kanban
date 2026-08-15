const request = require('supertest');
const app = require('../src/index');
const { initializeDb, getDb, closeDb } = require('../src/db/database');

beforeAll(() => {
  initializeDb();
});

afterAll(() => {
  closeDb();
});

describe('Task API', () => {
  let boardId;
  let columnId;
  let taskId;

  beforeAll(async () => {
    // Create a test board
    const db = getDb();
    const result = db.prepare('INSERT INTO boards (name) VALUES (?)').run('Test Board');
    boardId = result.lastInsertRowid;

    // Create test columns
    const colResult = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)').run(boardId, 'To Do', 0);
    columnId = colResult.lastInsertRowid;
  });

  describe('Auth API', () => {
    beforeAll(() => {
      const db = getDb();
      db.prepare('DELETE FROM users WHERE email = ?').run('auth@example.com');
      db.prepare(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
      ).run('Auth Test', 'auth@example.com', require('bcryptjs').hashSync('password123', 10));
    });

    it('should register a new user', async () => {
      getDb().prepare('DELETE FROM users WHERE email = ?').run('auth@example.com');
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auth Test',
          email: 'auth@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Auth Test');
      expect(res.body.user.email).toBe('auth@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should create a default board for a new user', async () => {
      const email = 'board@example.com';
      getDb().prepare('DELETE FROM users WHERE email = ?').run(email);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Board Test',
          email,
          password: 'password123'
        });

      expect(res.status).toBe(201);
      const createdBoard = getDb()
        .prepare('SELECT * FROM boards WHERE user_id = ? ORDER BY id LIMIT 1')
        .get(res.body.user.id);

      expect(createdBoard).toBeTruthy();
      expect(createdBoard.name).toBe('Task Board');
    });

    it('should create default columns for a new board', async () => {
      const email = 'board-columns@example.com';
      getDb().prepare('DELETE FROM users WHERE email = ?').run(email);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Board Columns Test',
          email,
          password: 'password123'
        });

      expect(res.status).toBe(201);
      const board = getDb()
        .prepare('SELECT * FROM boards WHERE user_id = ? ORDER BY id LIMIT 1')
        .get(res.body.user.id);
      const columns = getDb()
        .prepare('SELECT name, position FROM columns WHERE board_id = ? ORDER BY position')
        .all(board.id);

      expect(board).toBeTruthy();
      expect(columns.map((column) => column.name)).toEqual(['To Do', 'Doing', 'Completed', 'On Hold']);
    });

    it('should reject registration with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auth Test 2',
          email: 'auth@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('An account with this email already exists');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auth Test',
          email: 'not-an-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A valid email is required');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auth Test',
          email: 'short@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 6 characters');
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('auth@example.com');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return current user from valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@example.com',
          password: 'password123'
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('auth@example.com');
    });

    it('should reject /me with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should reject creating a task with empty title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: '',
          description: 'Test description',
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
          title: null,
          description: 'Test description',
          priority: 'High'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('should reject creating a task with whitespace-only title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: '   ',
          description: 'Test description',
          priority: 'High'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('should reject creating a task without column_id', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          priority: 'High'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Column ID is required');
    });

    it('should reject creating a task with invalid column_id', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: 'abc',
          title: 'Test Task',
          priority: 'High'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid column ID');
    });

    it('should reject creating a task with non-existent column', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: 99999,
          title: 'Test Task',
          priority: 'High'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Column not found');
    });

    it('should reject creating a task with invalid priority', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: 'Test Task',
          priority: 'Invalid'
        });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe('Medium');
    });

    it('should create a new task successfully', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: 'Write tests'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Write tests');
      taskId = res.body.id;
    });

    it('should create a task with assignee, due date, and labels', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: 'Deploy to Production',
          description: 'Build and deploy',
          priority: 'High',
          assignee: 'Admin',
          due_date: '2026-08-14',
          labels: ['Deployment', 'Release']
        });

      expect(res.status).toBe(201);
      expect(res.body.assignee).toBe('Admin');
      expect(res.body.due_date).toBe('2026-08-14');
      expect(res.body.labels).toEqual(['Deployment', 'Release']);
    });

    it('should reject a task with an invalid assignee', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: 'Invalid assignee',
          assignee: 'NotARole'
        });

      expect(res.status).toBe(201);
      expect(res.body.assignee).toBeNull();
    });

    it('should create a task with long title (max length)', async () => {
      const longTitle = 'A'.repeat(255);
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: longTitle,
          priority: 'Low'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(longTitle);
    });

    it('should reject creating a task with title exceeding max length', async () => {
      const longTitle = 'A'.repeat(256);
      const res = await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: longTitle,
          priority: 'Low'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title must be 255 characters or less');
    });
  });

  describe('GET /api/boards/:id/tasks', () => {
    it('should return all tasks for a board', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks?priority=High`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      res.body.forEach(task => {
        expect(task.priority).toBe('High');
      });
    });

    it('should return 400 for invalid priority filter', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks?priority=Invalid`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid priority');
    });

    it('should return 400 for invalid board ID', async () => {
      const res = await request(app)
        .get('/api/boards/abc/tasks');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid board ID');
    });
  });

  describe('GET /api/boards', () => {
    it('should list available boards', async () => {
      const res = await request(app)
        .get('/api/boards');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/boards/:id', () => {
    it('should return a board with columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(boardId);
      expect(res.body.name).toBe('Test Board');
      expect(Array.isArray(res.body.columns)).toBe(true);
    });

    it('should return 404 for non-existent board', async () => {
      const res = await request(app)
        .get('/api/boards/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Board not found');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: 'Updated Task',
          description: 'Updated description',
          priority: 'Low'
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.priority).toBe('Low');
    });

    it('should reject update with empty title', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: '',
          priority: 'Low'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/tasks/99999')
        .send({
          title: 'Updated Task',
          priority: 'Low'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /api/tasks/:id/move', () => {
    it('should move task to a different column', async () => {
      // Create another column to move to
      const db = getDb();
      const colResult = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)').run(boardId, 'In Progress', 1);
      const newColumnId = colResult.lastInsertRowid;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .send({ column_id: newColumnId });

      expect(res.status).toBe(200);
      expect(res.body.column_id).toBe(newColumnId);
    });

    it('should return 400 when moving to same column', async () => {
      const task = await request(app).get(`/api/boards/${boardId}/tasks`);
      const currentTask = task.body.find(t => t.id === taskId);
      
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .send({ column_id: currentTask.column_id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Task is already in this column');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/api/tasks/99999/move')
        .send({ column_id: columnId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 404 for non-existent target column', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .send({ column_id: 99999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Target column not found');
    });
  });

  describe('GET /api/boards/:id/stats', () => {
    it('should return task count per column', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/stats`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const firstStat = res.body[0];
      expect(firstStat).toHaveProperty('id');
      expect(firstStat).toHaveProperty('name');
      expect(firstStat).toHaveProperty('task_count');
      expect(typeof firstStat.task_count).toBe('number');
    });
  });

  describe('GET /api/boards/:id/tasks/priority/:priority', () => {
    it('should return tasks filtered by priority', async () => {
      // First create a High priority task
      await request(app)
        .post('/api/tasks')
        .send({
          column_id: columnId,
          title: 'High Priority Test Task',
          priority: 'High'
        });

      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks/priority/High`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      res.body.forEach(task => {
        expect(task.priority).toBe('High');
      });
    });

    it('should return empty array for priority with no tasks', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks/priority/Low`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 for invalid priority', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/tasks/priority/Invalid`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid priority');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete('/api/tasks/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app)
        .delete('/api/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid task ID');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
