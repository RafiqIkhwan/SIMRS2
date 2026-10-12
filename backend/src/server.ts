import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Koneksi database PostgreSQL berhasil terhubung');

    const server = app.listen(env.PORT, () => {
      logger.info(`Server SIMRS berjalan di http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Menerima sinyal ${signal}, mematikan server secara graceful...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Koneksi database ditutup. Server berhenti.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Gagal menjalankan server:', error);
    process.exit(1);
  }
};

startServer();
