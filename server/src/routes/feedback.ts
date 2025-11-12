import { Router } from 'express';
import * as feedbackController from '../controllers/feedback';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/feedback
 * @desc    List feedback with filters and pagination
 * @access  Private - requires 'read' permission on 'feedback'
 */
router.get(
  '/',
  authenticate,
  requirePermission('feedback', 'read'),
  feedbackController.listFeedback
);

/**
 * @route   POST /api/v1/feedback
 * @desc    Create manual feedback entry
 * @access  Private - requires 'create' permission on 'feedback'
 */
router.post(
  '/',
  authenticate,
  requirePermission('feedback', 'create'),
  feedbackController.createFeedback
);

/**
 * @route   GET /api/v1/feedback/insights
 * @desc    Get AI-generated insights from feedback
 * @access  Private - requires 'read' permission on 'feedback'
 */
router.get(
  '/insights',
  authenticate,
  requirePermission('feedback', 'read'),
  feedbackController.getFeedbackInsights
);

/**
 * @route   GET /api/v1/feedback/export
 * @desc    Export feedback data as CSV
 * @access  Private - requires 'read' permission on 'feedback'
 */
router.get(
  '/export',
  authenticate,
  requirePermission('feedback', 'read'),
  feedbackController.exportFeedback
);

/**
 * @route   GET /api/v1/feedback/:id
 * @desc    Get feedback by ID
 * @access  Private - requires 'read' permission on 'feedback'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('feedback', 'read'),
  feedbackController.getFeedback
);

/**
 * @route   PATCH /api/v1/feedback/:id
 * @desc    Update feedback
 * @access  Private - requires 'update' permission on 'feedback'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('feedback', 'update'),
  feedbackController.updateFeedback
);

/**
 * @route   DELETE /api/v1/feedback/:id
 * @desc    Delete feedback
 * @access  Private - requires 'delete' permission on 'feedback'
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('feedback', 'delete'),
  feedbackController.deleteFeedback
);

export default router;
