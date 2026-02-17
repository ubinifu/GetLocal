import app from './app';
import { config } from './config';
import prisma from './config/database';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('[Server] Database connected successfully');

    const server = app.listen(config.port, () => {
      console.log(
        `[Server] Running in ${config.nodeEnv} mode on port ${config.port}`,
      );
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────
    const gracefulShutdown = async (signal: string) => {
      console.log(`[Server] ${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        await prisma.$disconnect();
        console.log('[Server] Server closed. Database disconnected.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
