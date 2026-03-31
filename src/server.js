require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions (sync errors outside Express)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// ── Self-ping to prevent Render free tier from sleeping ──────────────────────
// Render spins down free services after 15min of inactivity.
// This pings the health endpoint every 14 minutes to keep it alive.
// Only runs in production and only if SELF_PING_URL is set.
function startSelfPing() {
  if (process.env.NODE_ENV !== 'production') return;
  const url = "https://urlix.onrender.com/";
  if (!url) return;

  const https = require('https');
  const http = require('http');

  const ping = () => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      console.log(`[self-ping] ${res.statusCode} OK`);
    });
    req.on('error', (err) => {
      console.warn('[self-ping] failed:', err.message);
    });
    req.end();
  };

  // Ping every 14 minutes (Render sleeps after 15)
  const INTERVAL = 14 * 60 * 1000;
  setTimeout(() => {
    ping();
    setInterval(ping, INTERVAL);
  }, INTERVAL);
}

// Connect to DB then start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    startSelfPing();
  });

  // Handle unhandled promise rejections (async errors outside Express)
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
  });

  // Graceful shutdown on SIGTERM (e.g. Render, Docker, Railway)
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated.');
    });
  });
});
