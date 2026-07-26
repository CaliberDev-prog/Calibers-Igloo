import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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
if (!process.env.OWNER_ID) {
  console.error('[DASHBOARD] FATAL: Missing OWNER_ID');
  process.exit(1);
}

if (IS_PROD && (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID)) {
  console.warn('[DASHBOARD] WARN: DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set. Discord API features will be unavailable.');
}

const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com', 'https://media.discordapp.net'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
};

app.use(helmet({
  contentSecurityPolicy: IS_PROD ? { directives: CSP_DIRECTIVES } : false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
}));

const allowedOrigins = IS_PROD
  ? [CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
});

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
  if (IS_PROD) {
    console.error('[DB] Cannot start in production without database. Exiting.');
    process.exit(1);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
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
const distExists = fs.existsSync(clientDist);

if (distExists) {
  app.use(express.static(clientDist, { maxAge: IS_PROD ? '7d' : 0 }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDist, 'index.html'));
    }
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DASHBOARD] Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
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
