import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.MONGODB_URI) {
  console.error('[DASHBOARD] FATAL: Missing MONGODB_URI');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('[DASHBOARD] FATAL: Missing JWT_SECRET');
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: IS_PROD ? CLIENT_URL : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { error: 'Too many login attempts' } });
app.use('/api/auth/login', loginLimiter);

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', apiLimiter);

let dbConnected = false;
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    directConnection: true,
  });
  dbConnected = true;
  console.log('[DB] MongoDB connected');
} catch (err) {
  console.error('[DB] MongoDB connection failed:', err.message);
}

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', (req, res) => {
  if (dbConnected) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'database disconnected' });
  }
});

app.get('/health/live', (req, res) => {
  res.json({ alive: true });
});

const clientDist = join(__dirname, '../client/dist');
const fs = await import('fs').catch(() => null);
const distExists = fs?.default?.existsSync(clientDist) ?? false;

if (distExists) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDist, 'index.html'));
    }
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DASHBOARD] Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`[DASHBOARD] ${signal} received. Shutting down...`);
  server.close(() => {
    mongoose.disconnect().then(() => {
      console.log('[DASHBOARD] Clean shutdown.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
