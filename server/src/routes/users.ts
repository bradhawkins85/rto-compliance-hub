import { Router } from 'express';
import * as usersController from '../controllers/users';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireOwnershipOrRole } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    List users with filters and pagination
 * @access  Private - requires 'read' permission on 'users'
 */
router.get(
  '/',
  authenticate,
  requirePermission('users', 'read'),
  usersController.listUsers
);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private - requires 'create' permission on 'users'
 */
router.post(
  '/',
  authenticate,
  requirePermission('users', 'create'),
  usersController.createUser
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user details
 * @access  Private - requires ownership or 'read' permission
 */
router.get(
  '/:id',
  authenticate,
  requireOwnershipOrRole('id', 'SystemAdmin', 'ComplianceAdmin'),
  usersController.getUser
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Private - requires 'update' permission on 'users'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('users', 'update'),
  usersController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Soft delete user
 * @access  Private - requires 'delete' permission on 'users'
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('users', 'delete'),
  usersController.deleteUser
);

/**
 * @route   POST /api/v1/users/:id/credentials
 * @desc    Add credential to user
 * @access  Private - requires ownership or 'update' permission
 */
router.post(
  '/:id/credentials',
  authenticate,
  requireOwnershipOrRole('id', 'SystemAdmin', 'ComplianceAdmin'),
  usersController.addCredential
);

/**
 * @route   GET /api/v1/users/:id/pd
 * @desc    Get user's professional development records
 * @access  Private - requires ownership or 'read' permission
 */
router.get(
  '/:id/pd',
  authenticate,
  requireOwnershipOrRole('id', 'SystemAdmin', 'ComplianceAdmin'),
  usersController.getUserPDItems
);

export default router;
