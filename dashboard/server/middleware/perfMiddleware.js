import crypto from 'crypto';
import { perf } from '../utils/performance.js';

export function perfMiddleware(req, res, next) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();

  res.once('finish', () => {
    const durationMs = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';

    perf.record('api', `${req.method} ${route}`, durationMs, {
      statusCode: res.statusCode,
      requestId,
    });

    const slowThreshold = 2000;
    if (durationMs > slowThreshold) {
      const msg = JSON.stringify({
        type: 'slow_request',
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationMs,
        requestId,
        threshold: slowThreshold,
      });
      console.warn(`[PERF] ${msg}`);
    }
  });

  next();
}
