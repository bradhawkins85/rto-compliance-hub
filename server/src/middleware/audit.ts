import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid disrupting the main flow
  }
}

/**
 * Middleware to automatically log authentication events
 */
export function auditAuthEvent(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to intercept response
    res.json = function (body: any): Response {
      // Only log successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.userId || req.body?.email || 'unknown';
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Log async but don't wait
        createAuditLog(
          userId,
          action,
          'Auth',
          userId,
          {
            endpoint: req.path,
            method: req.method,
            success: true,
          },
          ipAddress,
          userAgent
        ).catch(err => console.error('Audit log error:', err));
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to log failed authentication attempts
 */
export function auditFailedAuth(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original status method
    const originalStatus = res.status.bind(res);

    // Override status method to intercept error status
    res.status = function (code: number): Response {
      if (code === 401 || code === 403) {
        const userId = req.user?.userId || req.body?.email || 'unknown';
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Log async but don't wait
        createAuditLog(
          userId,
          action,
          'Auth',
          userId,
          {
            endpoint: req.path,
            method: req.method,
            success: false,
            statusCode: code,
          },
          ipAddress,
          userAgent
        ).catch(err => console.error('Audit log error:', err));
      }

      return originalStatus(code);
    };

    next();
  };
}
