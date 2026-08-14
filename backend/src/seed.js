const { initializeDb, closeDb } = require('./db/database');
const bcrypt = require('bcryptjs');

function seed() {
  const db = initializeDb();

  console.log('Seeding database...');

  // Clear existing data (order matters due to foreign keys)
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM columns');
  db.exec('DELETE FROM boards');
  db.exec('DELETE FROM users');

  // Reset auto-increment counters
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('boards', 'columns', 'tasks', 'users')");

  // Create a demo user
  const hashedPassword = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
  const userResult = insertUser.run('Demo User', 'demo@example.com', hashedPassword);
  const userId = userResult.lastInsertRowid;

  // Create a default board for the demo user
  const insertBoard = db.prepare('INSERT INTO boards (name, user_id) VALUES (?, ?)');
  const boardResult = insertBoard.run('My Task Board', userId);
  const boardId = boardResult.lastInsertRowid;

  // Create columns matching the Kanban workflow spec
  const insertColumn = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)');
  const todoColumn = insertColumn.run(boardId, 'To Do', 0);
  const doingColumn = insertColumn.run(boardId, 'Doing', 1);
  const completedColumn = insertColumn.run(boardId, 'Completed', 2);
  const onHoldColumn = insertColumn.run(boardId, 'On Hold', 3);

  // Create sample tasks with assignee, due date, and labels
  const insertTask = db.prepare(
    'INSERT INTO tasks (column_id, title, description, priority, assignee, due_date, labels) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  // To Do tasks
  insertTask.run(
    todoColumn.lastInsertRowid,
    'Write API Documentation',
    'Document all REST endpoints with request/response examples.',
    'High',
    'Admin',
    '2026-08-14',
    JSON.stringify(['Deployment', 'Deployment'])
  );
  insertTask.run(
    todoColumn.lastInsertRowid,
    'Implement Search Function',
    'Add search across task titles, descriptions, assignees, and labels.',
    'Medium',
    'Admin',
    '2026-08-14',
    JSON.stringify(['Deployment'])
  );
  insertTask.run(
    todoColumn.lastInsertRowid,
    'Deploy to Production',
    'Build production bundle, run tests, update env vars, verify endpoint.',
    'High',
    'Admin',
    '2026-08-14',
    JSON.stringify(['Deployment'])
  );

  // Doing tasks
  insertTask.run(
    doingColumn.lastInsertRowid,
    'Code Review Completed',
    'Review the completed implementation for best practices.',
    'Medium',
    'Admin',
    '2026-08-14',
    JSON.stringify(['Deployment', 'Deployment'])
  );
  insertTask.run(
    doingColumn.lastInsertRowid,
    'Design Mockups Finalized',
    'Finalize the UI mockups and hand off to development.',
    'High',
    'Designer',
    '2026-08-14',
    JSON.stringify(['Deployment', 'Deployment'])
  );

  // Completed tasks
  insertTask.run(
    completedColumn.lastInsertRowid,
    'Feature Testing Passed',
    'All feature tests passed on the QA environment.',
    'Medium',
    'QA',
    '2026-08-15',
    JSON.stringify(['Testing'])
  );
  insertTask.run(
    completedColumn.lastInsertRowid,
    'UI Design Updated',
    'Updated the UI design per latest feedback.',
    'Medium',
    'Designer',
    '2026-08-16',
    JSON.stringify(['Design', 'Updated'])
  );
  insertTask.run(
    completedColumn.lastInsertRowid,
    'Security Audit Scheduled',
    'Scheduled the quarterly security audit.',
    'High',
    'Security',
    '2026-08-17',
    JSON.stringify(['Audit', 'Scheduled'])
  );

  // On Hold tasks
  insertTask.run(
    onHoldColumn.lastInsertRowid,
    'UI Review',
    'Awaiting client feedback on the latest UI iteration.',
    'Low',
    'Designer',
    '2026-08-18',
    JSON.stringify(['Design'])
  );
  insertTask.run(
    onHoldColumn.lastInsertRowid,
    'User Feedback',
    'Collecting user feedback before continuing development.',
    'Medium',
    'Developer',
    '2026-08-19',
    JSON.stringify(['Research'])
  );

  console.log('Database seeded successfully!');
  console.log('---');
  console.log(`Demo user: demo@example.com / password123`);
  console.log(`Board: My Task Board (ID: ${boardId})`);
  console.log('Columns:');
  console.log('  - To Do (3 tasks)');
  console.log('  - Doing (2 tasks)');
  console.log('  - Completed (3 tasks)');
  console.log('  - On Hold (2 tasks)');
  console.log('Total: 10 tasks');

  closeDb();
}

seed();
