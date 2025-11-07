import { Router } from 'express';
import * as standardsController from '../controllers/standards';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/standards
 * @desc    List standards with filters and pagination
 * @access  Private - requires 'read' permission on 'standards'
 */
router.get(
  '/',
  authenticate,
  requirePermission('standards', 'read'),
  standardsController.listStandards
);

/**
 * @route   GET /api/v1/standards/:id
 * @desc    Get standard details
 * @access  Private - requires 'read' permission on 'standards'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('standards', 'read'),
  standardsController.getStandard
);

/**
 * @route   GET /api/v1/standards/:id/mappings
 * @desc    Get standard mappings (policies, SOPs, evidence)
 * @access  Private - requires 'read' permission on 'standards'
 */
router.get(
  '/:id/mappings',
  authenticate,
  requirePermission('standards', 'read'),
  standardsController.getStandardMappings
);

export default router;
