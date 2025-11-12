import { Router } from 'express';
import * as auditLogsController from '../controllers/auditLogs';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * All audit log routes require authentication
 * Most routes also require SystemAdmin or ComplianceAdmin role
 */

/**
 * @route   GET /api/v1/audit-logs
 * @desc    List audit logs with filters and pagination
 * @access  Private (SystemAdmin, ComplianceAdmin)
 */
router.get(
  '/',
  authenticate,
  requirePermission('audit_logs', 'read'),
  auditLogsController.listAuditLogs
);

/**
 * @route   GET /api/v1/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (SystemAdmin, ComplianceAdmin)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('audit_logs', 'read'),
  auditLogsController.getAuditLogStats
);

/**
 * @route   GET /api/v1/audit-logs/export
 * @desc    Export audit logs to CSV
 * @access  Private (SystemAdmin, ComplianceAdmin)
 */
router.get(
  '/export',
  authenticate,
  requirePermission('audit_logs', 'export'),
  auditLogsController.exportAuditLogs
);

/**
 * @route   GET /api/v1/audit-logs/entity/:entityType/:entityId
 * @desc    Get audit logs for a specific entity
 * @access  Private (SystemAdmin, ComplianceAdmin)
 */
router.get(
  '/entity/:entityType/:entityId',
  authenticate,
  requirePermission('audit_logs', 'read'),
  auditLogsController.getEntityAuditLogs
);

/**
 * @route   GET /api/v1/audit-logs/:id
 * @desc    Get a specific audit log by ID
 * @access  Private (SystemAdmin, ComplianceAdmin)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('audit_logs', 'read'),
  auditLogsController.getAuditLog
);

export default router;
