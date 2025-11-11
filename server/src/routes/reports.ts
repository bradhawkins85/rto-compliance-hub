import { Router } from 'express';
import * as reportsController from '../controllers/reports';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/reports/compliance-gaps
 * @desc    Generate Compliance Gap Analysis Report (PDF)
 * @access  Private - requires 'read' permission on 'standards'
 */
router.get(
  '/compliance-gaps',
  authenticate,
  requirePermission('standards', 'read'),
  reportsController.generateComplianceGapReport
);

/**
 * @route   GET /api/v1/reports/audit-readiness
 * @desc    Generate Audit Readiness Report (PDF)
 * @access  Private - requires 'read' permission on 'policies'
 */
router.get(
  '/audit-readiness',
  authenticate,
  requirePermission('policies', 'read'),
  reportsController.generateAuditReadinessReport
);

/**
 * @route   GET /api/v1/reports/pd-completion
 * @desc    Generate PD Completion Report (PDF)
 * @access  Private - requires 'read' permission on 'pd'
 */
router.get(
  '/pd-completion',
  authenticate,
  requirePermission('pd', 'read'),
  reportsController.generatePDCompletionReport
);

/**
 * @route   GET /api/v1/reports/feedback-summary
 * @desc    Generate Feedback Summary Report (PDF)
 * @access  Private - requires 'read' permission on 'feedback'
 */
router.get(
  '/feedback-summary',
  authenticate,
  requirePermission('feedback', 'read'),
  reportsController.generateFeedbackSummaryReport
);

export default router;
