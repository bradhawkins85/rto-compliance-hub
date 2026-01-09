import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getPaginationParams,
  createPaginatedResponse,
  parseSortParams,
} from '../utils/pagination';
import { auditDataExport } from '../middleware/audit';
import {
  generateCSV,
  formatDateForCSV,
  generateExportFilename,
  setDownloadHeaders,
} from '../services/exportService';

const prisma = new PrismaClient();

/**
 * List audit logs with filters and pagination
 * GET /api/v1/audit-logs
 */
export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { userId, entityType, entityId, action, dateFrom, dateTo, q } = req.query;
    const sortParams = parseSortParams(req);

    // Build where clause
    const where: any = {};

    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    if (entityType && typeof entityType === 'string') {
      where.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string') {
      where.entityId = entityId;
    }

    if (action && typeof action === 'string') {
      where.action = action;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Search filter (searches in changes JSON)
    if (q && typeof q === 'string') {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    const response = createPaginatedResponse(auditLogs, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing audit logs',
      instance: req.path,
    });
  }
}

/**
 * Get a specific audit log by ID
 * GET /api/v1/audit-logs/:id
 */
export async function getAuditLog(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    if (!auditLog) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Audit log not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(auditLog);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving audit log',
      instance: req.path,
    });
  }
}

/**
 * Get audit logs for a specific entity
 * GET /api/v1/audit-logs/entity/:entityType/:entityId
 */
export async function getEntityAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.params;
    const { page, perPage, skip, take } = getPaginationParams(req);

    const where = {
      entityType,
      entityId,
    };

    const total = await prisma.auditLog.count({ where });

    const auditLogs = await prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    const response = createPaginatedResponse(auditLogs, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving entity audit logs',
      instance: req.path,
    });
  }
}

/**
 * Get audit log statistics
 * GET /api/v1/audit-logs/stats
 */
export async function getAuditLogStats(req: Request, res: Response): Promise<void> {
  try {
    const { dateFrom, dateTo } = req.query;

    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Get counts by action
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get counts by entity type
    const entityTypeStats = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get top users by activity
    const topUsers = await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get user details for top users
    const userIds = topUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    const topUsersWithDetails = topUsers.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        ...stat,
        user,
      };
    });

    // Get total count
    const totalLogs = await prisma.auditLog.count({ where });

    res.status(200).json({
      totalLogs,
      actionStats: actionStats.map(s => ({
        action: s.action,
        count: s._count.id,
      })),
      entityTypeStats: entityTypeStats.map(s => ({
        entityType: s.entityType,
        count: s._count.id,
      })),
      topUsers: topUsersWithDetails,
    });
  } catch (error) {
    console.error('Get audit log stats error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving audit log statistics',
      instance: req.path,
    });
  }
}

/**
 * Export audit logs to CSV
 * GET /api/v1/audit-logs/export
 */
export async function exportAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { userId, entityType, entityId, action, dateFrom, dateTo, format = 'csv' } = req.query;

    // Log the export action
    if (req.user?.userId) {
      await auditDataExport(
        req.user.userId,
        'AuditLog',
        format as 'csv' | 'pdf' | 'excel',
        { userId, entityType, entityId, action, dateFrom, dateTo },
        req
      );
    }

    // Build where clause (same as list)
    const where: any = {};

    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    if (entityType && typeof entityType === 'string') {
      where.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string') {
      where.entityId = entityId;
    }

    if (action && typeof action === 'string') {
      where.action = action;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Get audit logs (no pagination for export)
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // Format for CSV export
    const csvData = auditLogs.map(log => ({
      id: log.id,
      timestamp: formatDateForCSV(log.createdAt),
      user: log.user.name,
      userEmail: log.user.email,
      department: log.user.department,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || '',
      changes: log.changes ? JSON.stringify(log.changes) : '',
    }));

    const csv = generateCSV(csvData);
    const filename = generateExportFilename('audit-logs', 'csv');

    setDownloadHeaders(res, filename);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while exporting audit logs',
      instance: req.path,
    });
  }
}
