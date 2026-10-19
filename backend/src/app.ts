import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { api_v1 } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url?.includes('/factory/') ?? false } }));

  app.use('/api/v1', api_v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
