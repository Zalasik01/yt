import { logger } from './lib/logger.js';
import { JobRunner } from './worker/job-runner.js';
import { runMaintenance } from './worker/maintenance.js';

const MAINTENANCE_INTERVAL_MS = 60_000;

const runner = new JobRunner();

const maintenance = setInterval(() => {
  runMaintenance().catch((error) => logger.error({ error }, 'falha na manutenção'));
}, MAINTENANCE_INTERVAL_MS);

function shutdown(signal: string) {
  logger.info({ signal }, 'encerrando worker após os jobs atuais...');
  clearInterval(maintenance);
  runner.stop();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

runMaintenance().catch((error) => logger.error({ error }, 'falha na manutenção'));
await runner.start();
logger.info('worker finalizado');
