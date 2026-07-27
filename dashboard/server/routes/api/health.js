import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

export default router;
