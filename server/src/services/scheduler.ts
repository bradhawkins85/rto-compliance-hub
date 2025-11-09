/**
 * Job Scheduler Service
 * Handles scheduled tasks like daily Accelerate sync
 */

import { PrismaClient } from '@prisma/client';
import { syncAll } from './accelerateSync';
import { accelerateClient } from './accelerate';

const prisma = new PrismaClient();

// Store interval IDs for cleanup
const scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

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
  console.log('⚙️  Initializing job scheduler...');
  scheduleAccelerateSync();
}
