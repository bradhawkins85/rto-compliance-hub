import nodemailer, { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@rto-compliance-hub.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'RTO Compliance Hub';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@rto-compliance-hub.com';
const EMAIL_MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10);
const EMAIL_RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '5000', 10);

// Rate limiting
let emailsSentThisMinute = 0;
let emailsSentThisHour = 0;
let minuteResetTime = Date.now() + 60000;
let hourResetTime = Date.now() + 3600000;

const EMAIL_RATE_LIMIT_PER_MINUTE = parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || '30', 10);
const EMAIL_RATE_LIMIT_PER_HOUR = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '500', 10);

// SMTP transporter (lazy initialization)
let smtpTransporter: Transporter | null = null;

/**
 * Initialize SMTP transporter
 */
function getSmtpTransporter(): Transporter {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return smtpTransporter;
}

/**
 * Initialize SendGrid
 */
function initializeSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SendGrid API key not configured');
  }
  sgMail.setApiKey(apiKey);
}

/**
 * Check and update rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now();

  // Reset counters if time windows have elapsed
  if (now >= minuteResetTime) {
    emailsSentThisMinute = 0;
    minuteResetTime = now + 60000;
  }
  if (now >= hourResetTime) {
    emailsSentThisHour = 0;
    hourResetTime = now + 3600000;
  }

  // Check if rate limit is exceeded
  if (emailsSentThisMinute >= EMAIL_RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  if (emailsSentThisHour >= EMAIL_RATE_LIMIT_PER_HOUR) {
    return false;
  }

  return true;
}

/**
 * Increment rate limit counters
 */
function incrementRateLimit(): void {
  emailsSentThisMinute++;
  emailsSentThisHour++;
}

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  templateId?: string;
  metadata?: Record<string, any>;
  replyTo?: string;
}

export interface BatchEmailOptions {
  emails: EmailOptions[];
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<string> {
  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('Email rate limit exceeded. Please try again later.');
  }

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      templateId: options.templateId || null,
      recipientEmail: options.to,
      recipientName: options.toName || null,
      subject: options.subject,
      htmlBody: options.html,
      textBody: options.text,
      status: 'pending',
      provider: EMAIL_PROVIDER,
      metadata: options.metadata || null,
    },
  });

  try {
    let providerId: string | undefined;

    switch (EMAIL_PROVIDER) {
      case 'sendgrid':
        providerId = await sendViaSendGrid(options);
        break;

      case 'ses':
        // AWS SES implementation would go here
        throw new Error('AWS SES provider not yet implemented');

      case 'smtp':
      default:
        providerId = await sendViaSmtp(options);
        break;
    }

    // Update email log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'sent',
        providerId: providerId || null,
        sentAt: new Date(),
      },
    });

    incrementRateLimit();
    return emailLog.id;
  } catch (error: any) {
    // Update email log with failure
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSmtp(options: EmailOptions): Promise<string> {
  const transporter = getSmtpTransporter();

  const mailOptions = {
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS}>`,
    to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
    replyTo: options.replyTo || EMAIL_REPLY_TO,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions): Promise<string> {
  initializeSendGrid();

  const msg = {
    to: {
      email: options.to,
      name: options.toName,
    },
    from: {
      email: EMAIL_FROM_ADDRESS,
      name: EMAIL_FROM_NAME,
    },
    replyTo: options.replyTo || EMAIL_REPLY_TO,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const [response] = await sgMail.send(msg);
  return response.headers['x-message-id'] || '';
}

/**
 * Send batch/digest emails
 */
export async function sendBatchEmails(options: BatchEmailOptions): Promise<string[]> {
  const results: string[] = [];
  const errors: Error[] = [];

  for (const email of options.emails) {
    try {
      const id = await sendEmail(email);
      results.push(id);
    } catch (error: any) {
      errors.push(error);
      console.error('Failed to send email:', error.message);
    }
  }

  if (errors.length > 0 && results.length === 0) {
    throw new Error(`All emails failed to send: ${errors[0].message}`);
  }

  return results;
}

/**
 * Retry failed emails
 */
export async function retryFailedEmail(emailLogId: string): Promise<void> {
  const emailLog = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
  });

  if (!emailLog) {
    throw new Error('Email log not found');
  }

  if (emailLog.status === 'sent') {
    throw new Error('Email already sent');
  }

  if (emailLog.retryCount >= EMAIL_MAX_RETRIES) {
    throw new Error('Maximum retry attempts exceeded');
  }

  // Wait before retrying
  await new Promise((resolve) => setTimeout(resolve, EMAIL_RETRY_DELAY_MS * (emailLog.retryCount + 1)));

  try {
    const options: EmailOptions = {
      to: emailLog.recipientEmail,
      toName: emailLog.recipientName || undefined,
      subject: emailLog.subject,
      html: emailLog.htmlBody || '',
      text: emailLog.textBody || '',
      templateId: emailLog.templateId || undefined,
      metadata: emailLog.metadata as Record<string, any> | undefined,
    };

    let providerId: string | undefined;

    switch (EMAIL_PROVIDER) {
      case 'sendgrid':
        providerId = await sendViaSendGrid(options);
        break;

      case 'smtp':
      default:
        providerId = await sendViaSmtp(options);
        break;
    }

    // Update email log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'sent',
        providerId: providerId || null,
        sentAt: new Date(),
        retryCount: emailLog.retryCount + 1,
        lastRetryAt: new Date(),
      },
    });

    incrementRateLimit();
  } catch (error: any) {
    // Update retry count
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        retryCount: emailLog.retryCount + 1,
        lastRetryAt: new Date(),
        errorMessage: error.message || 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Process failed emails with retry logic
 */
export async function processFailedEmails(): Promise<void> {
  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: 'failed',
      retryCount: {
        lt: EMAIL_MAX_RETRIES,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 10, // Process 10 at a time
  });

  for (const email of failedEmails) {
    try {
      await retryFailedEmail(email.id);
      console.log(`Successfully retried email ${email.id}`);
    } catch (error: any) {
      console.error(`Failed to retry email ${email.id}:`, error.message);
    }
  }
}

/**
 * Check email preferences and determine if user should receive email
 */
export async function checkEmailPreferences(
  userId: string,
  emailType: 'policy' | 'credential' | 'pd' | 'complaint' | 'digest' | 'marketing'
): Promise<boolean> {
  const preferences = await prisma.emailPreference.findUnique({
    where: { userId },
  });

  // If no preferences set, default to allowing all except marketing
  if (!preferences) {
    return emailType !== 'marketing';
  }

  // Check if user unsubscribed from all emails
  if (preferences.unsubscribeAll) {
    return false;
  }

  // Check specific email type preference
  switch (emailType) {
    case 'policy':
      return preferences.policyReminders;
    case 'credential':
      return preferences.credentialAlerts;
    case 'pd':
      return preferences.pdReminders;
    case 'complaint':
      return preferences.complaintNotifications;
    case 'digest':
      return preferences.digestEmails;
    case 'marketing':
      return preferences.marketingEmails;
    default:
      return true;
  }
}

/**
 * Log email bounce
 */
export async function logEmailBounce(
  emailLogId: string,
  bounceType: string,
  bounceMessage: string
): Promise<void> {
  await prisma.emailLog.update({
    where: { id: emailLogId },
    data: {
      status: 'bounced',
      errorMessage: `${bounceType}: ${bounceMessage}`,
      failedAt: new Date(),
    },
  });

  console.log(`Email ${emailLogId} bounced: ${bounceType} - ${bounceMessage}`);
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const testOptions: EmailOptions = {
      to: EMAIL_FROM_ADDRESS,
      subject: 'Test Email Configuration',
      html: '<p>This is a test email to verify email configuration.</p>',
      text: 'This is a test email to verify email configuration.',
    };

    if (EMAIL_PROVIDER === 'smtp') {
      const transporter = getSmtpTransporter();
      await transporter.verify();
    }

    return true;
  } catch (error: any) {
    console.error('Email configuration test failed:', error.message);
    return false;
  }
}
