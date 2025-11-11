import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  listJobs,
  getJob,
  triggerJob,
  pauseJobHandler,
  resumeJobHandler,
  pauseQueueHandler,
  resumeQueueHandler,
  getHistory,
  getMetrics,
  getDeadLetter,
  retryDeadLetter,
  cleanJobs,
} from '../controllers/jobs';

const router = Router();

// All job endpoints require authentication and SystemAdmin role
router.use(requireAuth);
router.use(requireRole(['SystemAdmin']));

// List all jobs
router.get('/', listJobs);

// Get job execution history
router.get('/history', getHistory);

// Get queue metrics
router.get('/metrics', getMetrics);

// Get dead letter queue
router.get('/dead-letter', getDeadLetter);

// Retry a job from dead letter queue
router.post('/dead-letter/:jobId/retry', retryDeadLetter);

// Clean old jobs
router.post('/clean', cleanJobs);

// Pause/resume entire queue
router.post('/queue/pause', pauseQueueHandler);
router.post('/queue/resume', resumeQueueHandler);

// Manually trigger a job
router.post('/trigger', triggerJob);

// Pause/resume specific job
router.post('/:jobType/pause', pauseJobHandler);
router.post('/:jobType/resume', resumeJobHandler);

// Get specific job details
router.get('/:jobId', getJob);

export default router;
