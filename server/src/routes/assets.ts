import { Router } from 'express';
import * as assetsController from '../controllers/assets';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/assets
 * @desc    List assets with filters and pagination
 * @access  Private - requires 'read' permission on 'assets'
 */
router.get(
  '/',
  authenticate,
  requirePermission('assets', 'read'),
  assetsController.listAssets
);

/**
 * @route   GET /api/v1/assets/export
 * @desc    Export assets as CSV
 * @access  Private - requires 'read' permission on 'assets'
 */
router.get(
  '/export',
  authenticate,
  requirePermission('assets', 'read'),
  assetsController.exportAssets
);

/**
 * @route   POST /api/v1/assets
 * @desc    Create new asset
 * @access  Private - requires 'create' permission on 'assets'
 */
router.post(
  '/',
  authenticate,
  requirePermission('assets', 'create'),
  assetsController.createAsset
);

/**
 * @route   GET /api/v1/assets/:id
 * @desc    Get asset with service history
 * @access  Private - requires 'read' permission on 'assets'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('assets', 'read'),
  assetsController.getAsset
);

/**
 * @route   PATCH /api/v1/assets/:id
 * @desc    Update asset
 * @access  Private - requires 'update' permission on 'assets'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('assets', 'update'),
  assetsController.updateAsset
);

/**
 * @route   POST /api/v1/assets/:id/service
 * @desc    Log service event for asset
 * @access  Private - requires 'update' permission on 'assets'
 */
router.post(
  '/:id/service',
  authenticate,
  requirePermission('assets', 'update'),
  assetsController.logAssetService
);

/**
 * @route   POST /api/v1/assets/:id/state
 * @desc    Transition asset lifecycle state
 * @access  Private - requires 'update' permission on 'assets'
 */
router.post(
  '/:id/state',
  authenticate,
  requirePermission('assets', 'update'),
  assetsController.transitionAssetState
);

/**
 * @route   GET /api/v1/assets/:id/history
 * @desc    Get asset service history
 * @access  Private - requires 'read' permission on 'assets'
 */
router.get(
  '/:id/history',
  authenticate,
  requirePermission('assets', 'read'),
  assetsController.getAssetHistory
);

/**
 * @route   DELETE /api/v1/assets/:id
 * @desc    Delete (retire) asset
 * @access  Private - requires 'delete' permission on 'assets'
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('assets', 'delete'),
  assetsController.deleteAsset
);

export default router;
