import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit';
import { auditAuthEvent, auditFailedAuth } from '../middleware/audit';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post(
  '/login',
  loginRateLimiter,
  auditAuthEvent('login_attempt'),
  auditFailedAuth('login_failed'),
  authController.login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and clear tokens
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  auditAuthEvent('logout'),
  authController.logout
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token)
 */
router.post(
  '/refresh',
  auditAuthEvent('token_refresh'),
  authController.refresh
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  auditAuthEvent('password_change'),
  authController.changePassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Request password reset or complete password reset with token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  auditAuthEvent('password_reset'),
  authController.resetPassword
);

export default router;
