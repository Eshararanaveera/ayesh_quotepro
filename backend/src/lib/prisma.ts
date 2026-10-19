import { PrismaClient } from '@prisma/client';

/**
 * One shared Prisma client for the whole app.
 * In development, `tsx watch` reloads files; keeping the client on globalThis
 * stops it opening a new connection pool on every reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
