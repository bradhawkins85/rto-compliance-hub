/**
 * Database utilities and Prisma client
 * 
 * Usage:
 * import { prisma } from '@/lib/db';
 * 
 * const users = await prisma.user.findMany();
 */

export { prisma, disconnect, testConnection } from './prisma';
export { addDaysToNow, addDays, getDueSoonRange, MILLISECONDS_PER_DAY } from './dateUtils';
export type * from '@prisma/client';
