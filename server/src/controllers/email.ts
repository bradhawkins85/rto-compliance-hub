import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail, unsubscribeEmail, retryFailedEmails } from '../services/email';
import {
  sendWelcomeEmail,
  sendPolicyReviewReminders,
  sendCredentialExpiryAlerts,
  sendPDDueReminders,
  sendDailyDigests,
} from '../services/emailNotifications';

const prisma = new PrismaClient();

/**
 * Send a test email
 */
export async function sendTestEmail(req: Request, res: Response): Promise<void> {
  try {
    const { to, templateName, data } = req.body;

    if (!to || !templateName) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Email recipient (to) and templateName are required',
      });
      return;
    }

    const result = await sendEmail(to, templateName, data || {});

    if (result.success) {
      res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Test email sent successfully',
      });
    } else {
      res.status(500).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
        title: 'Internal Server Error',
        status: 500,
        detail: result.error || 'Failed to send test email',
      });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Get email logs
 */
export async function getEmailLogs(req: Request, res: Response): Promise<void> {
  try {
    const { status, to, templateName, page = '1', perPage = '30' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage as string)));

    const where: any = {};
    if (status) where.status = status;
    if (to) where.to = { contains: to as string, mode: 'insensitive' };
    if (templateName) where.templateName = templateName;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
      prisma.emailLog.count({ where }),
    ]);

    res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages: Math.ceil(total / perPageNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Get email statistics
 */
export async function getEmailStats(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [total, sent, failed, pending, bounced] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: 'sent' } }),
      prisma.emailLog.count({ where: { ...where, status: 'failed' } }),
      prisma.emailLog.count({ where: { ...where, status: 'pending' } }),
      prisma.emailLog.count({ where: { ...where, status: 'bounced' } }),
    ]);

    // Get stats by template
    const byTemplate = await prisma.emailLog.groupBy({
      by: ['templateName'],
      where,
      _count: {
        id: true,
      },
    });

    res.status(200).json({
      total,
      sent,
      failed,
      pending,
      bounced,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : '0',
      byTemplate: byTemplate.map(t => ({
        template: t.templateName,
        count: t._count.id,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Handle unsubscribe request
 */
export async function handleUnsubscribe(req: Request, res: Response): Promise<void> {
  try {
    const { email, userId } = req.query;

    if (!email && !userId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Either email or userId is required',
      });
      return;
    }

    if (email) {
      await unsubscribeEmail(email as string);
    } else if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
      });
      if (user) {
        await unsubscribeEmail(user.email);
      }
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #0066cc; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from email notifications.</p>
            <p>You can still access your account and manage your preferences in the settings.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error handling unsubscribe:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Retry failed emails
 */
export async function retryFailed(req: Request, res: Response): Promise<void> {
  try {
    const result = await retryFailedEmails();

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error retrying failed emails:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Trigger policy review reminders
 */
export async function triggerPolicyReviewReminders(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await sendPolicyReviewReminders();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error triggering policy review reminders:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Trigger credential expiry alerts
 */
export async function triggerCredentialExpiryAlerts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await sendCredentialExpiryAlerts();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error triggering credential expiry alerts:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Trigger PD due reminders
 */
export async function triggerPDDueReminders(req: Request, res: Response): Promise<void> {
  try {
    const result = await sendPDDueReminders();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error triggering PD due reminders:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Trigger daily digests
 */
export async function triggerDailyDigests(req: Request, res: Response): Promise<void> {
  try {
    const result = await sendDailyDigests();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error triggering daily digests:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}

/**
 * Send welcome email to a user
 */
export async function sendWelcome(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const result = await sendWelcomeEmail(userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Welcome email sent successfully',
      });
    } else {
      res.status(500).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
        title: 'Internal Server Error',
        status: 500,
        detail: result.error || 'Failed to send welcome email',
      });
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
    });
  }
}
