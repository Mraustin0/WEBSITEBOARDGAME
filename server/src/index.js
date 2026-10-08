import { env } from './config/env.js';
import { connectDb, disconnectDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { createApp } from './app.js';
import { startLifecycleJob } from './modules/reservations/reservations.lifecycle.js';
import { ensureSystemRoles } from './modules/roles/roles.service.js';

async function main() {
  await connectDb(env.MONGODB_URI);
  await ensureSystemRoles().catch((err) => logger.warn({ err }, 'ensureSystemRoles failed'));
  const app = createApp();
  startLifecycleJob(); // booked → playing อัตโนมัติเมื่อถึงเวลาเริ่ม
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
    logger.info(`API docs: http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'startup failed');
  process.exit(1);
});
