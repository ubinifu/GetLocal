import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// PrismaClient Singleton
// ---------------------------------------------------------------------------
// In development the module-level variable survives hot-reloads, preventing
// multiple PrismaClient instances from being created and exhausting database
// connections.  In production a single instance is created on first import.
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';

  const client = new PrismaClient({
    log: isProduction
      ? [{ level: 'error', emit: 'stdout' }]
      : [
          { level: 'query', emit: 'stdout' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ],
  });

  return client;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

/**
 * Establish a connection to the database.
 * Call this during application startup so connection issues are surfaced early.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL successfully');
  } catch (error) {
    console.error('[Database] Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
}

/**
 * Gracefully disconnect from the database.
 * Call this during application shutdown (e.g. SIGTERM / SIGINT handlers).
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[Database] Disconnected from PostgreSQL');
  } catch (error) {
    console.error('[Database] Error disconnecting from PostgreSQL:', error);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown hooks
// ---------------------------------------------------------------------------

function handleShutdown(signal: string): void {
  console.log(`[Database] Received ${signal}. Shutting down gracefully...`);
  disconnectDatabase().finally(() => process.exit(0));
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default prisma;
