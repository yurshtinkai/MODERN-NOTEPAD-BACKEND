// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/db'); // Import the initDb function

// Import routes
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');

const app = express();

// --- Production hardening ---
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'; // e.g. https://your-frontend.onrender.com
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1); // needed on Render/Proxies for correct protocol
}
app.disable('x-powered-by');

// Middleware
// CORS configuration
if (CORS_ORIGIN === '*') {
  app.use(cors());
} else {
  const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
  app.use(cors({
    origin: function(origin, callback) {
      // Allow server-to-server or same-origin (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
}
app.use(express.json()); // Parses incoming JSON requests

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// Lightweight health endpoint for warm-up checks
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test route
app.get('/', (req, res) => {
  res.send('Modern Notepad API is running...');
});

const PORT = process.env.PORT || 5001;

// --- Start Server Function ---
// We wrap the server start in an async function
// to ensure the database is initialized first.

const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnv = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = requiredEnv.filter((k) => !process.env[k] || String(process.env[k]).length === 0);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    console.log('Initializing database...');
    await initDb(); // This will create the DB and tables
    console.log('Database initialization complete.');

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      // Force exit if not closed in time
      setTimeout(() => {
        console.error('Forced shutdown.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Call the function to start the server
startServer();