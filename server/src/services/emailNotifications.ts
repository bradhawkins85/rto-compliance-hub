import { PrismaClient } from '@prisma/client';
import { sendEmail, sendDigestEmail } from './email';

const prisma = new PrismaClient();

/**
 * Send policy review reminders for policies due within the next 30 days
 */
export async function sendPolicyReviewReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Get policies due for review in the next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const policies = await prisma.policy.findMany({
    where: {
      reviewDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      status: 'Published',
    },
    include: {
      owner: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const policy of policies) {
    if (!policy.owner || !policy.reviewDate) continue;

    const daysRemaining = Math.ceil(
      (new Date(policy.reviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const data = {
      userName: policy.owner.name,
      policyTitle: policy.title,
      reviewDueDate: new Date(policy.reviewDate).toLocaleDateString('en-AU'),
      daysRemaining,
      policyUrl: `${FRONTEND_URL}/policies/${policy.id}`,
      unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${policy.owner.id}`,
    };

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: policy.owner.id,
        type: 'email',
        title: 'Policy Review Due Soon',
        message: `Policy "${policy.title}" is due for review on ${data.reviewDueDate}`,
        sentAt: new Date(),
      },
    });

    const result = await sendEmail(
      policy.owner.email,
      'policy-review-reminder',
      data,
      notification.id
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send credential expiry alerts for credentials expiring in the next 30 days
 */
export async function sendCredentialExpiryAlerts(): Promise<{
  sent: number;
  failed: number;
}> {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const credentials = await prisma.credential.findMany({
    where: {
      expiresAt: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      status: 'Active',
    },
    include: {
      user: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const credential of credentials) {
    const daysRemaining = Math.ceil(
      (new Date(credential.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const data = {
      userName: credential.user.name,
      credentialName: credential.name,
      credentialType: credential.type,
      expiryDate: new Date(credential.expiresAt!).toLocaleDateString('en-AU'),
      daysRemaining,
      credentialUrl: `${FRONTEND_URL}/credentials/${credential.id}`,
      unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${credential.user.id}`,
    };

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: credential.user.id,
        type: 'email',
        title: 'Credential Expiring Soon',
        message: `Your credential "${credential.name}" expires on ${data.expiryDate}`,
        sentAt: new Date(),
      },
    });

    const result = await sendEmail(
      credential.user.email,
      'credential-expiry-alert',
      data,
      notification.id
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send PD due reminders for activities due in the next 14 days
 */
export async function sendPDDueReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

  const pdItems = await prisma.pDItem.findMany({
    where: {
      dueAt: {
        lte: fourteenDaysFromNow,
        gte: new Date(),
      },
      status: {
        in: ['Planned', 'Due'],
      },
    },
    include: {
      user: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const pdItem of pdItems) {
    const daysRemaining = Math.ceil(
      (new Date(pdItem.dueAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const data = {
      userName: pdItem.user.name,
      pdTitle: pdItem.title,
      pdCategory: pdItem.category,
      pdHours: pdItem.hours,
      dueDate: new Date(pdItem.dueAt!).toLocaleDateString('en-AU'),
      daysRemaining,
      pdUrl: `${FRONTEND_URL}/pd/${pdItem.id}`,
      unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${pdItem.user.id}`,
    };

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: pdItem.user.id,
        type: 'email',
        title: 'Professional Development Due',
        message: `PD activity "${pdItem.title}" is due on ${data.dueDate}`,
        sentAt: new Date(),
      },
    });

    const result = await sendEmail(
      pdItem.user.email,
      'pd-due-reminder',
      data,
      notification.id
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send complaint notifications to assigned users
 */
export async function sendComplaintNotification(
  complaintId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!complaint || !user) {
    return { success: false, error: 'Complaint or user not found' };
  }

  // Calculate SLA deadline (2 business days from creation)
  const slaDeadline = new Date(complaint.createdAt);
  slaDeadline.setDate(slaDeadline.getDate() + 2);

  const data = {
    userName: user.name,
    complaintId: complaint.id,
    complaintSource: complaint.source,
    complaintStatus: complaint.status,
    receivedDate: new Date(complaint.createdAt).toLocaleDateString('en-AU'),
    slaDeadline: slaDeadline.toLocaleDateString('en-AU'),
    complaintUrl: `${FRONTEND_URL}/complaints/${complaint.id}`,
    unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${userId}`,
  };

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'email',
      title: 'New Complaint Received',
      message: `Complaint ${complaint.id} requires your attention`,
      sentAt: new Date(),
    },
  });

  return await sendEmail(user.email, 'complaint-notification', data, notification.id);
}

/**
 * Send welcome/onboarding email to new users
 */
export async function sendWelcomeEmail(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const roles = user.userRoles.map(ur => ur.role.name).join(', ');

  const data = {
    userName: user.name,
    userEmail: user.email,
    userDepartment: user.department,
    userRole: roles,
    dashboardUrl: `${FRONTEND_URL}/dashboard`,
    unsubscribeUrl: `${APP_URL}/api/v1/email/unsubscribe?userId=${userId}`,
  };

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'email',
      title: 'Welcome to RTO Compliance Hub',
      message: 'Welcome! Get started with your compliance journey',
      sentAt: new Date(),
    },
  });

  return await sendEmail(user.email, 'welcome-onboarding', data, notification.id);
}

/**
 * Send daily digest emails to all active users
 */
export async function sendDailyDigests(): Promise<{
  sent: number;
  failed: number;
}> {
  const users = await prisma.user.findMany({
    where: {
      status: 'Active',
    },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Gather data for digest
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Policy reviews
      const policyReviews = await prisma.policy.findMany({
        where: {
          ownerId: user.id,
          reviewDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
          status: 'Published',
        },
        select: {
          id: true,
          title: true,
          reviewDate: true,
        },
        take: 5,
      });

      // Credentials expiring
      const credentialsExpiring = await prisma.credential.findMany({
        where: {
          userId: user.id,
          expiresAt: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
          status: 'Active',
        },
        select: {
          id: true,
          name: true,
          expiresAt: true,
        },
        take: 5,
      });

      // PD activities
      const pdActivities = await prisma.pDItem.findMany({
        where: {
          userId: user.id,
          dueAt: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
          status: {
            in: ['Planned', 'Due'],
          },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
        },
        take: 5,
      });

      // Open complaints (if user is admin or manager)
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });

      const isAdminOrManager = userRoles.some(
        ur => ur.role.name === 'SystemAdmin' || ur.role.name === 'ComplianceAdmin'
      );

      let complaints: any[] = [];
      if (isAdminOrManager) {
        complaints = await prisma.complaint.findMany({
          where: {
            status: {
              in: ['New', 'InReview'],
            },
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          take: 5,
        });
      }

      // Only send digest if there's something to report
      if (
        policyReviews.length > 0 ||
        credentialsExpiring.length > 0 ||
        pdActivities.length > 0 ||
        complaints.length > 0
      ) {
        const digestData = {
          policyReviews: policyReviews.map(p => ({
            title: p.title,
            dueDate: p.reviewDate ? new Date(p.reviewDate).toLocaleDateString('en-AU') : 'N/A',
          })),
          credentialsExpiring: credentialsExpiring.map(c => ({
            name: c.name,
            expiryDate: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-AU') : 'N/A',
          })),
          pdActivities: pdActivities.map(pd => ({
            title: pd.title,
            dueDate: pd.dueAt ? new Date(pd.dueAt).toLocaleDateString('en-AU') : 'N/A',
          })),
          complaints: complaints.map(c => ({
            id: c.id,
            status: c.status,
          })),
        };

        const result = await sendDigestEmail(user.id, digestData);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      console.error(`Error sending digest to user ${user.id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
