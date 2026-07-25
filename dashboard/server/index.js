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

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: IS_PROD ? CLIENT_URL : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    directConnection: true,
  });
  console.log('[DB] MongoDB connected');
} catch (err) {
  console.error('[DB] MongoDB connection error:', err.message);
}

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(clientDist, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DASHBOARD] Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});
