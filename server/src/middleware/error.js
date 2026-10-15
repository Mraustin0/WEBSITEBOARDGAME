import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

// 404 handler for unmatched routes
export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'not found' });
}

// central error handler (must keep 4-arg signature so express treats it as error middleware)
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // body-parser: JSON เสีย / body ใหญ่เกิน → 400 / 413 (ไม่ใช่ 500)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request body too large' });
  }
  const status = err?.status ?? err?.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.expose ? err.message : 'bad request' });
  }

  // mongoose duplicate key
  if (err && err.code === 11000) {
    return res.status(409).json({ error: 'duplicate', details: err.keyValue });
  }

  // mongoose validation error
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: 'validation failed', details: err.errors });
  }

  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: isProd ? 'server error' : err.message });
}
