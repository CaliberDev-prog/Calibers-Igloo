import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

import overviewRouter from './api/overview.js';
import configRouter from './api/config.js';
import discordRouter from './api/discord.js';
import ticketsRouter from './api/tickets.js';
import blacklistsRouter from './api/blacklists.js';
import messagesRouter from './api/messages.js';
import giveawaysRouter from './api/giveaways.js';
import usersRouter from './api/users.js';
import auditLogsRouter from './api/auditLogs.js';
import terminalRouter from './api/terminal.js';
import healthRouter from './api/health.js';

const router = Router();

router.use(authenticate);

router.use('/overview', overviewRouter);
router.use('/config', configRouter);
router.use('/', discordRouter);
router.use('/tickets', ticketsRouter);
router.use('/blacklists', blacklistsRouter);
router.use('/messages', messagesRouter);
router.use('/giveaways', giveawaysRouter);
router.use('/users', usersRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/commands', terminalRouter);
router.use('/health', healthRouter);

export default router;
