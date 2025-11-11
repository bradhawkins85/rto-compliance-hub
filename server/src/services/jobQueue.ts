import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { redis } from './redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Job queue configuration
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 90 * 24 * 60 * 60, // Keep completed jobs for 90 days
      count: 1000,
    },
    removeOnFail: false, // Keep failed jobs for analysis
  },
};

// Job type definitions
export enum JobType {
  SYNC_XERO = 'syncXero',
  SYNC_ACCELERATE = 'syncAccelerate',
  PD_REMINDERS = 'pdReminders',
  CREDENTIAL_EXPIRY = 'credentialExpiry',
  POLICY_REVIEWS = 'policyReviews',
  COMPLAINT_SLA = 'complaintSLA',
  WEEKLY_DIGEST = 'weeklyDigest',
  MONTHLY_COMPLIANCE_REPORT = 'monthlyComplianceReport',
  FEEDBACK_AI_ANALYSIS = 'feedbackAIAnalysis',
  RETRY_FAILED_EMAILS = 'retryFailedEmails',
  CHECK_INCOMPLETE_ONBOARDING = 'checkIncompleteOnboarding',
}

// Job priority levels
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 5,
  NORMAL = 10,
  LOW = 15,
}

// Create main job queue
export const jobQueue = new Queue('rto-jobs', queueConfig);

// Create dead letter queue for permanently failed jobs
export const deadLetterQueue = new Queue('rto-jobs-dlq', {
  connection: redis,
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('rto-jobs', {
  connection: redis,
});

// Job status tracking
queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  console.log(`✅ Job ${jobId} completed:`, returnvalue);
  await updateJobStatus(jobId, 'Completed', returnvalue);
});

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed:`, failedReason);
  
  // Get job to check if it's permanently failed
  const job = await jobQueue.getJob(jobId);
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    // Move to dead letter queue
    await deadLetterQueue.add(job.name, job.data, {
      jobId: `dlq-${jobId}`,
    });
    console.log(`📮 Job ${jobId} moved to dead letter queue`);
    
    // Notify admins
    await notifyAdminsOfPermanentFailure(job);
  }
  
  await updateJobStatus(jobId, 'Failed', failedReason);
});

queueEvents.on('stalled', async ({ jobId }) => {
  console.warn(`⚠️  Job ${jobId} stalled`);
});

// Helper: Update job status in database
async function updateJobStatus(
  jobId: string,
  status: string,
  result?: any
): Promise<void> {
  try {
    const job = await jobQueue.getJob(jobId);
    if (!job) return;

    const dbJob = await prisma.job.findFirst({
      where: { name: job.name },
    });

    if (!dbJob) {
      await prisma.job.create({
        data: {
          name: job.name,
          status,
          lastRunAt: new Date(),
          lastResult: typeof result === 'string' ? result : JSON.stringify(result),
        },
      });
    } else {
      await prisma.job.update({
        where: { id: dbJob.id },
        data: {
          status,
          lastRunAt: new Date(),
          lastResult: typeof result === 'string' ? result : JSON.stringify(result),
        },
      });
    }
  } catch (error) {
    console.error('Error updating job status:', error);
  }
}

// Helper: Notify admins of permanent job failure
async function notifyAdminsOfPermanentFailure(job: Job): Promise<void> {
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

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Job Permanently Failed',
      message: `Job "${job.name}" has failed permanently after ${job.attemptsMade} attempts. It has been moved to the dead letter queue for investigation.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about permanent job failure`);
  } catch (error) {
    console.error('Error notifying admins of permanent failure:', error);
  }
}

// Add a job to the queue
export async function addJob(
  jobType: JobType,
  data: any = {},
  options: {
    priority?: JobPriority;
    delay?: number;
    repeat?: {
      pattern: string; // Cron pattern
      tz?: string;
    };
  } = {}
): Promise<Job> {
  return jobQueue.add(jobType, data, {
    priority: options.priority || JobPriority.NORMAL,
    delay: options.delay,
    repeat: options.repeat,
  });
}

// Remove a repeatable job
export async function removeRepeatableJob(
  jobType: JobType,
  repeatOpts: { pattern: string; tz?: string }
): Promise<void> {
  await jobQueue.removeRepeatable(jobType, repeatOpts);
}

// Pause the queue
export async function pauseQueue(): Promise<void> {
  await jobQueue.pause();
  console.log('⏸️  Job queue paused');
}

// Resume the queue
export async function resumeQueue(): Promise<void> {
  await jobQueue.resume();
  console.log('▶️  Job queue resumed');
}

// Pause a specific job pattern
export async function pauseJob(jobType: JobType): Promise<void> {
  const repeatableJobs = await jobQueue.getRepeatableJobs();
  const job = repeatableJobs.find((j) => j.name === jobType);
  
  if (job) {
    await jobQueue.removeRepeatable(jobType, {
      pattern: job.pattern,
      tz: job.tz,
    });
    
    // Store paused state in database
    await prisma.job.updateMany({
      where: { name: jobType },
      data: { status: 'Paused' },
    });
    
    console.log(`⏸️  Job ${jobType} paused`);
  }
}

// Resume a specific job
export async function resumeJob(
  jobType: JobType,
  pattern: string,
  tz?: string
): Promise<void> {
  await addJob(jobType, {}, {
    repeat: { pattern, tz },
  });
  
  // Update database state
  await prisma.job.updateMany({
    where: { name: jobType },
    data: { status: 'Scheduled' },
  });
  
  console.log(`▶️  Job ${jobType} resumed`);
}

// Get queue metrics
export async function getQueueMetrics(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    jobQueue.getWaitingCount(),
    jobQueue.getActiveCount(),
    jobQueue.getCompletedCount(),
    jobQueue.getFailedCount(),
    jobQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: await jobQueue.isPaused(),
  };
}

// Get job history
export async function getJobHistory(limit: number = 100): Promise<Job[]> {
  const completed = await jobQueue.getCompleted(0, limit);
  const failed = await jobQueue.getFailed(0, limit);
  
  return [...completed, ...failed].sort((a, b) => {
    const aTime = a.finishedOn || a.processedOn || 0;
    const bTime = b.finishedOn || b.processedOn || 0;
    return bTime - aTime;
  });
}

// Get dead letter queue jobs
export async function getDeadLetterJobs(): Promise<Job[]> {
  return deadLetterQueue.getJobs(['completed', 'failed', 'delayed', 'active', 'waiting']);
}

// Retry a job from dead letter queue
export async function retryDeadLetterJob(jobId: string): Promise<Job | null> {
  const job = await deadLetterQueue.getJob(jobId);
  if (!job) return null;
  
  // Add back to main queue
  const originalJobId = jobId.replace('dlq-', '');
  const newJob = await jobQueue.add(job.name, job.data, {
    jobId: `retry-${originalJobId}`,
  });
  
  // Remove from DLQ
  await job.remove();
  
  return newJob;
}

// Clean old jobs
export async function cleanOldJobs(gracePeriod: number = 90): Promise<void> {
  const olderThan = Date.now() - gracePeriod * 24 * 60 * 60 * 1000;
  
  await jobQueue.clean(olderThan, 1000, 'completed');
  await jobQueue.clean(olderThan, 1000, 'failed');
  
  console.log(`🧹 Cleaned jobs older than ${gracePeriod} days`);
}

// Get specific job details
export async function getJobDetails(jobId: string): Promise<Job | null> {
  return jobQueue.getJob(jobId);
}

// Graceful shutdown
export async function closeJobQueue(): Promise<void> {
  await jobQueue.close();
  await deadLetterQueue.close();
  await queueEvents.close();
  console.log('🛑 Job queue closed gracefully');
}

export default jobQueue;
