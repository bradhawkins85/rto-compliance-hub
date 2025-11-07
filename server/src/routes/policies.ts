import { Router } from 'express';
import * as policiesController from '../controllers/policies';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/policies
 * @desc    List policies with filters and pagination
 * @access  Private - requires 'read' permission on 'policies'
 */
router.get(
  '/',
  authenticate,
  requirePermission('policies', 'read'),
  policiesController.listPolicies
);

/**
 * @route   POST /api/v1/policies
 * @desc    Create new policy
 * @access  Private - requires 'create' permission on 'policies'
 */
router.post(
  '/',
  authenticate,
  requirePermission('policies', 'create'),
  policiesController.createPolicy
);

/**
 * @route   GET /api/v1/policies/:id
 * @desc    Get policy with version history
 * @access  Private - requires 'read' permission on 'policies'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('policies', 'read'),
  policiesController.getPolicy
);

/**
 * @route   PATCH /api/v1/policies/:id
 * @desc    Update policy metadata
 * @access  Private - requires 'update' permission on 'policies'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('policies', 'update'),
  policiesController.updatePolicy
);

/**
 * @route   POST /api/v1/policies/:id/publish
 * @desc    Publish new policy version
 * @access  Private - requires 'update' permission on 'policies'
 */
router.post(
  '/:id/publish',
  authenticate,
  requirePermission('policies', 'update'),
  policiesController.publishPolicy
);

/**
 * @route   POST /api/v1/policies/:id/map
 * @desc    Map policy to standards
 * @access  Private - requires 'update' permission on 'policies'
 */
router.post(
  '/:id/map',
  authenticate,
  requirePermission('policies', 'update'),
  policiesController.mapPolicyToStandards
);

/**
 * @route   GET /api/v1/policies/:id/versions
 * @desc    Get policy version history
 * @access  Private - requires 'read' permission on 'policies'
 */
router.get(
  '/:id/versions',
  authenticate,
  requirePermission('policies', 'read'),
  policiesController.getPolicyVersions
);

export default router;
