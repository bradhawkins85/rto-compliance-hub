import { Router } from 'express';
import * as sopsController from '../controllers/sops';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/sops
 * @desc    List SOPs with filters and pagination
 * @access  Private - requires 'read' permission on 'training'
 */
router.get(
  '/',
  authenticate,
  requirePermission('training', 'read'),
  sopsController.listSOPs
);

/**
 * @route   POST /api/v1/sops
 * @desc    Create new SOP
 * @access  Private - requires 'create' permission on 'training'
 */
router.post(
  '/',
  authenticate,
  requirePermission('training', 'create'),
  sopsController.createSOP
);

/**
 * @route   GET /api/v1/sops/:id
 * @desc    Get SOP details
 * @access  Private - requires 'read' permission on 'training'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('training', 'read'),
  sopsController.getSOP
);

/**
 * @route   PATCH /api/v1/sops/:id
 * @desc    Update SOP
 * @access  Private - requires 'update' permission on 'training'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('training', 'update'),
  sopsController.updateSOP
);

export default router;
