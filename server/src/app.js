import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { openapiSpec } from './lib/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authLimiter, bggLimiter } from './middleware/rate-limit.js';

import authRoutes from './modules/auth/auth.routes.js';
import gamesRoutes from './modules/games/games.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import bggRoutes from './modules/bgg/bgg.routes.js';
import tablesRoutes from './modules/tables/tables.routes.js';
import reservationsRoutes from './modules/reservations/reservations.routes.js';
import statsRoutes from './modules/stats/stats.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js';
import assistRoutes from './modules/assist/assist.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: 'Boardgame Everyday API' }),
  );

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/bgg', bggLimiter, bggRoutes);
  app.use('/api/tables', tablesRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/assist', assistRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/roles', rolesRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
