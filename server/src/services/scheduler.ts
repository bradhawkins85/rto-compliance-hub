import { addJob, JobType, JobPriority, closeJobQueue } from './jobQueue';
import { closeJobWorker } from './jobWorker';
import { closeRedis } from './redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Initialize all scheduled jobs using BullMQ
 */
export async function initializeScheduler(): Promise<void> {
  console.log('🔧 Initializing job scheduler with BullMQ...');
  
  try {
    // Schedule daily Xero sync at 2:00 AM (Australia/Sydney timezone)
    await addJob(JobType.SYNC_XERO, {}, {
      priority: JobPriority.HIGH,
      repeat: {
        pattern: '0 2 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Daily Xero sync at 2:00 AM');
    
    // Update database record
    await upsertJobRecord(JobType.SYNC_XERO, '0 2 * * *');

    // Schedule daily Accelerate sync at 3:00 AM
    await addJob(JobType.SYNC_ACCELERATE, {}, {
      priority: JobPriority.HIGH,
      repeat: {
        pattern: '0 3 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Daily Accelerate sync at 3:00 AM');
    
    await upsertJobRecord(JobType.SYNC_ACCELERATE, '0 3 * * *');

    // Schedule feedback AI analysis at 1:00 AM (before syncs)
    await addJob(JobType.FEEDBACK_AI_ANALYSIS, {}, {
      priority: JobPriority.NORMAL,
      repeat: {
        pattern: '0 1 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Feedback AI analysis at 1:00 AM');
    
    await upsertJobRecord(JobType.FEEDBACK_AI_ANALYSIS, '0 1 * * *');

    // Schedule PD reminders at 8:00 AM
    await addJob(JobType.PD_REMINDERS, {}, {
      priority: JobPriority.NORMAL,
      repeat: {
        pattern: '0 8 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: PD reminders at 8:00 AM');
    
    await upsertJobRecord(JobType.PD_REMINDERS, '0 8 * * *');

    // Schedule credential expiry check at 8:00 AM
    await addJob(JobType.CREDENTIAL_EXPIRY, {}, {
      priority: JobPriority.HIGH,
      repeat: {
        pattern: '0 8 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Credential expiry check at 8:00 AM');
    
    await upsertJobRecord(JobType.CREDENTIAL_EXPIRY, '0 8 * * *');

    // Schedule policy review reminders at 8:00 AM
    await addJob(JobType.POLICY_REVIEWS, {}, {
      priority: JobPriority.NORMAL,
      repeat: {
        pattern: '0 8 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Policy review reminders at 8:00 AM');
    
    await upsertJobRecord(JobType.POLICY_REVIEWS, '0 8 * * *');

    // Schedule complaint SLA check at 9:00 AM
    await addJob(JobType.COMPLAINT_SLA, {}, {
      priority: JobPriority.HIGH,
      repeat: {
        pattern: '0 9 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Complaint SLA check at 9:00 AM');
    
    await upsertJobRecord(JobType.COMPLAINT_SLA, '0 9 * * *');

    // Schedule weekly digest emails (Monday 8:00 AM)
    await addJob(JobType.WEEKLY_DIGEST, {}, {
      priority: JobPriority.NORMAL,
      repeat: {
        pattern: '0 8 * * 1',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Weekly digest emails on Monday at 8:00 AM');
    
    await upsertJobRecord(JobType.WEEKLY_DIGEST, '0 8 * * 1');

    // Schedule monthly compliance reports (1st of month at 9:00 AM)
    await addJob(JobType.MONTHLY_COMPLIANCE_REPORT, {}, {
      priority: JobPriority.NORMAL,
      repeat: {
        pattern: '0 9 1 * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Monthly compliance report on 1st at 9:00 AM');
    
    await upsertJobRecord(JobType.MONTHLY_COMPLIANCE_REPORT, '0 9 1 * *');

    // Schedule retry failed emails every 2 hours
    await addJob(JobType.RETRY_FAILED_EMAILS, {}, {
      priority: JobPriority.LOW,
      repeat: {
        pattern: '0 */2 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Retry failed emails every 2 hours');
    
    await upsertJobRecord(JobType.RETRY_FAILED_EMAILS, '0 */2 * * *');

    // Schedule incomplete onboarding check at 9:30 AM
    await addJob(JobType.CHECK_INCOMPLETE_ONBOARDING, {}, {
      priority: JobPriority.LOW,
      repeat: {
        pattern: '30 9 * * *',
        tz: 'Australia/Sydney',
      },
    });
    console.log('✅ Scheduled: Incomplete onboarding check at 9:30 AM');
    
    await upsertJobRecord(JobType.CHECK_INCOMPLETE_ONBOARDING, '30 9 * * *');

    console.log('✅ Job scheduler initialized successfully');
    console.log('📊 All jobs registered with BullMQ queue');
  } catch (error) {
    console.error('❌ Error initializing scheduler:', error);
    throw error;
  }
}

/**
 * Helper to create or update job record in database
 */
async function upsertJobRecord(jobName: string, schedule: string): Promise<void> {
  try {
    const existingJob = await prisma.job.findFirst({
      where: { name: jobName },
    });

    if (existingJob) {
      await prisma.job.update({
        where: { id: existingJob.id },
        data: {
          schedule,
          status: 'Scheduled',
          nextRunAt: calculateNextRun(schedule),
        },
      });
    } else {
      await prisma.job.create({
        data: {
          name: jobName,
          schedule,
          status: 'Scheduled',
          nextRunAt: calculateNextRun(schedule),
        },
      });
    }
  } catch (error) {
    console.error(`Error upserting job record for ${jobName}:`, error);
  }
}

/**
 * Calculate next run time from cron pattern (simplified)
 */
function calculateNextRun(cronPattern: string): Date {
  const parts = cronPattern.split(' ');
  const minute = parseInt(parts[0], 10);
  const hour = parseInt(parts[1], 10);
  
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (next <= new Date()) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Stop all scheduled jobs and close connections
 */
export async function stopAllScheduledJobs(): Promise<void> {
  console.log('🛑 Stopping all scheduled jobs...');
  
  try {
    await closeJobWorker();
    await closeJobQueue();
    await closeRedis();
    console.log('✅ All jobs stopped and connections closed');
  } catch (error) {
    console.error('❌ Error stopping jobs:', error);
  }
}
