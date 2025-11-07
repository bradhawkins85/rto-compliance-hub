import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const APP_NAME = process.env.EMAIL_FROM_NAME || 'RTO Compliance Hub';

/**
 * Base template structure
 */
interface BaseTemplateParams {
  recipientName: string;
  unsubscribeToken?: string;
}

/**
 * Generate base HTML template with header and footer
 */
function getBaseHtmlTemplate(content: string, params: BaseTemplateParams): string {
  const unsubscribeLink = params.unsubscribeToken
    ? `${APP_URL}/unsubscribe?token=${params.unsubscribeToken}`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${APP_NAME}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #1e40af;
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 0;
      background-color: #1e40af;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
    }
    .button:hover {
      background-color: #1e3a8a;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #1e40af;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 20px 15px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>
        <strong>${APP_NAME}</strong><br>
        Compliance Management and Governance Platform for RTOs<br>
        <a href="${APP_URL}">Visit Dashboard</a> | 
        <a href="${APP_URL}/support">Contact Support</a>
      </p>
      ${unsubscribeLink ? `<p><a href="${unsubscribeLink}">Unsubscribe from these emails</a></p>` : ''}
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate base plain text template
 */
function getBaseTextTemplate(content: string, params: BaseTemplateParams): string {
  const unsubscribeLink = params.unsubscribeToken
    ? `\n\nUnsubscribe: ${APP_URL}/unsubscribe?token=${params.unsubscribeToken}`
    : '';

  return `
${APP_NAME}
${'='.repeat(APP_NAME.length)}

${content}

---
${APP_NAME}
Compliance Management and Governance Platform for RTOs
Visit Dashboard: ${APP_URL}
Contact Support: ${APP_URL}/support
${unsubscribeLink}

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

/**
 * Policy Review Reminder Template
 */
export interface PolicyReminderParams extends BaseTemplateParams {
  policyTitle: string;
  policyId: string;
  reviewDate: string;
  daysRemaining: number;
}

export function generatePolicyReminderEmail(params: PolicyReminderParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Policy Review Reminder: ${params.policyTitle}`;
  
  const htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>This is a friendly reminder that the following policy is due for review:</p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <strong>Policy:</strong> ${params.policyTitle}<br>
      <strong>Review Date:</strong> ${params.reviewDate}<br>
      <strong>Days Remaining:</strong> ${params.daysRemaining}
    </div>
    <p>Please review and update this policy to ensure continued compliance.</p>
    <a href="${APP_URL}/policies/${params.policyId}" class="button">Review Policy</a>
    <p>If you have any questions or need assistance, please contact the compliance team.</p>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  const textContent = `
Hi ${params.recipientName},

This is a friendly reminder that the following policy is due for review:

Policy: ${params.policyTitle}
Review Date: ${params.reviewDate}
Days Remaining: ${params.daysRemaining}

Please review and update this policy to ensure continued compliance.

Review Policy: ${APP_URL}/policies/${params.policyId}

If you have any questions or need assistance, please contact the compliance team.

Best regards,
${APP_NAME} Team
  `.trim();

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * Credential Expiry Alert Template
 */
export interface CredentialExpiryParams extends BaseTemplateParams {
  credentialName: string;
  credentialId: string;
  expiryDate: string;
  daysRemaining: number;
}

export function generateCredentialExpiryEmail(params: CredentialExpiryParams): {
  subject: string;
  html: string;
  text: string;
} {
  const urgency = params.daysRemaining <= 7 ? 'URGENT: ' : '';
  const subject = `${urgency}Credential Expiry Alert: ${params.credentialName}`;
  
  const htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>Your credential is ${params.daysRemaining <= 0 ? 'expired' : 'expiring soon'}:</p>
    <div style="background-color: ${params.daysRemaining <= 7 ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${params.daysRemaining <= 7 ? '#dc2626' : '#f59e0b'}; padding: 15px; margin: 20px 0;">
      <strong>Credential:</strong> ${params.credentialName}<br>
      <strong>Expiry Date:</strong> ${params.expiryDate}<br>
      <strong>Status:</strong> ${params.daysRemaining <= 0 ? 'EXPIRED' : `${params.daysRemaining} days remaining`}
    </div>
    <p>${params.daysRemaining <= 0 ? 'Please renew this credential immediately to maintain compliance.' : 'Please take action to renew this credential before it expires.'}</p>
    <a href="${APP_URL}/credentials" class="button">View Credentials</a>
    <p>If you have already renewed this credential, please upload the updated documentation.</p>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  const textContent = `
Hi ${params.recipientName},

Your credential is ${params.daysRemaining <= 0 ? 'expired' : 'expiring soon'}:

Credential: ${params.credentialName}
Expiry Date: ${params.expiryDate}
Status: ${params.daysRemaining <= 0 ? 'EXPIRED' : `${params.daysRemaining} days remaining`}

${params.daysRemaining <= 0 ? 'Please renew this credential immediately to maintain compliance.' : 'Please take action to renew this credential before it expires.'}

View Credentials: ${APP_URL}/credentials

If you have already renewed this credential, please upload the updated documentation.

Best regards,
${APP_NAME} Team
  `.trim();

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * PD Due Reminder Template
 */
export interface PDReminderParams extends BaseTemplateParams {
  pdTitle: string;
  pdId: string;
  dueDate: string;
  daysRemaining: number;
  hours?: number;
}

export function generatePDReminderEmail(params: PDReminderParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Professional Development Reminder: ${params.pdTitle}`;
  
  const htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>This is a reminder about your upcoming professional development activity:</p>
    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <strong>Activity:</strong> ${params.pdTitle}<br>
      <strong>Due Date:</strong> ${params.dueDate}<br>
      <strong>Days Remaining:</strong> ${params.daysRemaining}${params.hours ? `<br><strong>Hours:</strong> ${params.hours}` : ''}
    </div>
    <p>Please complete this activity by the due date to maintain your professional development requirements.</p>
    <a href="${APP_URL}/pd/${params.pdId}" class="button">View PD Activity</a>
    <p>Once completed, remember to upload your evidence and mark the activity as complete.</p>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  const textContent = `
Hi ${params.recipientName},

This is a reminder about your upcoming professional development activity:

Activity: ${params.pdTitle}
Due Date: ${params.dueDate}
Days Remaining: ${params.daysRemaining}${params.hours ? `\nHours: ${params.hours}` : ''}

Please complete this activity by the due date to maintain your professional development requirements.

View PD Activity: ${APP_URL}/pd/${params.pdId}

Once completed, remember to upload your evidence and mark the activity as complete.

Best regards,
${APP_NAME} Team
  `.trim();

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * Complaint Notification Template
 */
export interface ComplaintNotificationParams extends BaseTemplateParams {
  complaintId: string;
  complaintType: string;
  description: string;
  createdAt: string;
  status: string;
}

export function generateComplaintNotificationEmail(params: ComplaintNotificationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `New Complaint Notification: ${params.complaintType}`;
  
  const htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>A new complaint has been submitted and requires your attention:</p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <strong>Type:</strong> ${params.complaintType}<br>
      <strong>Status:</strong> ${params.status}<br>
      <strong>Submitted:</strong> ${params.createdAt}<br>
      <strong>Description:</strong> ${params.description}
    </div>
    <p>Please review and take appropriate action as per your complaint handling procedures.</p>
    <a href="${APP_URL}/complaints/${params.complaintId}" class="button">View Complaint</a>
    <p>Remember to update the complaint status and document all actions taken.</p>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  const textContent = `
Hi ${params.recipientName},

A new complaint has been submitted and requires your attention:

Type: ${params.complaintType}
Status: ${params.status}
Submitted: ${params.createdAt}
Description: ${params.description}

Please review and take appropriate action as per your complaint handling procedures.

View Complaint: ${APP_URL}/complaints/${params.complaintId}

Remember to update the complaint status and document all actions taken.

Best regards,
${APP_NAME} Team
  `.trim();

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * Welcome/Onboarding Email Template
 */
export interface WelcomeEmailParams extends BaseTemplateParams {
  userId: string;
  temporaryPassword?: string;
  department: string;
}

export function generateWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to ${APP_NAME}`;
  
  const htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>Welcome to ${APP_NAME}! Your account has been created and you're all set to get started.</p>
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
      <strong>Department:</strong> ${params.department}<br>
      ${params.temporaryPassword ? `<strong>Temporary Password:</strong> ${params.temporaryPassword}<br>` : ''}
      <strong>Dashboard:</strong> ${APP_URL}/dashboard
    </div>
    ${params.temporaryPassword ? `<p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>` : ''}
    <p>Here are some things you can do to get started:</p>
    <ul>
      <li>Complete your profile information</li>
      <li>Review your assigned policies and procedures</li>
      <li>Check your professional development requirements</li>
      <li>Familiarize yourself with the compliance dashboard</li>
    </ul>
    <a href="${APP_URL}/dashboard" class="button">Access Dashboard</a>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  const textContent = `
Hi ${params.recipientName},

Welcome to ${APP_NAME}! Your account has been created and you're all set to get started.

Department: ${params.department}
${params.temporaryPassword ? `Temporary Password: ${params.temporaryPassword}\n` : ''}Dashboard: ${APP_URL}/dashboard

${params.temporaryPassword ? 'Important: Please change your password after your first login for security purposes.\n\n' : ''}Here are some things you can do to get started:

- Complete your profile information
- Review your assigned policies and procedures
- Check your professional development requirements
- Familiarize yourself with the compliance dashboard

Access Dashboard: ${APP_URL}/dashboard

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
${APP_NAME} Team
  `.trim();

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * Digest Email Template
 */
export interface DigestEmailParams extends BaseTemplateParams {
  policies: Array<{ title: string; id: string; daysRemaining: number }>;
  credentials: Array<{ name: string; id: string; daysRemaining: number }>;
  pdItems: Array<{ title: string; id: string; daysRemaining: number }>;
  complaints: Array<{ id: string; type: string; status: string }>;
}

export function generateDigestEmail(params: DigestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const totalItems =
    params.policies.length +
    params.credentials.length +
    params.pdItems.length +
    params.complaints.length;

  const subject = `Your ${APP_NAME} Digest: ${totalItems} item${totalItems !== 1 ? 's' : ''} need${totalItems === 1 ? 's' : ''} attention`;
  
  let htmlContent = `
    <p>Hi ${params.recipientName},</p>
    <p>Here's your summary of items requiring attention:</p>
  `;

  let textContent = `
Hi ${params.recipientName},

Here's your summary of items requiring attention:
  `.trim();

  // Add policies section
  if (params.policies.length > 0) {
    htmlContent += `
      <h2 style="color: #1e40af; margin-top: 20px;">Policy Reviews (${params.policies.length})</h2>
      <ul>
        ${params.policies.map(p => `<li><a href="${APP_URL}/policies/${p.id}">${p.title}</a> - ${p.daysRemaining} days remaining</li>`).join('')}
      </ul>
    `;
    textContent += `\n\nPolicy Reviews (${params.policies.length})\n${params.policies.map(p => `- ${p.title} - ${p.daysRemaining} days remaining\n  ${APP_URL}/policies/${p.id}`).join('\n')}`;
  }

  // Add credentials section
  if (params.credentials.length > 0) {
    htmlContent += `
      <h2 style="color: #1e40af; margin-top: 20px;">Credential Expiries (${params.credentials.length})</h2>
      <ul>
        ${params.credentials.map(c => `<li>${c.name} - ${c.daysRemaining <= 0 ? 'EXPIRED' : `${c.daysRemaining} days remaining`}</li>`).join('')}
      </ul>
    `;
    textContent += `\n\nCredential Expiries (${params.credentials.length})\n${params.credentials.map(c => `- ${c.name} - ${c.daysRemaining <= 0 ? 'EXPIRED' : `${c.daysRemaining} days remaining`}`).join('\n')}`;
  }

  // Add PD items section
  if (params.pdItems.length > 0) {
    htmlContent += `
      <h2 style="color: #1e40af; margin-top: 20px;">Professional Development (${params.pdItems.length})</h2>
      <ul>
        ${params.pdItems.map(pd => `<li><a href="${APP_URL}/pd/${pd.id}">${pd.title}</a> - ${pd.daysRemaining} days remaining</li>`).join('')}
      </ul>
    `;
    textContent += `\n\nProfessional Development (${params.pdItems.length})\n${params.pdItems.map(pd => `- ${pd.title} - ${pd.daysRemaining} days remaining\n  ${APP_URL}/pd/${pd.id}`).join('\n')}`;
  }

  // Add complaints section
  if (params.complaints.length > 0) {
    htmlContent += `
      <h2 style="color: #1e40af; margin-top: 20px;">Complaints (${params.complaints.length})</h2>
      <ul>
        ${params.complaints.map(c => `<li><a href="${APP_URL}/complaints/${c.id}">${c.type}</a> - ${c.status}</li>`).join('')}
      </ul>
    `;
    textContent += `\n\nComplaints (${params.complaints.length})\n${params.complaints.map(c => `- ${c.type} - ${c.status}\n  ${APP_URL}/complaints/${c.id}`).join('\n')}`;
  }

  htmlContent += `
    <a href="${APP_URL}/dashboard" class="button">View Dashboard</a>
    <p>Best regards,<br>${APP_NAME} Team</p>
  `;

  textContent += `\n\nView Dashboard: ${APP_URL}/dashboard\n\nBest regards,\n${APP_NAME} Team`;

  return {
    subject,
    html: getBaseHtmlTemplate(htmlContent, params),
    text: getBaseTextTemplate(textContent, params),
  };
}

/**
 * Get or create email template in database
 */
export async function ensureTemplateExists(
  name: string,
  subject: string,
  htmlBody: string,
  textBody: string,
  description: string,
  variables: string[]
): Promise<void> {
  const existing = await prisma.emailTemplate.findUnique({
    where: { name },
  });

  if (!existing) {
    await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlBody,
        textBody,
        description,
        variables,
        isActive: true,
      },
    });
  }
}

/**
 * Initialize all email templates in the database
 */
export async function initializeEmailTemplates(): Promise<void> {
  await ensureTemplateExists(
    'policy_review_reminder',
    'Policy Review Reminder: {{policyTitle}}',
    'Policy review reminder HTML template',
    'Policy review reminder text template',
    'Sent to policy owners when a policy is due for review',
    ['recipientName', 'policyTitle', 'policyId', 'reviewDate', 'daysRemaining', 'unsubscribeToken']
  );

  await ensureTemplateExists(
    'credential_expiry_alert',
    'Credential Expiry Alert: {{credentialName}}',
    'Credential expiry alert HTML template',
    'Credential expiry alert text template',
    'Sent to users when their credentials are expiring or expired',
    ['recipientName', 'credentialName', 'credentialId', 'expiryDate', 'daysRemaining', 'unsubscribeToken']
  );

  await ensureTemplateExists(
    'pd_due_reminder',
    'Professional Development Reminder: {{pdTitle}}',
    'PD due reminder HTML template',
    'PD due reminder text template',
    'Sent to users when their PD activities are due',
    ['recipientName', 'pdTitle', 'pdId', 'dueDate', 'daysRemaining', 'hours', 'unsubscribeToken']
  );

  await ensureTemplateExists(
    'complaint_notification',
    'New Complaint Notification: {{complaintType}}',
    'Complaint notification HTML template',
    'Complaint notification text template',
    'Sent to relevant staff when a new complaint is submitted',
    ['recipientName', 'complaintId', 'complaintType', 'description', 'createdAt', 'status', 'unsubscribeToken']
  );

  await ensureTemplateExists(
    'welcome_onboarding',
    'Welcome to {{appName}}',
    'Welcome/onboarding HTML template',
    'Welcome/onboarding text template',
    'Sent to new users when their account is created',
    ['recipientName', 'userId', 'temporaryPassword', 'department', 'unsubscribeToken']
  );

  await ensureTemplateExists(
    'digest_email',
    'Your {{appName}} Digest',
    'Digest email HTML template',
    'Digest email text template',
    'Daily or weekly digest of items requiring attention',
    ['recipientName', 'policies', 'credentials', 'pdItems', 'complaints', 'unsubscribeToken']
  );

  console.log('Email templates initialized successfully');
}
