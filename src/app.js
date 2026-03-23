const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const globalErrorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const AppError = require('./utils/AppError');

const authRoutes = require('./routes/authRoutes');
const linkRoutes = require('./routes/linkRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Block direct browser access ─────────────────────────────────────────────
// Allows requests where Origin or Referer matches the frontend URL.
// Blocks direct URL visits in the browser and tools that don't send these headers.
const requireFrontendOrigin = (req, res, next) => {
  if (req.method === 'OPTIONS') return next(); // always allow preflight

  const origin  = req.headers['origin']  || '';
  const referer = req.headers['referer'] || '';

  if (origin.startsWith(ALLOWED_ORIGIN) || referer.startsWith(ALLOWED_ORIGIN)) {
    return next();
  }

  return res.status(403).json({
    status: 'fail',
    message: 'Direct API access is not allowed.',
  });
};

// ─── General Middleware ────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiter ───────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check (no origin restriction) ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Urlix API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes (frontend-origin only) ───────────────────────────────────────────
app.use('/api/auth',  requireFrontendOrigin, authRoutes);
app.use('/api/links', requireFrontendOrigin, linkRoutes);
app.use('/api/users', requireFrontendOrigin, userRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server.`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
