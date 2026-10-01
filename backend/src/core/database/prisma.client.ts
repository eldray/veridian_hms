/**
 * Prisma Client Singleton
 * ONE PrismaClient (and therefore ONE connection pool) for the whole app.
 * Import it everywhere:  import prisma from '<relative>/core/database/prisma.client';
 * Never call `new PrismaClient()` in application code (seed/scripts excepted).
 *
 * Pool size: set DB_POOL_SIZE (default 20). If DATABASE_URL already contains
 * `connection_limit=`, that value wins.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.DB_POOL_SIZE || '20');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '20');
    }
    return url.toString();
  } catch {
    return raw; // unparsable URL: let Prisma report the problem
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatabaseUrl(),
    log:
      process.env.NODE_ENV === 'development'
        ? (process.env.PRISMA_LOG_QUERIES === 'true'
            ? ['query', 'info', 'warn', 'error']
            : ['warn', 'error'])
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect();
};
process.on('beforeExit', shutdown);
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

export default prisma;
