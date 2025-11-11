/**
 * Accelerate Sync Routes
 * Routes for Accelerate LMS synchronization
 */

import { Router } from 'express';
import * as accelerateSyncController from '../controllers/accelerateSync';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/sync/accelerate/test
 * @desc    Test connection to Accelerate API
 * @access  Private - requires SystemAdmin role
 */
router.get(
  '/test',
  authenticate,
  requirePermission('integrations', 'read'),
  accelerateSyncController.testConnection
);

/**
 * @route   POST /api/v1/sync/accelerate
 * @desc    Trigger manual sync from Accelerate
 * @access  Private - requires SystemAdmin role
 */
router.post(
  '/',
  authenticate,
  requirePermission('integrations', 'create'),
  accelerateSyncController.triggerSync
);

/**
 * @route   GET /api/v1/sync/accelerate/status
 * @desc    Get sync status and history
 * @access  Private - requires SystemAdmin role
 */
router.get(
  '/status',
  authenticate,
  requirePermission('integrations', 'read'),
  accelerateSyncController.getSyncStatus
);

/**
 * @route   GET /api/v1/sync/accelerate/stats
 * @desc    Get sync statistics
 * @access  Private - requires SystemAdmin role
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('integrations', 'read'),
  accelerateSyncController.getSyncStats
);

/**
 * @route   GET /api/v1/sync/accelerate/students
 * @desc    Get synced students from Accelerate
 * @access  Private - requires read permission
 */
router.get(
  '/students',
  authenticate,
  requirePermission('integrations', 'read'),
  accelerateSyncController.getStudents
);

/**
 * @route   GET /api/v1/sync/accelerate/enrollments
 * @desc    Get synced enrollments from Accelerate
 * @access  Private - requires read permission
 */
router.get(
  '/enrollments',
  authenticate,
  requirePermission('integrations', 'read'),
  accelerateSyncController.getEnrollments
);

export default router;
