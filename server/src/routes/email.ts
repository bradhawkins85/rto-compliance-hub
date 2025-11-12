import express from 'express';
import {
  sendTestEmail,
  getEmailLogs,
  getEmailStats,
  handleUnsubscribe,
  retryFailed,
  triggerPolicyReviewReminders,
  triggerCredentialExpiryAlerts,
  triggerPDDueReminders,
  triggerDailyDigests,
  sendWelcome,
} from '../controllers/email';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = express.Router();

/**
 * @route   POST /api/v1/email/test
 * @desc    Send a test email
 * @access  SystemAdmin
 */
router.post('/test', authenticate, requirePermission('email', 'create'), sendTestEmail);

/**
 * @route   GET /api/v1/email/logs
 * @desc    Get email logs
 * @access  SystemAdmin, ComplianceAdmin
 */
router.get('/logs', authenticate, requirePermission('email', 'read'), getEmailLogs);

/**
 * @route   GET /api/v1/email/stats
 * @desc    Get email statistics
 * @access  SystemAdmin, ComplianceAdmin
 */
router.get('/stats', authenticate, requirePermission('email', 'read'), getEmailStats);

/**
 * @route   GET /api/v1/email/unsubscribe
 * @desc    Handle email unsubscribe
 * @access  Public
 */
router.get('/unsubscribe', handleUnsubscribe);

/**
 * @route   POST /api/v1/email/retry-failed
 * @desc    Retry failed email sends
 * @access  SystemAdmin
 */
router.post('/retry-failed', authenticate, requirePermission('email', 'update'), retryFailed);

/**
 * @route   POST /api/v1/email/trigger/policy-reviews
 * @desc    Trigger policy review reminders
 * @access  SystemAdmin
 */
router.post(
  '/trigger/policy-reviews',
  authenticate,
  requirePermission('email', 'create'),
  triggerPolicyReviewReminders
);

/**
 * @route   POST /api/v1/email/trigger/credential-expiry
 * @desc    Trigger credential expiry alerts
 * @access  SystemAdmin
 */
router.post(
  '/trigger/credential-expiry',
  authenticate,
  requirePermission('email', 'create'),
  triggerCredentialExpiryAlerts
);

/**
 * @route   POST /api/v1/email/trigger/pd-reminders
 * @desc    Trigger PD due reminders
 * @access  SystemAdmin
 */
router.post(
  '/trigger/pd-reminders',
  authenticate,
  requirePermission('email', 'create'),
  triggerPDDueReminders
);

/**
 * @route   POST /api/v1/email/trigger/daily-digests
 * @desc    Trigger daily digest emails
 * @access  SystemAdmin
 */
router.post(
  '/trigger/daily-digests',
  authenticate,
  requirePermission('email', 'create'),
  triggerDailyDigests
);

/**
 * @route   POST /api/v1/email/welcome/:userId
 * @desc    Send welcome email to a user
 * @access  SystemAdmin
 */
router.post('/welcome/:userId', authenticate, requirePermission('email', 'create'), sendWelcome);

export default router;
