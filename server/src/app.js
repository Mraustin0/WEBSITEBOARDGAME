import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { openapiSpec } from './lib/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import authRoutes       from './modules/auth/auth.routes.js';
import gamesRoutes      from './modules/games/games.routes.js';
import collectionRoutes from './modules/collection/collection.routes.js';
import playsRoutes      from './modules/plays/plays.routes.js';
import reviewsRoutes    from './modules/reviews/reviews.routes.js';
import bggRoutes        from './modules/bgg/bgg.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Boardgame Everyday API' }));

  app.use('/api/auth',       authRoutes);
  app.use('/api/games',      gamesRoutes);
  app.use('/api/collection', collectionRoutes);
  app.use('/api/plays',      playsRoutes);
  app.use('/api/reviews',    reviewsRoutes);
  app.use('/api/bgg',        bggRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
