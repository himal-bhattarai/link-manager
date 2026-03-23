require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Keep-alive ping to prevent Render free tier from sleeping
const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL || `https://urlix.onrender.com`;

  setInterval(() => {
    https.get(`${url}/health`, (res) => {
      console.log(`[Keep-Alive] Ping sent - Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Keep-Alive] Ping failed: ${err.message}`);
    });
  }, 10 * 60 * 1000); // every 10 minutes
};

// Handle uncaught exceptions (sync errors outside Express)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect to DB then start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    keepAlive(); // start pinging after server is up
  });

  // Handle unhandled promise rejections (async errors outside Express)
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
  });

  // Graceful shutdown on SIGTERM (e.g. Docker, Heroku, Railway)
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated.');
    });
  });
});
