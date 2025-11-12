/**
 * Accelerate Sync Controller
 * Handles API requests for Accelerate LMS synchronization
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../middleware/audit';
import { accelerateClient } from '../services/accelerate';
import { syncTrainers, syncStudents, syncEnrollments, syncAll } from '../services/accelerateSync';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

const prisma = new PrismaClient();

/**
 * Test connection to Accelerate API
 * GET /api/v1/sync/accelerate/test
 */
export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const result = await accelerateClient.testConnection();
    
    res.status(result.success ? 200 : 503).json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to test Accelerate connection',
      instance: req.path,
    });
  }
}

/**
 * Trigger manual sync
 * POST /api/v1/sync/accelerate
 */
export async function triggerSync(req: Request, res: Response): Promise<void> {
  try {
    const { syncType } = req.body;
    const userId = (req as any).user?.id;

    // Validate sync type
    const validSyncTypes = ['trainers', 'students', 'enrollments', 'full'];
    if (syncType && !validSyncTypes.includes(syncType)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid sync type. Must be one of: ${validSyncTypes.join(', ')}`,
        instance: req.path,
      });
      return;
    }

    // Check if API is configured
    if (!accelerateClient.isReady()) {
      res.status(503).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.3',
        title: 'Service Unavailable',
        status: 503,
        detail: 'Accelerate API is not configured. Set ACCELERATE_API_KEY and ACCELERATE_ORGANIZATION_ID environment variables.',
        instance: req.path,
      });
      return;
    }

    const finalSyncType = syncType || 'full';

    // Log audit trail for sync initiation
    if (userId) {
      await createAuditLog(
        userId,
        'sync',
        'AccelerateSync',
        `sync-${new Date().toISOString()}`,
        { syncType: finalSyncType, action: 'sync_initiated' },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Trigger sync asynchronously
    const syncPromise = (async () => {
      try {
        let results;
        switch (finalSyncType) {
          case 'trainers':
            results = [await syncTrainers(userId)];
            break;
          case 'students':
            results = [await syncStudents(userId)];
            break;
          case 'enrollments':
            results = [await syncEnrollments(userId)];
            break;
          case 'full':
          default:
            results = await syncAll(userId);
            break;
        }
        return results;
      } catch (error) {
        console.error('Sync error:', error);
        throw error;
      }
    })();

    // Return immediately with accepted status
    res.status(202).json({
      message: 'Sync started',
      syncType: finalSyncType,
      timestamp: new Date().toISOString(),
    });

    // Wait for sync to complete in background
    await syncPromise;
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to trigger sync',
      instance: req.path,
    });
  }
}

/**
 * Get sync status and history
 * GET /api/v1/sync/accelerate/status
 */
export async function getSyncStatus(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { syncType, status } = req.query;

    const where: any = {};
    if (syncType) {
      where.syncType = syncType;
    }
    if (status) {
      where.status = status;
    }

    const total = await prisma.accelerateSyncLog.count({ where });

    const logs = await prisma.accelerateSyncLog.findMany({
      where,
      skip,
      take,
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json(
      createPaginatedResponse(logs, total, page, perPage)
    );
  } catch (error) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get sync status',
      instance: req.path,
    });
  }
}

/**
 * Get sync statistics
 * GET /api/v1/sync/accelerate/stats
 */
export async function getSyncStats(req: Request, res: Response): Promise<void> {
  try {
    const lastSync = await prisma.accelerateSyncLog.findFirst({
      where: { status: 'Completed' },
      orderBy: { completedAt: 'desc' },
    });

    const totalStudents = await prisma.accelerateStudent.count();
    const totalEnrollments = await prisma.accelerateEnrollment.count();
    const totalMappings = await prisma.accelerateMapping.count();

    const failedSyncs = await prisma.accelerateSyncLog.count({
      where: { status: 'Failed' },
    });

    const runningSyncs = await prisma.accelerateSyncLog.count({
      where: { status: 'Running' },
    });

    res.status(200).json({
      lastSync: lastSync ? {
        syncType: lastSync.syncType,
        completedAt: lastSync.completedAt,
        recordsSynced: lastSync.recordsSynced,
        recordsFailed: lastSync.recordsFailed,
      } : null,
      totals: {
        students: totalStudents,
        enrollments: totalEnrollments,
        mappings: totalMappings,
      },
      syncStatus: {
        failed: failedSyncs,
        running: runningSyncs,
      },
      isConfigured: accelerateClient.isReady(),
    });
  } catch (error) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get sync stats',
      instance: req.path,
    });
  }
}

/**
 * Get Accelerate students
 * GET /api/v1/sync/accelerate/students
 */
export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { q, enrollmentStatus } = req.query;

    const where: any = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q as string, mode: 'insensitive' } },
        { lastName: { contains: q as string, mode: 'insensitive' } },
        { email: { contains: q as string, mode: 'insensitive' } },
      ];
    }
    if (enrollmentStatus) {
      where.enrollmentStatus = enrollmentStatus;
    }

    const total = await prisma.accelerateStudent.count({ where });

    const students = await prisma.accelerateStudent.findMany({
      where,
      skip,
      take,
      orderBy: { lastSyncedAt: 'desc' },
      include: {
        enrollments: {
          include: {
            trainingProduct: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    res.status(200).json(
      createPaginatedResponse(students, total, page, perPage)
    );
  } catch (error) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get students',
      instance: req.path,
    });
  }
}

/**
 * Get Accelerate enrollments
 * GET /api/v1/sync/accelerate/enrollments
 */
export async function getEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { studentId, status, trainingProductId } = req.query;

    const where: any = {};
    if (studentId) {
      where.studentId = studentId;
    }
    if (status) {
      where.status = status;
    }
    if (trainingProductId) {
      where.trainingProductId = trainingProductId;
    }

    const total = await prisma.accelerateEnrollment.count({ where });

    const enrollments = await prisma.accelerateEnrollment.findMany({
      where,
      skip,
      take,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: { 
            id: true, 
            accelerateId: true, 
            firstName: true, 
            lastName: true, 
            email: true 
          },
        },
        trainingProduct: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.status(200).json(
      createPaginatedResponse(enrollments, total, page, perPage)
    );
  } catch (error) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get enrollments',
      instance: req.path,
    });
  }
}
