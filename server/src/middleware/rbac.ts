import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if user has required role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: `Required role(s): ${roles.join(', ')}`,
        instance: req.path,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user has required permission
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required',
          instance: req.path,
        });
        return;
      }

      // Get user's roles from database
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // Check if any of the user's roles have the required permission
      const hasPermission = userRoles.some(userRole =>
        userRole.role.permissions.some(
          rp =>
            rp.permission.resource === resource &&
            rp.permission.action === action
        )
      );

      if (!hasPermission) {
        res.status(403).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
          title: 'Forbidden',
          status: 403,
          detail: `Permission denied: ${action} ${resource}`,
          instance: req.path,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Error checking permissions',
        instance: req.path,
      });
    }
  };
}

/**
 * Check if user can access their own resource or is an admin
 */
export function requireOwnershipOrRole(userIdParam: string, ...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    const userRoles = req.user.roles || [];

    // Check if user owns the resource or has required role
    const isOwner = req.user.userId === targetUserId;
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!isOwner && !hasRole) {
      res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: 'Access denied to this resource',
        instance: req.path,
      });
      return;
    }

    next();
  };
}
