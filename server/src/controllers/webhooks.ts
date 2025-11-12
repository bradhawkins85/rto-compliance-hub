import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validateJotFormSignature,
  detectFormType,
  mapJotFormToFeedback,
} from '../utils/jotform';
import { analyzeSingleFeedback } from '../services/aiAnalysis';

const prisma = new PrismaClient();

/**
 * POST /api/v1/webhooks/jotform
 * Receives and processes JotForm webhook submissions
 */
export async function handleJotFormWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    // Log webhook receipt
    console.log('📨 JotForm webhook received', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Get signature from headers
    const signature = req.get('x-jotform-signature') || '';
    const secret = process.env.JOTFORM_WEBHOOK_SECRET || '';

    // Validate signature if secret is configured
    if (secret) {
      const rawBody = JSON.stringify(req.body);
      const isValid = validateJotFormSignature(rawBody, signature, secret);

      if (!isValid) {
        console.error('❌ Invalid JotForm signature');
        return res.status(401).json({
          type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid webhook signature',
        });
      }
      console.log('✅ Signature validated');
    } else {
      console.warn('⚠️  No webhook secret configured - signature validation skipped');
    }

    // Extract submission data
    const payload = req.body;
    const formId = payload.formID || payload.form_id || 'unknown';
    const submissionId = payload.submissionID || payload.submission_id || payload.id;

    if (!submissionId) {
      console.error('❌ No submission ID in payload');
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Missing submission ID in webhook payload',
      });
    }

    // Check for duplicate submission
    const existingSubmission = await prisma.webhookSubmission.findUnique({
      where: {
        source_submissionId: {
          source: 'jotform',
          submissionId: submissionId.toString(),
        },
      },
    });

    if (existingSubmission) {
      console.log('ℹ️  Duplicate submission detected, returning success', {
        submissionId,
        existingId: existingSubmission.id,
      });
      return res.status(200).json({
        message: 'Submission already processed',
        submissionId: existingSubmission.id,
      });
    }

    // Detect form type
    const formType = detectFormType(formId, payload);
    console.log('🔍 Form type detected:', formType);

    // Store webhook submission for processing
    const webhookSubmission = await prisma.webhookSubmission.create({
      data: {
        source: 'jotform',
        formId: formId.toString(),
        submissionId: submissionId.toString(),
        formType,
        payload: payload as any,
        status: 'Pending',
        retryCount: 0,
      },
    });

    console.log('💾 Webhook submission stored:', webhookSubmission.id);

    // Queue for async processing
    // For now, process immediately. In production, use a proper queue like Bull or BullMQ
    setImmediate(async () => {
      try {
        await processWebhookSubmission(webhookSubmission.id);
      } catch (error) {
        console.error('Error processing webhook submission:', error);
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook accepted in ${processingTime}ms`);

    // Return 202 Accepted for async processing
    return res.status(202).json({
      message: 'Submission received and queued for processing',
      submissionId: webhookSubmission.id,
      processingTime: `${processingTime}ms`,
    });
  } catch (error) {
    console.error('❌ Error handling JotForm webhook:', error);
    
    return res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to process webhook submission',
      instance: req.path,
    });
  }
}

/**
 * Process a webhook submission (called asynchronously)
 */
async function processWebhookSubmission(submissionId: string, retryCount = 0): Promise<void> {
  const MAX_RETRIES = 3;
  
  try {
    console.log(`🔄 Processing webhook submission ${submissionId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    // Get submission from database
    const submission = await prisma.webhookSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      console.error('Webhook submission not found:', submissionId);
      return;
    }

    // Update status to Processing
    await prisma.webhookSubmission.update({
      where: { id: submissionId },
      data: { status: 'Processing' },
    });

    const payload = submission.payload as any;
    const formType = submission.formType || 'unknown';

    // Map payload to feedback structure
    const feedbackData = mapJotFormToFeedback(payload, formType);

    // Create feedback record
    const feedback = await prisma.feedback.create({
      data: {
        type: feedbackData.type,
        trainingProductId: feedbackData.trainingProductId || null,
        trainerId: feedbackData.trainerId || null,
        courseId: feedbackData.courseId || null,
        rating: feedbackData.rating || null,
        comments: feedbackData.comments || null,
        anonymous: feedbackData.anonymous,
        submittedAt: new Date(),
      },
    });

    console.log('✅ Feedback created:', feedback.id);

    // Analyze feedback with AI asynchronously (don't wait for completion)
    if (feedback.comments) {
      setImmediate(() => {
        analyzeSingleFeedback(feedback.id).catch(err => {
          console.error('Failed to analyze feedback:', err);
        });
      });
    }

    // Mark submission as completed
    await prisma.webhookSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'Completed',
        processedAt: new Date(),
        processingError: null,
      },
    });

    console.log(`✅ Webhook submission ${submissionId} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing webhook submission ${submissionId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (retryCount < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`🔄 Scheduling retry in ${retryDelay}ms`);

      await prisma.webhookSubmission.update({
        where: { id: submissionId },
        data: {
          retryCount: retryCount + 1,
          processingError: errorMessage,
        },
      });

      setTimeout(() => {
        processWebhookSubmission(submissionId, retryCount + 1);
      }, retryDelay);
    } else {
      // Mark as failed after max retries
      await prisma.webhookSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'Failed',
          processingError: errorMessage,
        },
      });

      console.error(`❌ Webhook submission ${submissionId} failed after ${MAX_RETRIES} retries`);
    }
  }
}

/**
 * GET /api/v1/webhooks/jotform/status/:id
 * Check the status of a webhook submission
 */
export async function getWebhookSubmissionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const submission = await prisma.webhookSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        formId: true,
        submissionId: true,
        formType: true,
        status: true,
        retryCount: true,
        processingError: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Webhook submission not found',
      });
    }

    return res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching webhook submission status:', error);
    
    return res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to fetch webhook submission status',
    });
  }
}
