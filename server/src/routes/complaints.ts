import { Router } from 'express';
import * as complaintsController from '../controllers/complaints';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/complaints
 * @desc    List complaints with filters and pagination
 * @access  Private - requires 'read' permission on 'complaints'
 */
router.get(
  '/',
  authenticate,
  requirePermission('complaints', 'read'),
  complaintsController.listComplaints
);

/**
 * @route   POST /api/v1/complaints
 * @desc    Create new complaint
 * @access  Private - requires 'create' permission on 'complaints'
 */
router.post(
  '/',
  authenticate,
  requirePermission('complaints', 'create'),
  complaintsController.createComplaint
);

/**
 * @route   GET /api/v1/complaints/:id
 * @desc    Get complaint by ID with full details
 * @access  Private - requires 'read' permission on 'complaints'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('complaints', 'read'),
  complaintsController.getComplaint
);

/**
 * @route   PATCH /api/v1/complaints/:id
 * @desc    Update complaint
 * @access  Private - requires 'update' permission on 'complaints'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('complaints', 'update'),
  complaintsController.updateComplaint
);

/**
 * @route   POST /api/v1/complaints/:id/close
 * @desc    Close complaint with resolution
 * @access  Private - requires 'update' permission on 'complaints'
 */
router.post(
  '/:id/close',
  authenticate,
  requirePermission('complaints', 'update'),
  complaintsController.closeComplaint
);

/**
 * @route   POST /api/v1/complaints/:id/escalate
 * @desc    Escalate complaint to management
 * @access  Private - requires 'update' permission on 'complaints'
 */
router.post(
  '/:id/escalate',
  authenticate,
  requirePermission('complaints', 'update'),
  complaintsController.escalateComplaint
);

/**
 * @route   GET /api/v1/complaints/:id/timeline
 * @desc    Get complaint timeline/audit trail
 * @access  Private - requires 'read' permission on 'complaints'
 */
router.get(
  '/:id/timeline',
  authenticate,
  requirePermission('complaints', 'read'),
  complaintsController.getComplaintTimeline
);

/**
 * @route   POST /api/v1/complaints/:id/notes
 * @desc    Add note to complaint
 * @access  Private - requires 'update' permission on 'complaints'
 */
router.post(
  '/:id/notes',
  authenticate,
  requirePermission('complaints', 'update'),
  complaintsController.addComplaintNote
);

export default router;
