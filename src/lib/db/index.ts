/**
 * Database utilities and Prisma client
 * 
 * Usage:
 * import { prisma } from '@/lib/db';
 * 
 * const users = await prisma.user.findMany();
 */

export { prisma, disconnect, testConnection } from './prisma';
export type * from '@prisma/client';
