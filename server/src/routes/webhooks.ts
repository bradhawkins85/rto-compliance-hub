import express from 'express';
import { handleJotFormWebhook, getWebhookSubmissionStatus } from '../controllers/webhooks';

const router = express.Router();

/**
 * POST /api/v1/webhooks/jotform
 * Receive JotForm webhook submissions
 * Public endpoint - uses signature validation for security
 */
router.post('/jotform', handleJotFormWebhook);

/**
 * GET /api/v1/webhooks/jotform/status/:id
 * Get the processing status of a webhook submission
 * Public endpoint - only returns status information
 */
router.get('/jotform/status/:id', getWebhookSubmissionStatus);

export default router;
