import { Router } from 'express';
import * as credentialsController from '../controllers/credentials';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/credentials
 * @desc    List credentials with filters and pagination
 * @access  Private - requires 'read' permission on 'credentials'
 */
router.get(
  '/',
  authenticate,
  requirePermission('credentials', 'read'),
  credentialsController.listCredentials
);

/**
 * @route   POST /api/v1/credentials
 * @desc    Create new credential
 * @access  Private - requires 'create' permission on 'credentials'
 */
router.post(
  '/',
  authenticate,
  requirePermission('credentials', 'create'),
  credentialsController.createCredential
);

/**
 * @route   GET /api/v1/credentials/:id
 * @desc    Get credential details
 * @access  Private - requires 'read' permission on 'credentials'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('credentials', 'read'),
  credentialsController.getCredential
);

/**
 * @route   PATCH /api/v1/credentials/:id
 * @desc    Update credential
 * @access  Private - requires 'update' permission on 'credentials'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('credentials', 'update'),
  credentialsController.updateCredential
);

export default router;
