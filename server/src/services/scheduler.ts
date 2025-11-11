import cron from 'node-cron';
import { syncEmployees } from '../services/xeroSync';
import { PrismaClient } from '@prisma/client';
import { syncAll } from './accelerateSync';
import { accelerateClient } from './accelerate';
import { processAllPendingFeedback } from './aiAnalysis';

const prisma = new PrismaClient();

// Store interval IDs for cleanup
const scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

/**
 * Schedule daily sync at 2:00 AM
 * Cron format: '0 2 * * *' = At 02:00 every day
 */
export function scheduleDailySync(): void {
  // Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled Xero employee sync at 2:00 AM...');
    
    try {
      const result = await syncEmployees(undefined, 'scheduled');
      
      if (result.success) {
        console.log(`✅ Scheduled sync completed successfully:
          - Created: ${result.employeesCreated}
          - Updated: ${result.employeesUpdated}
          - Failed: ${result.employeesFailed}`);
        
        // If there were failures, send notification to admins
        if (result.employeesFailed > 0) {
          await notifyAdminsOfSyncIssues(result);
        }
      } else {
        console.error('❌ Scheduled sync failed:', result.errors);
        await notifyAdminsOfSyncFailure(result);
      }
    } catch (error) {
      console.error('Error during scheduled sync:', error);
      await notifyAdminsOfSyncError(error);
    }
  }, {
    timezone: 'Australia/Sydney', // Adjust timezone as needed
  });

  console.log('📅 Xero daily sync scheduled for 2:00 AM (Australia/Sydney timezone)');
}

/**
 * Notify admins of sync issues (partial failures)
 */
async function notifyAdminsOfSyncIssues(result: any): Promise<void> {
  try {
    // Get all SystemAdmin users
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

    // Create notifications for each admin
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Completed with Issues',
      message: `The scheduled Xero employee sync completed with ${result.employeesFailed} failures. Created: ${result.employeesCreated}, Updated: ${result.employeesUpdated}. Please check the sync logs for details.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync issues`);
  } catch (error) {
    console.error('Error notifying admins of sync issues:', error);
  }
}

/**
 * Notify admins of complete sync failure
 */
async function notifyAdminsOfSyncFailure(result: any): Promise<void> {
  try {
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

    const errorMessages = result.errors.map((e: any) => e.error).join(', ');
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Failed',
      message: `The scheduled Xero employee sync failed completely. Errors: ${errorMessages}. Please check the Xero connection and try again.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync failure`);
  } catch (error) {
    console.error('Error notifying admins of sync failure:', error);
  }
}

/**
 * Notify admins of sync error (exception)
 */
async function notifyAdminsOfSyncError(error: any): Promise<void> {
  try {
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Error',
      message: `An error occurred during the scheduled Xero employee sync: ${errorMessage}. Please check the system logs and Xero connection.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync error`);
  } catch (notifyError) {
    console.error('Error notifying admins of sync error:', notifyError);
  }
}

/**
 * Schedule Accelerate sync to run daily at 3:00 AM
 */
export function scheduleAccelerateSync(): void {
  // Clear existing job if any
  if (scheduledJobs.has('accelerateSync')) {
    clearInterval(scheduledJobs.get('accelerateSync')!);
    scheduledJobs.delete('accelerateSync');
  }

  // Calculate time until next 3:00 AM
  const now = new Date();
  const next3AM = new Date();
  next3AM.setHours(3, 0, 0, 0);
  
  // If 3:00 AM has passed today, schedule for tomorrow
  if (now >= next3AM) {
    next3AM.setDate(next3AM.getDate() + 1);
  }

  const msUntil3AM = next3AM.getTime() - now.getTime();

  console.log(`📅 Scheduled Accelerate sync for ${next3AM.toISOString()}`);

  // Schedule first run
  setTimeout(async () => {
    await runAccelerateSync();
    
    // Then schedule to run every 24 hours
    const intervalId = setInterval(async () => {
      await runAccelerateSync();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    scheduledJobs.set('accelerateSync', intervalId);
  }, msUntil3AM);
}

/**
 * Run Accelerate sync job
 */
async function runAccelerateSync(): Promise<void> {
  console.log('🔄 Starting scheduled Accelerate sync...');
  
  try {
    // Check if API is configured
    if (!accelerateClient.isReady()) {
      console.log('⚠️  Accelerate API not configured, skipping sync');
      return;
    }

    // Update or create job record
    const jobName = 'syncAccelerate';
    let job = await prisma.job.findFirst({
      where: { name: jobName },
    });

    if (!job) {
      job = await prisma.job.create({
        data: {
          name: jobName,
          status: 'Running',
          schedule: '0 3 * * *', // Cron: 3:00 AM daily
          lastRunAt: new Date(),
        },
      });
    } else {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'Running',
          lastRunAt: new Date(),
        },
      });
    }

    // Run sync
    const results = await syncAll('scheduled');
    
    // Check if all syncs succeeded
    const allSucceeded = results.every(r => r.status === 'Completed');
    const totalSynced = results.reduce((sum, r) => sum + r.recordsSynced, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.recordsFailed, 0);
    
    const resultSummary = results.map(r => 
      `${r.syncType}: ${r.recordsSynced}/${r.recordsTotal} synced, ${r.recordsFailed} failed`
    ).join('; ');

    // Update job status
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(3, 0, 0, 0);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: allSucceeded ? 'Completed' : 'Failed',
        lastResult: resultSummary,
        nextRunAt: nextRun,
      },
    });

    console.log(`✅ Accelerate sync completed: ${totalSynced} synced, ${totalFailed} failed`);
  } catch (error) {
    console.error('❌ Error in scheduled Accelerate sync:', error);
    
    // Update job status to failed
    const job = await prisma.job.findFirst({
      where: { name: 'syncAccelerate' },
    });
    
    if (job) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'Failed',
          lastResult: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopAllScheduledJobs(): void {
  scheduledJobs.forEach((intervalId, jobName) => {
    console.log(`🛑 Stopping scheduled job: ${jobName}`);
    clearInterval(intervalId);
  });
  scheduledJobs.clear();
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler(): void {
  console.log('🔧 Initializing scheduler...');
  scheduleDailySync();
  scheduleFeedbackAIAnalysis();
  console.log('✅ Scheduler initialized successfully');
  console.log('⚙️  Initializing job scheduler...');
  scheduleAccelerateSync();
}

/**
 * Schedule feedback AI analysis to run daily at 1:00 AM
 * Runs before other syncs to have fresh analysis data
 */
export function scheduleFeedbackAIAnalysis(): void {
  cron.schedule('0 1 * * *', async () => {
    console.log('🤖 Starting scheduled feedback AI analysis at 1:00 AM...');
    
    try {
      const result = await processAllPendingFeedback();
      
      console.log(`✅ Feedback analysis completed:
        - Processed: ${result.processed}
        - Failed: ${result.failed}`);
      
      // Update job record
      const job = await prisma.job.findFirst({
        where: { name: 'feedbackAIAnalysis' },
      });
      
      if (!job) {
        await prisma.job.create({
          data: {
            name: 'feedbackAIAnalysis',
            status: 'Completed',
            schedule: '0 1 * * *', // Cron: 1:00 AM daily
            lastRunAt: new Date(),
            lastResult: `Processed: ${result.processed}, Failed: ${result.failed}`,
            nextRunAt: getNextRunTime(1), // 1:00 AM next day
          },
        });
      } else {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'Completed',
            lastRunAt: new Date(),
            lastResult: `Processed: ${result.processed}, Failed: ${result.failed}`,
            nextRunAt: getNextRunTime(1),
          },
        });
      }
    } catch (error) {
      console.error('❌ Scheduled feedback analysis failed:', error);
      
      // Update job status
      const job = await prisma.job.findFirst({
        where: { name: 'feedbackAIAnalysis' },
      });
      
      if (job) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'Failed',
            lastResult: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }, {
    timezone: 'Australia/Sydney',
  });

  console.log('📅 Feedback AI analysis scheduled for 1:00 AM daily (Australia/Sydney timezone)');
}

/**
 * Helper to get next run time for a specific hour
 */
function getNextRunTime(hour: number): Date {
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  
  // If the time has passed today, schedule for tomorrow
  if (new Date() >= next) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}
