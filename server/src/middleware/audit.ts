import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sensitive fields to exclude from audit logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'apiKey',
  'privateKey',
  'encryptionKey',
];

/**
 * Remove sensitive data from an object recursively
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if key contains sensitive field names
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create an audit log entry
 * Logs are immutable - they can only be created, never updated or deleted
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
    // Sanitize changes to remove sensitive data
    const sanitizedChanges = changes ? sanitizeData(changes) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: sanitizedChanges,
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

/**
 * Generic audit middleware for CRUD operations
 * Captures before and after state for update operations
 * 
 * @param entityType - Type of entity being modified (e.g., 'Policy', 'User', 'Standard')
 * @param getEntityId - Function to extract entity ID from request
 * @param getBeforeState - Optional function to get entity state before modification
 */
export function auditCrudOperation(
  entityType: string,
  getEntityId: (req: Request) => string,
  getBeforeState?: (req: Request) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only audit if user is authenticated
    if (!req.user?.userId) {
      next();
      return;
    }

    const entityId = getEntityId(req);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const action = mapHttpMethodToAction(req.method);

    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let beforeState: any = null;

    // For updates, capture before state
    if (action === 'update' && getBeforeState) {
      try {
        beforeState = await getBeforeState(req);
      } catch (error) {
        console.error('Failed to get before state for audit:', error);
      }
    }

    // Intercept successful responses
    const interceptResponse = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const changes: any = {
          action: action,
          requestBody: req.body,
        };

        if (action === 'update' && beforeState) {
          changes.before = beforeState;
          changes.after = body;
        } else if (action === 'create') {
          changes.created = body;
        } else if (action === 'delete') {
          changes.deleted = beforeState || true;
        }

        // Log async but don't wait
        createAuditLog(
          req.user!.userId,
          action,
          entityType,
          entityId,
          changes,
          ipAddress,
          userAgent
        ).catch(err => console.error('Audit log error:', err));
      }

      return body;
    };

    // Override response methods
    res.json = function (body: any): Response {
      const result = interceptResponse(body);
      return originalJson(result);
    };

    res.send = function (body: any): Response {
      interceptResponse(body);
      return originalSend(body);
    };

    next();
  };
}

/**
 * Map HTTP method to audit action
 */
function mapHttpMethodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    case 'GET':
      return 'read';
    default:
      return method.toLowerCase();
  }
}

/**
 * Helper to create audit log for policy publication
 */
export async function auditPolicyPublication(
  userId: string,
  policyId: string,
  version: string,
  req: Request
): Promise<void> {
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await createAuditLog(
    userId,
    'publish',
    'Policy',
    policyId,
    { version, action: 'policy_published' },
    ipAddress,
    userAgent
  );
}

/**
 * Helper to create audit log for standard mapping changes
 */
export async function auditStandardMapping(
  userId: string,
  entityType: string,
  entityId: string,
  action: 'add' | 'remove',
  standardIds: string[],
  req: Request
): Promise<void> {
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await createAuditLog(
    userId,
    action === 'add' ? 'map_standards' : 'unmap_standards',
    entityType,
    entityId,
    { action, standardIds },
    ipAddress,
    userAgent
  );
}

/**
 * Helper to create audit log for role/permission changes
 */
export async function auditRoleChange(
  userId: string,
  targetUserId: string,
  action: 'add_role' | 'remove_role' | 'update_permissions',
  details: any,
  req: Request
): Promise<void> {
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await createAuditLog(
    userId,
    action,
    'User',
    targetUserId,
    details,
    ipAddress,
    userAgent
  );
}

/**
 * Helper to create audit log for data exports
 */
export async function auditDataExport(
  userId: string,
  entityType: string,
  exportType: 'csv' | 'pdf' | 'excel',
  filters: any,
  req: Request
): Promise<void> {
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await createAuditLog(
    userId,
    'export',
    entityType,
    'export-' + new Date().toISOString(),
    { exportType, filters, action: 'data_export' },
    ipAddress,
    userAgent
  );
}
