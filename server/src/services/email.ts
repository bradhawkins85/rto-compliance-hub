import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@rto-compliance-hub.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'RTO Compliance Hub';
const EMAIL_MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3');
const EMAIL_RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '60000');

// Email templates registry
export interface EmailTemplate {
  subject: string;
  html: (data: any) => string;
  text: (data: any) => string;
}

export const emailTemplates: Record<string, EmailTemplate> = {
  'policy-review-reminder': {
    subject: 'Policy Review Due Soon',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .deadline { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RTO Compliance Hub</h1>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>This is a friendly reminder that the following policy is due for review:</p>
              <div class="deadline">
                <strong>Policy:</strong> ${data.policyTitle}<br>
                <strong>Review Due:</strong> ${data.reviewDueDate}<br>
                <strong>Days Remaining:</strong> ${data.daysRemaining}
              </div>
              <p>Please review and update this policy to ensure continued compliance.</p>
              <a href="${data.policyUrl}" class="button">Review Policy</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Hello ${data.userName},

This is a friendly reminder that the following policy is due for review:

Policy: ${data.policyTitle}
Review Due: ${data.reviewDueDate}
Days Remaining: ${data.daysRemaining}

Please review and update this policy to ensure continued compliance.

View Policy: ${data.policyUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },
  
  'credential-expiry-alert': {
    subject: 'Credential Expiring Soon',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RTO Compliance Hub</h1>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>Your credential is expiring soon:</p>
              <div class="alert">
                <strong>Credential:</strong> ${data.credentialName}<br>
                <strong>Type:</strong> ${data.credentialType}<br>
                <strong>Expires:</strong> ${data.expiryDate}<br>
                <strong>Days Remaining:</strong> ${data.daysRemaining}
              </div>
              <p>Please take action to renew this credential to maintain compliance.</p>
              <a href="${data.credentialUrl}" class="button">View Credential</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Hello ${data.userName},

Your credential is expiring soon:

Credential: ${data.credentialName}
Type: ${data.credentialType}
Expires: ${data.expiryDate}
Days Remaining: ${data.daysRemaining}

Please take action to renew this credential to maintain compliance.

View Credential: ${data.credentialUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },

  'pd-due-reminder': {
    subject: 'Professional Development Due',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .reminder { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RTO Compliance Hub</h1>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>You have professional development activities due:</p>
              <div class="reminder">
                <strong>Activity:</strong> ${data.pdTitle}<br>
                ${data.pdCategory ? `<strong>Category:</strong> ${data.pdCategory}<br>` : ''}
                ${data.pdHours ? `<strong>Hours:</strong> ${data.pdHours}<br>` : ''}
                <strong>Due Date:</strong> ${data.dueDate}<br>
                <strong>Days Remaining:</strong> ${data.daysRemaining}
              </div>
              <p>Please complete this activity to maintain your professional development requirements.</p>
              <a href="${data.pdUrl}" class="button">View Activity</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Hello ${data.userName},

You have professional development activities due:

Activity: ${data.pdTitle}
${data.pdCategory ? `Category: ${data.pdCategory}` : ''}
${data.pdHours ? `Hours: ${data.pdHours}` : ''}
Due Date: ${data.dueDate}
Days Remaining: ${data.daysRemaining}

Please complete this activity to maintain your professional development requirements.

View Activity: ${data.pdUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },

  'complaint-notification': {
    subject: 'New Complaint Received',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .urgent { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RTO Compliance Hub</h1>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>A new complaint has been received and requires your attention:</p>
              <div class="urgent">
                <strong>Complaint ID:</strong> ${data.complaintId}<br>
                <strong>Source:</strong> ${data.complaintSource}<br>
                <strong>Status:</strong> ${data.complaintStatus}<br>
                <strong>Received:</strong> ${data.receivedDate}<br>
                ${data.slaDeadline ? `<strong>SLA Deadline:</strong> ${data.slaDeadline}<br>` : ''}
              </div>
              <p>Please review and action this complaint within the SLA timeframe.</p>
              <a href="${data.complaintUrl}" class="button">View Complaint</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Hello ${data.userName},

A new complaint has been received and requires your attention:

Complaint ID: ${data.complaintId}
Source: ${data.complaintSource}
Status: ${data.complaintStatus}
Received: ${data.receivedDate}
${data.slaDeadline ? `SLA Deadline: ${data.slaDeadline}` : ''}

Please review and action this complaint within the SLA timeframe.

View Complaint: ${data.complaintUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },

  'welcome-onboarding': {
    subject: 'Welcome to RTO Compliance Hub',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .welcome { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to RTO Compliance Hub!</h1>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>Welcome to the RTO Compliance Hub! We're excited to have you on board.</p>
              <div class="welcome">
                <strong>Your Account Details:</strong><br>
                Email: ${data.userEmail}<br>
                Department: ${data.userDepartment}<br>
                Role: ${data.userRole}
              </div>
              <p>Here are some things you can do to get started:</p>
              <ul>
                <li>Complete your profile</li>
                <li>Review assigned policies and procedures</li>
                <li>Complete mandatory training modules</li>
                <li>Set up your notification preferences</li>
              </ul>
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Hello ${data.userName},

Welcome to the RTO Compliance Hub! We're excited to have you on board.

Your Account Details:
Email: ${data.userEmail}
Department: ${data.userDepartment}
Role: ${data.userRole}

Here are some things you can do to get started:
- Complete your profile
- Review assigned policies and procedures
- Complete mandatory training modules
- Set up your notification preferences

Go to Dashboard: ${data.dashboardUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },

  'digest-summary': {
    subject: 'Your Daily Compliance Digest',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .section { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
            .count { font-size: 24px; font-weight: bold; color: #0066cc; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Daily Digest</h1>
              <p>${data.digestDate}</p>
            </div>
            <div class="content">
              <p>Hello ${data.userName},</p>
              <p>Here's your daily compliance summary:</p>
              
              ${data.policyReviews && data.policyReviews.length > 0 ? `
              <div class="section">
                <h3>📋 Policy Reviews Due</h3>
                <p class="count">${data.policyReviews.length}</p>
                <ul>
                  ${data.policyReviews.map((p: any) => `<li>${p.title} - Due: ${p.dueDate}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${data.credentialsExpiring && data.credentialsExpiring.length > 0 ? `
              <div class="section">
                <h3>🎓 Credentials Expiring</h3>
                <p class="count">${data.credentialsExpiring.length}</p>
                <ul>
                  ${data.credentialsExpiring.map((c: any) => `<li>${c.name} - Expires: ${c.expiryDate}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${data.pdActivities && data.pdActivities.length > 0 ? `
              <div class="section">
                <h3>📚 PD Activities Due</h3>
                <p class="count">${data.pdActivities.length}</p>
                <ul>
                  ${data.pdActivities.map((pd: any) => `<li>${pd.title} - Due: ${pd.dueDate}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${data.complaints && data.complaints.length > 0 ? `
              <div class="section">
                <h3>⚠️ Open Complaints</h3>
                <p class="count">${data.complaints.length}</p>
                <ul>
                  ${data.complaints.map((c: any) => `<li>ID: ${c.id} - ${c.status}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${!data.policyReviews?.length && !data.credentialsExpiring?.length && !data.pdActivities?.length && !data.complaints?.length ? `
              <div class="section">
                <p>✅ No urgent items requiring your attention today!</p>
              </div>
              ` : ''}
              
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>RTO Compliance Hub</p>
              <p>If you no longer wish to receive these notifications, <a href="${data.unsubscribeUrl}">unsubscribe here</a>.</p>
              <p>Need help? Contact us at ${data.supportEmail || 'support@rto-compliance-hub.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Your Daily Digest
${data.digestDate}

Hello ${data.userName},

Here's your daily compliance summary:

${data.policyReviews && data.policyReviews.length > 0 ? `
📋 Policy Reviews Due: ${data.policyReviews.length}
${data.policyReviews.map((p: any) => `- ${p.title} - Due: ${p.dueDate}`).join('\n')}
` : ''}

${data.credentialsExpiring && data.credentialsExpiring.length > 0 ? `
🎓 Credentials Expiring: ${data.credentialsExpiring.length}
${data.credentialsExpiring.map((c: any) => `- ${c.name} - Expires: ${c.expiryDate}`).join('\n')}
` : ''}

${data.pdActivities && data.pdActivities.length > 0 ? `
📚 PD Activities Due: ${data.pdActivities.length}
${data.pdActivities.map((pd: any) => `- ${pd.title} - Due: ${pd.dueDate}`).join('\n')}
` : ''}

${data.complaints && data.complaints.length > 0 ? `
⚠️ Open Complaints: ${data.complaints.length}
${data.complaints.map((c: any) => `- ID: ${c.id} - ${c.status}`).join('\n')}
` : ''}

${!data.policyReviews?.length && !data.credentialsExpiring?.length && !data.pdActivities?.length && !data.complaints?.length ? '✅ No urgent items requiring your attention today!' : ''}

Go to Dashboard: ${data.dashboardUrl}

---
RTO Compliance Hub
Unsubscribe: ${data.unsubscribeUrl}
Support: ${data.supportEmail || 'support@rto-compliance-hub.com'}
    `,
  },
};

/**
 * Create email transporter based on provider configuration
 */
export function createEmailTransporter(): Transporter {
  if (EMAIL_PROVIDER === 'smtp') {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASSWORD ? {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      } : undefined,
    });
  }
  
  // For SendGrid
  if (EMAIL_PROVIDER === 'sendgrid') {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }
    
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: SENDGRID_API_KEY,
      },
    });
  }
  
  // For AWS SES
  if (EMAIL_PROVIDER === 'ses') {
    const AWS_SES_REGION = process.env.AWS_SES_REGION || 'us-east-1';
    // Note: For production, you would use nodemailer with aws-sdk
    // For now, return SMTP transporter as fallback
    console.warn('AWS SES provider requires additional configuration. Falling back to SMTP.');
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASSWORD ? {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      } : undefined,
    });
  }

  throw new Error(`Unsupported email provider: ${EMAIL_PROVIDER}`);
}

/**
 * Send an email using a template
 */
export async function sendEmail(
  to: string,
  templateName: string,
  data: any,
  notificationId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = data.unsubscribeUrl || `${process.env.APP_URL}/api/v1/email/unsubscribe?email=${encodeURIComponent(to)}`;
    const dataWithDefaults = { ...data, unsubscribeUrl };

    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS}>`,
      to,
      subject: template.subject,
      html: template.html(dataWithDefaults),
      text: template.text(dataWithDefaults),
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email send
    await prisma.emailLog.create({
      data: {
        notificationId,
        to,
        from: EMAIL_FROM_ADDRESS,
        subject: template.subject,
        templateName,
        status: 'sent',
        sentAt: new Date(),
        messageId: info.messageId,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Log failed email
    await prisma.emailLog.create({
      data: {
        notificationId,
        to,
        from: EMAIL_FROM_ADDRESS,
        subject: emailTemplates[templateName]?.subject || 'Unknown',
        templateName,
        status: 'failed',
        failureReason: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Retry failed email sends
 */
export async function retryFailedEmails(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: 'failed',
      retryCount: {
        lt: EMAIL_MAX_RETRIES,
      },
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    take: 50, // Limit to 50 at a time
  });

  let succeeded = 0;
  let failed = 0;

  for (const log of failedEmails) {
    try {
      // Wait for retry delay
      await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY_MS));
      
      const template = emailTemplates[log.templateName || ''];
      if (!template) {
        console.error(`Template not found for retry: ${log.templateName}`);
        failed++;
        continue;
      }

      const transporter = createEmailTransporter();
      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS}>`,
        to: log.to,
        subject: log.subject,
        html: template.html({}), // Note: original data not stored, using empty object
        text: template.text({}),
      };

      const info = await transporter.sendMail(mailOptions);

      // Update log
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          messageId: info.messageId,
          retryCount: log.retryCount + 1,
          lastRetryAt: new Date(),
        },
      });

      succeeded++;
    } catch (error: any) {
      console.error(`Error retrying email ${log.id}:`, error);
      
      // Update retry count
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          retryCount: log.retryCount + 1,
          lastRetryAt: new Date(),
          failureReason: error.message,
        },
      });

      failed++;
    }
  }

  return {
    retried: failedEmails.length,
    succeeded,
    failed,
  };
}

/**
 * Send digest email with multiple notifications
 */
export async function sendDigestEmail(
  userId: string,
  digestData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const data = {
      userName: user.name,
      digestDate: new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dashboardUrl: `${FRONTEND_URL}/dashboard`,
      unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${userId}`,
      ...digestData,
    };

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'email',
        title: 'Daily Compliance Digest',
        message: 'Your daily compliance summary',
        sentAt: new Date(),
      },
    });

    const result = await sendEmail(user.email, 'digest-summary', data, notification.id);
    
    return result;
  } catch (error: any) {
    console.error('Error sending digest email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark email as unsubscribed
 */
export async function unsubscribeEmail(email: string): Promise<void> {
  await prisma.emailLog.updateMany({
    where: { to: email },
    data: { unsubscribed: true },
  });
}
