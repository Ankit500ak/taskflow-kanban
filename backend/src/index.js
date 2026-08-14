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
const allowedOrigins = process.env.CORS_ORIGIN 
  ? [process.env.CORS_ORIGIN, 'http://localhost:3001']
  : ['http://localhost:3001'];

app.use(cors({
  origin: function (origin, cb) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
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
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
