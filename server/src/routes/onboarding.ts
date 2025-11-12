import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/onboarding/workflows
 * @desc    List onboarding workflows
 * @access  Private - requires 'read' permission on 'onboarding'
 */
router.get(
  '/workflows',
  authenticate,
  requirePermission('onboarding', 'read'),
  onboardingController.listWorkflows
);

/**
 * @route   POST /api/v1/onboarding/workflows
 * @desc    Create new onboarding workflow
 * @access  Private - requires 'create' permission on 'onboarding'
 */
router.post(
  '/workflows',
  authenticate,
  requirePermission('onboarding', 'create'),
  onboardingController.createWorkflow
);

/**
 * @route   GET /api/v1/onboarding/workflows/:id
 * @desc    Get workflow details
 * @access  Private - requires 'read' permission on 'onboarding'
 */
router.get(
  '/workflows/:id',
  authenticate,
  requirePermission('onboarding', 'read'),
  onboardingController.getWorkflow
);

/**
 * @route   PATCH /api/v1/onboarding/workflows/:id
 * @desc    Update workflow
 * @access  Private - requires 'update' permission on 'onboarding'
 */
router.patch(
  '/workflows/:id',
  authenticate,
  requirePermission('onboarding', 'update'),
  onboardingController.updateWorkflow
);

/**
 * @route   DELETE /api/v1/onboarding/workflows/:id
 * @desc    Delete workflow
 * @access  Private - requires 'delete' permission on 'onboarding'
 */
router.delete(
  '/workflows/:id',
  authenticate,
  requirePermission('onboarding', 'delete'),
  onboardingController.deleteWorkflow
);

/**
 * @route   POST /api/v1/onboarding/workflows/:id/templates
 * @desc    Add task template to workflow
 * @access  Private - requires 'create' permission on 'onboarding'
 */
router.post(
  '/workflows/:id/templates',
  authenticate,
  requirePermission('onboarding', 'create'),
  onboardingController.addTaskTemplate
);

/**
 * @route   GET /api/v1/onboarding/assignments
 * @desc    List onboarding assignments
 * @access  Private - requires 'read' permission on 'onboarding'
 */
router.get(
  '/assignments',
  authenticate,
  requirePermission('onboarding', 'read'),
  onboardingController.listAssignments
);

/**
 * @route   POST /api/v1/onboarding/assignments
 * @desc    Create onboarding assignment for user
 * @access  Private - requires 'create' permission on 'onboarding'
 */
router.post(
  '/assignments',
  authenticate,
  requirePermission('onboarding', 'create'),
  onboardingController.createAssignment
);

/**
 * @route   GET /api/v1/onboarding/assignments/:id
 * @desc    Get assignment details with tasks
 * @access  Private - requires 'read' permission on 'onboarding'
 */
router.get(
  '/assignments/:id',
  authenticate,
  requirePermission('onboarding', 'read'),
  onboardingController.getAssignment
);

/**
 * @route   GET /api/v1/onboarding/assignments/user/:userId
 * @desc    Get user's onboarding assignments
 * @access  Private - requires ownership or permission
 */
router.get(
  '/assignments/user/:userId',
  authenticate,
  onboardingController.getUserAssignments
);

/**
 * @route   PATCH /api/v1/onboarding/tasks/:id
 * @desc    Update task status
 * @access  Private
 */
router.patch(
  '/tasks/:id',
  authenticate,
  onboardingController.updateTask
);

/**
 * @route   POST /api/v1/onboarding/tasks/:id/complete
 * @desc    Mark task as complete
 * @access  Private
 */
router.post(
  '/tasks/:id/complete',
  authenticate,
  onboardingController.completeTask
);

/**
 * @route   GET /api/v1/onboarding/progress/:userId
 * @desc    Get onboarding progress for user
 * @access  Private
 */
router.get(
  '/progress/:userId',
  authenticate,
  onboardingController.getOnboardingProgress
);

export default router;
