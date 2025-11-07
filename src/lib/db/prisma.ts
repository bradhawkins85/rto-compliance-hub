import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton instance
 * 
 * This pattern ensures we only create one Prisma Client instance
 * and reuse it across the application, preventing connection pool exhaustion.
 * 
 * In development, we attach the instance to globalThis to prevent
 * hot reload from creating multiple instances.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Disconnect from the database
 * Should be called when shutting down the application
 */
export async function disconnect() {
  await prisma.$disconnect();
}

/**
 * Test database connection
 * Useful for health checks
 */
export async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
