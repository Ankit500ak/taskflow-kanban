const {initializeDb} = require('./src/db/database');
const db = require('./src/db/database').getDb();

initializeDb();

const boards = db.prepare('SELECT * FROM boards').all();
console.log('Total boards:', boards.length);
boards.forEach((b, i) => console.log(`Board ${i+1}: id=${b.id}, name=${b.name}, user_id=${b.user_id}`));

const users = db.prepare('SELECT * FROM users').all();
console.log('\nUsers:', users);

const userCount = users.length;
console.log(`\nUser count: ${userCount}`);

const boardsWithUser1 = boards.filter(b => b.user_id === 1);
console.log(`\nBoards with user_id=1: ${boardsWithUser1.length}`);
boardsWithUser1.forEach(b => console.log(` - Board ${b.id}: ${b.name}`));

const boardsWithoutUser = boards.filter(b => b.user_id === null);
console.log(`\nBoards with user_id=null: ${boardsWithoutUser.length}`);
boardsWithoutUser.forEach(b => console.log(` - Board ${b.id}: ${b.name}`));