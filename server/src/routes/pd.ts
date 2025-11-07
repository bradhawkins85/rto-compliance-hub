import { Router } from 'express';
import * as pdController from '../controllers/pd';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/pd
 * @desc    List PD items with filters and pagination
 * @access  Private - requires 'read' permission on 'pd'
 */
router.get(
  '/',
  authenticate,
  requirePermission('pd', 'read'),
  pdController.listPDItems
);

/**
 * @route   POST /api/v1/pd
 * @desc    Create new PD item
 * @access  Private - requires 'create' permission on 'pd'
 */
router.post(
  '/',
  authenticate,
  requirePermission('pd', 'create'),
  pdController.createPDItem
);

/**
 * @route   GET /api/v1/pd/:id
 * @desc    Get PD item details
 * @access  Private - requires 'read' permission on 'pd'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('pd', 'read'),
  pdController.getPDItem
);

/**
 * @route   PATCH /api/v1/pd/:id
 * @desc    Update PD item
 * @access  Private - requires 'update' permission on 'pd'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('pd', 'update'),
  pdController.updatePDItem
);

/**
 * @route   POST /api/v1/pd/:id/complete
 * @desc    Mark PD item as complete with evidence
 * @access  Private - requires 'update' permission on 'pd'
 */
router.post(
  '/:id/complete',
  authenticate,
  requirePermission('pd', 'update'),
  pdController.completePDItem
);

/**
 * @route   POST /api/v1/pd/:id/verify
 * @desc    Verify completed PD item (manager approval)
 * @access  Private - requires 'update' permission on 'pd'
 */
router.post(
  '/:id/verify',
  authenticate,
  requirePermission('pd', 'update'),
  pdController.verifyPDItem
);

export default router;
