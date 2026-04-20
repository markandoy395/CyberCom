// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import errorHandler from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validation.js';
import decryptionMiddleware from './middleware/decryption.js';
import { closePool, getDatabaseHealth } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import teamRoutes from './routes/teams.js';
import submissionRoutes from './routes/submissions.js';
import competitionRoutes from './routes/competitions.js';
import adminRoutes from './routes/admin.js';
import loginHistoryRoutes from './routes/login-history.js';
import rulesRoutes from './routes/rules.js';
import utilityRoutes from './routes/utils.js';
import liveMonitorRoutes from './live-monitor/liveMonitorRoutes.js';
import uploadsRoutes from './routes/uploads.js';
import webExploitationRoutes from './routes/webExploitation.js';

const app = express();
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
let isShuttingDown = false;
let server;
let shutdownPromise = null;
const allowedOrigins = (
  process.env.CORS_ORIGIN
  || process.env.FRONTEND_URL
  || 'http://localhost:5174,http://localhost:5175'
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// ==================== SECURITY MIDDLEWARE ====================
// Add security headers using Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate limiting - Global
// More lenient in development, stricter in production
const isProduction = process.env.NODE_ENV === 'production';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // 100 req/15min in production, 1000 in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction, // Skip rate limiting in development
});
app.use(globalLimiter);

// Rate limiting - Login endpoint (strict)
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== CORS CONFIGURATION ====================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'X-Competition-Token'],
    maxAge: 3600, // 1 hour
  })
);

// ==================== BODY PARSER ====================
// Allow configuring the maximum request body size via env var `BODY_PARSER_LIMIT`.
// Default is increased to 50mb to support zipped folder uploads encoded as base64.
const BODY_PARSER_LIMIT = process.env.BODY_PARSER_LIMIT || '50mb';
app.use(express.json({ limit: BODY_PARSER_LIMIT }));
app.use(express.urlencoded({ limit: BODY_PARSER_LIMIT, extended: true }));

app.use((req, res, next) => {
  if (!isShuttingDown) {
    return next();
  }

  if (req.path === '/health' || req.path === '/health/db' || req.path === '/ready') {
    return next();
  }

  res.set('Connection', 'close');

  return res.status(503).json({
    success: false,
    error: 'Server is shutting down',
  });
});

// ==================== API ROUTES ====================

// Utility routes FIRST (before decryption/sanitization middleware)
app.use('/api', utilityRoutes);
// File upload endpoints
app.use('/api', uploadsRoutes);
app.use('/api', webExploitationRoutes);

// Apply rate limiting to login endpoints (strict)
app.use('/api/login/admin', loginLimiter);
app.use('/api/login/team', loginLimiter);
app.use('/api/login/user', loginLimiter);
app.use('/api/login/practice', loginLimiter);
app.use('/api/login/competition', loginLimiter);

// Apply decryption middleware BEFORE sanitization
app.use(decryptionMiddleware);

// Apply sanitization middleware
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CyberCom API server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    shuttingDown: isShuttingDown,
  });
});

app.get('/health/db', async (req, res) => {
  const database = await getDatabaseHealth();
  const success = database.ok && !isShuttingDown;

  return res.status(success ? 200 : 503).json({
    success,
    message: success ? 'Database is reachable' : 'Database is unavailable',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    shuttingDown: isShuttingDown,
    database,
  });
});

app.get('/ready', async (req, res) => {
  const database = await getDatabaseHealth();
  const success = database.ok && !isShuttingDown;

  return res.status(success ? 200 : 503).json({
    success,
    message: success ? 'CyberCom API is ready' : 'CyberCom API is not ready',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    shuttingDown: isShuttingDown,
    checks: {
      database,
    },
  });
});

// API Routes with security
app.use('/api', authRoutes);
app.use('/api', challengeRoutes);
app.use('/api', teamRoutes);
app.use('/api', submissionRoutes);
app.use('/api', competitionRoutes);
app.use('/api', rulesRoutes);
app.use('/api', adminRoutes);
app.use('/api', liveMonitorRoutes);
app.use('/api/admin', loginHistoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handling middleware
app.use(errorHandler);

// Start server with automatic port fallback
const currentPort = parseInt(PORT, 10);
const maxAttempts = 5;
let attempts = 0;

async function shutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  isShuttingDown = true;
  console.log(`[Server] ${signal} received. Starting graceful shutdown...`);

  shutdownPromise = (async () => {
    const forceShutdownTimer = setTimeout(() => {
      console.error('[Server] Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceShutdownTimer.unref?.();

    try {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close(error => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      }

      await closePool();
      console.log('[Server] HTTP server and database pool closed.');
      process.exit(0);
    } catch (error) {
      console.error('[Server] Error during graceful shutdown:', error);
      process.exit(1);
    } finally {
      clearTimeout(forceShutdownTimer);
    }
  })();

  return shutdownPromise;
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

function startServer(port) {
  server = app.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });

  server.on('error', err => {
    console.error(`[Server] Error on port ${port}: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      attempts++;
      if (attempts < maxAttempts) {
        console.warn(`[Server] Port ${port} in use. Retrying on port ${port + 1}...`);
        startServer(port + 1);
      } else {
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  });
}

startServer(currentPort);

export default app;
