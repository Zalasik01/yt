import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`API ouvindo em http://localhost:${env.PORT}/api/v1`);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'encerrando API...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
