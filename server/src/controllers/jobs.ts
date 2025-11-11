import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  addJob,
  JobType,
  JobPriority,
  pauseJob,
  resumeJob,
  getQueueMetrics,
  getJobHistory,
  getDeadLetterJobs,
  retryDeadLetterJob,
  cleanOldJobs,
  getJobDetails,
  pauseQueue,
  resumeQueue,
} from '../services/jobQueue';

const prisma = new PrismaClient();

/**
 * List all jobs with their status
 * GET /api/v1/jobs
 */
export async function listJobs(req: Request, res: Response): Promise<void> {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: [
        { nextRunAt: 'asc' },
        { name: 'asc' },
      ],
    });

    const metrics = await getQueueMetrics();

    res.json({
      jobs,
      queueMetrics: metrics,
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to list jobs',
    });
  }
}

/**
 * Get details of a specific job
 * GET /api/v1/jobs/:jobId
 */
export async function getJob(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = await getJobDetails(jobId);

    if (!job) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: `Job ${jobId} not found`,
      });
      return;
    }

    res.json(job);
  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get job details',
    });
  }
}

/**
 * Manually trigger a job
 * POST /api/v1/jobs/trigger
 * Body: { name: "syncXero" | "syncAccelerate" | ... }
 */
export async function triggerJob(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body;

    if (!name || !Object.values(JobType).includes(name)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid job name. Must be one of: ${Object.values(JobType).join(', ')}`,
      });
      return;
    }

    // Add job to queue with high priority for manual triggers
    const job = await addJob(name as JobType, { manual: true }, {
      priority: JobPriority.HIGH,
    });

    res.status(202).json({
      message: `Job ${name} triggered successfully`,
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error triggering job:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to trigger job',
    });
  }
}

/**
 * Pause a specific job
 * POST /api/v1/jobs/:jobType/pause
 */
export async function pauseJobHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobType } = req.params;

    if (!Object.values(JobType).includes(jobType as JobType)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid job type',
      });
      return;
    }

    await pauseJob(jobType as JobType);

    res.json({
      message: `Job ${jobType} paused successfully`,
    });
  } catch (error) {
    console.error('Error pausing job:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to pause job',
    });
  }
}

/**
 * Resume a specific job
 * POST /api/v1/jobs/:jobType/resume
 */
export async function resumeJobHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobType } = req.params;
    const { pattern, tz } = req.body;

    if (!Object.values(JobType).includes(jobType as JobType)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid job type',
      });
      return;
    }

    if (!pattern) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Cron pattern is required',
      });
      return;
    }

    await resumeJob(jobType as JobType, pattern, tz || 'Australia/Sydney');

    res.json({
      message: `Job ${jobType} resumed successfully`,
    });
  } catch (error) {
    console.error('Error resuming job:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to resume job',
    });
  }
}

/**
 * Pause the entire queue
 * POST /api/v1/jobs/queue/pause
 */
export async function pauseQueueHandler(req: Request, res: Response): Promise<void> {
  try {
    await pauseQueue();

    res.json({
      message: 'Job queue paused successfully',
    });
  } catch (error) {
    console.error('Error pausing queue:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to pause queue',
    });
  }
}

/**
 * Resume the entire queue
 * POST /api/v1/jobs/queue/resume
 */
export async function resumeQueueHandler(req: Request, res: Response): Promise<void> {
  try {
    await resumeQueue();

    res.json({
      message: 'Job queue resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming queue:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to resume queue',
    });
  }
}

/**
 * Get job execution history
 * GET /api/v1/jobs/history
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = await getJobHistory(limit);

    res.json(history);
  } catch (error) {
    console.error('Error getting job history:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get job history',
    });
  }
}

/**
 * Get queue metrics
 * GET /api/v1/jobs/metrics
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getQueueMetrics();

    res.json(metrics);
  } catch (error) {
    console.error('Error getting queue metrics:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get queue metrics',
    });
  }
}

/**
 * Get dead letter queue jobs
 * GET /api/v1/jobs/dead-letter
 */
export async function getDeadLetter(req: Request, res: Response): Promise<void> {
  try {
    const jobs = await getDeadLetterJobs();

    res.json(jobs);
  } catch (error) {
    console.error('Error getting dead letter jobs:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get dead letter jobs',
    });
  }
}

/**
 * Retry a job from dead letter queue
 * POST /api/v1/jobs/dead-letter/:jobId/retry
 */
export async function retryDeadLetter(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = await retryDeadLetterJob(jobId);

    if (!job) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: `Job ${jobId} not found in dead letter queue`,
      });
      return;
    }

    res.json({
      message: 'Job moved back to main queue',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error retrying dead letter job:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retry job',
    });
  }
}

/**
 * Clean old completed and failed jobs
 * POST /api/v1/jobs/clean
 * Body: { gracePeriod?: number } // days, default 90
 */
export async function cleanJobs(req: Request, res: Response): Promise<void> {
  try {
    const gracePeriod = req.body.gracePeriod || 90;

    await cleanOldJobs(gracePeriod);

    res.json({
      message: `Jobs older than ${gracePeriod} days cleaned successfully`,
    });
  } catch (error) {
    console.error('Error cleaning jobs:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to clean jobs',
    });
  }
}
