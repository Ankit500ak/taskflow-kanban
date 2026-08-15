const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDb } = require('./db/database');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const origin = process.env.CORS_ORIGIN || '*';

console.log('--- CORS Configuration ---');
console.log('Requested Origin:', origin);
console.log('CORS_ORIGIN env:', process.env.CORS_ORIGIN);
console.log('Using origin:', origin === '*' ? 'ALL origins (default)' : 'Specific origin');
console.log('--- End CORS Configuration ---');

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors({
  origin,
  credentials: true
}));

console.log('CORS middleware active - origins allowed:', origin === '*' ? '*' : origin);
console.log('CORS middleware applied');
app.use(express.json());

// Initialize database
initializeDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', taskRoutes);
app.use('/api', projectRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err.message || err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  });
}

module.exports = app;
