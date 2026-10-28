import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { store } from './lib/cache';

const server = createApp().listen(env.PORT, () => {
  logger.info(`JobFlow API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await Promise.allSettled([prisma.$disconnect(), store.close()]);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
