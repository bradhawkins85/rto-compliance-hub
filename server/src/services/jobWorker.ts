import { Worker, Job } from 'bullmq';
import { redis } from './redis';
import { JobType } from './jobQueue';
import { syncEmployees } from './xeroSync';
import { syncAll } from './accelerateSync';
import { processAllPendingFeedback } from './aiAnalysis';
import {
  sendPolicyReviewReminders,
  sendCredentialExpiryAlerts,
  sendPDDueReminders,
  sendDailyDigests,
  sendWeeklyDigests,
} from './emailNotifications';
import { retryFailedEmails } from './email';
import { checkIncompleteOnboarding } from './onboarding';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Job processor map
const jobProcessors: Record<JobType, (job: Job) => Promise<any>> = {
  [JobType.SYNC_XERO]: async (job: Job) => {
    console.log('🔄 Processing Xero sync job...');
    const result = await syncEmployees(undefined, 'scheduled');
    
    if (!result.success) {
      throw new Error(`Xero sync failed: ${result.errors.map((e: any) => e.error).join(', ')}`);
    }
    
    return {
      created: result.employeesCreated,
      updated: result.employeesUpdated,
      failed: result.employeesFailed,
    };
  },

  [JobType.SYNC_ACCELERATE]: async (job: Job) => {
    console.log('🔄 Processing Accelerate sync job...');
    const results = await syncAll('scheduled');
    
    const allSucceeded = results.every((r) => r.status === 'Completed');
    if (!allSucceeded) {
      const failedSyncs = results.filter((r) => r.status === 'Failed');
      throw new Error(`Accelerate sync failed: ${failedSyncs.map((r) => r.syncType).join(', ')}`);
    }
    
    return {
      totalSynced: results.reduce((sum, r) => sum + r.recordsSynced, 0),
      totalFailed: results.reduce((sum, r) => sum + r.recordsFailed, 0),
    };
  },

  [JobType.FEEDBACK_AI_ANALYSIS]: async (job: Job) => {
    console.log('🤖 Processing feedback AI analysis job...');
    const result = await processAllPendingFeedback();
    
    if (result.failed > 0) {
      console.warn(`⚠️  ${result.failed} feedback items failed to process`);
    }
    
    return {
      processed: result.processed,
      failed: result.failed,
    };
  },

  [JobType.PD_REMINDERS]: async (job: Job) => {
    console.log('📧 Processing PD reminders job...');
    const result = await sendPDDueReminders();
    
    if (result.failed > 0) {
      throw new Error(`PD reminders partially failed: ${result.failed} out of ${result.sent + result.failed}`);
    }
    
    return {
      sent: result.sent,
      failed: result.failed,
    };
  },

  [JobType.CREDENTIAL_EXPIRY]: async (job: Job) => {
    console.log('📧 Processing credential expiry alerts job...');
    const result = await sendCredentialExpiryAlerts();
    
    if (result.failed > 0) {
      throw new Error(`Credential alerts partially failed: ${result.failed} out of ${result.sent + result.failed}`);
    }
    
    return {
      sent: result.sent,
      failed: result.failed,
    };
  },

  [JobType.POLICY_REVIEWS]: async (job: Job) => {
    console.log('📧 Processing policy review reminders job...');
    const result = await sendPolicyReviewReminders();
    
    if (result.failed > 0) {
      throw new Error(`Policy reminders partially failed: ${result.failed} out of ${result.sent + result.failed}`);
    }
    
    return {
      sent: result.sent,
      failed: result.failed,
    };
  },

  [JobType.COMPLAINT_SLA]: async (job: Job) => {
    console.log('⚖️ Processing complaint SLA check job...');
    
    // Find complaints that are breaching SLA (2 business days in 'New' status)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const breachingComplaints = await prisma.complaint.findMany({
      where: {
        status: 'New',
        createdAt: {
          lt: twoDaysAgo,
        },
      },
      include: {
        student: true,
        trainer: true,
      },
    });
    
    // Notify admins about SLA breaches
    if (breachingComplaints.length > 0) {
      const admins = await prisma.user.findMany({
        where: {
          status: 'Active',
          userRoles: {
            some: {
              role: {
                name: 'SystemAdmin',
              },
            },
          },
        },
      });
      
      const notifications = admins.flatMap((admin) =>
        breachingComplaints.map((complaint) => ({
          userId: admin.id,
          type: 'in-app',
          title: 'Complaint SLA Breach',
          message: `Complaint #${complaint.id.slice(0, 8)} from ${complaint.source} has been in "New" status for more than 2 business days.`,
          read: false,
        }))
      );
      
      await prisma.notification.createMany({
        data: notifications,
      });
    }
    
    return {
      breachingComplaints: breachingComplaints.length,
    };
  },

  [JobType.WEEKLY_DIGEST]: async (job: Job) => {
    console.log('📧 Processing weekly digest job...');
    const result = await sendWeeklyDigests();
    
    if (result.failed > 0) {
      throw new Error(`Weekly digests partially failed: ${result.failed} out of ${result.sent + result.failed}`);
    }
    
    return {
      sent: result.sent,
      failed: result.failed,
    };
  },

  [JobType.MONTHLY_COMPLIANCE_REPORT]: async (job: Job) => {
    console.log('📊 Processing monthly compliance report job...');
    
    // Generate monthly compliance report
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Get compliance metrics
    const [
      totalPolicies,
      policiesNeedingReview,
      totalStandards,
      mappedStandards,
      expiredCredentials,
      pdOverdue,
      openComplaints,
    ] = await Promise.all([
      prisma.policy.count(),
      prisma.policy.count({
        where: {
          reviewDate: {
            lte: new Date(),
          },
        },
      }),
      prisma.standard.count(),
      prisma.policyMapping.groupBy({
        by: ['standardId'],
      }).then((r) => r.length),
      prisma.credential.count({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      }),
      prisma.pDItem.count({
        where: {
          status: 'Overdue',
        },
      }),
      prisma.complaint.count({
        where: {
          status: {
            in: ['New', 'InReview'],
          },
        },
      }),
    ]);
    
    const report = {
      period: `${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`,
      policies: {
        total: totalPolicies,
        needingReview: policiesNeedingReview,
      },
      standards: {
        total: totalStandards,
        mapped: mappedStandards,
        coverage: ((mappedStandards / totalStandards) * 100).toFixed(1) + '%',
      },
      staff: {
        expiredCredentials,
        pdOverdue,
      },
      complaints: {
        open: openComplaints,
      },
    };
    
    // Send report to admins
    const admins = await prisma.user.findMany({
      where: {
        status: 'Active',
        userRoles: {
          some: {
            role: {
              name: 'SystemAdmin',
            },
          },
        },
      },
    });
    
    // Store report (could send email or create document)
    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Monthly Compliance Report',
      message: `Monthly compliance report generated: ${report.standards.coverage} standards coverage, ${report.policies.needingReview} policies need review, ${report.complaints.open} open complaints.`,
      read: false,
    }));
    
    await prisma.notification.createMany({
      data: notifications,
    });
    
    return report;
  },

  [JobType.RETRY_FAILED_EMAILS]: async (job: Job) => {
    console.log('🔄 Processing retry failed emails job...');
    const result = await retryFailedEmails();
    
    return {
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
    };
  },

  [JobType.CHECK_INCOMPLETE_ONBOARDING]: async (job: Job) => {
    console.log('📋 Processing incomplete onboarding check job...');
    await checkIncompleteOnboarding();
    
    return {
      checked: true,
    };
  },
};

// Create worker
export const jobWorker = new Worker(
  'rto-jobs',
  async (job: Job) => {
    console.log(`🎯 Processing job ${job.id}: ${job.name}`);
    
    const processor = jobProcessors[job.name as JobType];
    if (!processor) {
      throw new Error(`No processor found for job type: ${job.name}`);
    }
    
    const result = await processor(job);
    console.log(`✅ Job ${job.id} completed:`, result);
    
    return result;
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    lockDuration: 30000, // Lock job for 30 seconds
    maxStalledCount: 2, // Retry stalled jobs twice
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  }
);

// Worker event handlers
jobWorker.on('completed', (job: Job, result: any) => {
  console.log(`✅ Worker completed job ${job.id}:`, result);
});

jobWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`❌ Worker failed job ${job?.id}:`, error.message);
});

jobWorker.on('error', (error: Error) => {
  console.error('❌ Worker error:', error);
});

jobWorker.on('stalled', (jobId: string) => {
  console.warn(`⚠️  Worker detected stalled job ${jobId}`);
});

// Graceful shutdown
export async function closeJobWorker(): Promise<void> {
  await jobWorker.close();
  console.log('🛑 Job worker closed gracefully');
}

export default jobWorker;
