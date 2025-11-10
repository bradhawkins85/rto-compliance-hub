import { Router } from 'express';
import * as xeroSyncController from '../controllers/xeroSync';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/sync/xero/authorize
 * @desc    Get Xero OAuth authorization URL
 * @access  Private - requires SystemAdmin role
 */
router.get(
  '/authorize',
  authenticate,
  requirePermission('sync', 'create'),
  xeroSyncController.getAuthUrl
);

/**
 * @route   GET /api/v1/sync/xero/callback
 * @desc    OAuth callback handler for Xero
 * @access  Public - OAuth callback endpoint
 */
router.get(
  '/callback',
  xeroSyncController.handleCallback
);

/**
 * @route   GET /api/v1/sync/xero/test
 * @desc    Test Xero connection
 * @access  Private - requires SystemAdmin role
 */
router.get(
  '/test',
  authenticate,
  requirePermission('sync', 'read'),
  xeroSyncController.testXeroConnection
);

/**
 * @route   GET /api/v1/sync/xero/status
 * @desc    Get Xero connection status and last sync info
 * @access  Private - requires read permission
 */
router.get(
  '/status',
  authenticate,
  requirePermission('sync', 'read'),
  xeroSyncController.getConnectionStatus
);

/**
 * @route   POST /api/v1/sync/xero
 * @desc    Trigger manual Xero employee sync
 * @access  Private - requires SystemAdmin role
 */
router.post(
  '/',
  authenticate,
  requirePermission('sync', 'create'),
  xeroSyncController.triggerSync
);

/**
 * @route   GET /api/v1/sync/xero/history
 * @desc    Get Xero sync history
 * @access  Private - requires read permission
 */
router.get(
  '/history',
  authenticate,
  requirePermission('sync', 'read'),
  xeroSyncController.getSyncHistoryHandler
);

/**
 * @route   DELETE /api/v1/sync/xero
 * @desc    Disconnect Xero integration
 * @access  Private - requires SystemAdmin role
 */
router.delete(
  '/',
  authenticate,
  requirePermission('sync', 'delete'),
  xeroSyncController.disconnectXeroHandler
);

export default router;
