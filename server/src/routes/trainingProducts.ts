import { Router } from 'express';
import * as trainingProductsController from '../controllers/trainingProducts';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * @route   GET /api/v1/training-products
 * @desc    List training products with filters and pagination
 * @access  Private - requires 'read' permission on 'training'
 */
router.get(
  '/',
  authenticate,
  requirePermission('training', 'read'),
  trainingProductsController.listTrainingProducts
);

/**
 * @route   POST /api/v1/training-products
 * @desc    Create new training product
 * @access  Private - requires 'create' permission on 'training'
 */
router.post(
  '/',
  authenticate,
  requirePermission('training', 'create'),
  trainingProductsController.createTrainingProduct
);

/**
 * @route   GET /api/v1/training-products/:id
 * @desc    Get training product with linked SOPs
 * @access  Private - requires 'read' permission on 'training'
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('training', 'read'),
  trainingProductsController.getTrainingProduct
);

/**
 * @route   PATCH /api/v1/training-products/:id
 * @desc    Update training product
 * @access  Private - requires 'update' permission on 'training'
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('training', 'update'),
  trainingProductsController.updateTrainingProduct
);

/**
 * @route   POST /api/v1/training-products/:id/sops
 * @desc    Link SOPs to training product
 * @access  Private - requires 'update' permission on 'training'
 */
router.post(
  '/:id/sops',
  authenticate,
  requirePermission('training', 'update'),
  trainingProductsController.linkSOPs
);

export default router;
