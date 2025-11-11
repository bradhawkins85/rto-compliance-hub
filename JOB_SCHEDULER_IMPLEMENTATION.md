# Background Job Scheduler - Implementation Summary

## Overview
This implementation adds a robust background job scheduling system to the RTO Compliance Hub using BullMQ and Redis.

## Components Added

### Backend Services
1. **Redis Connection (`server/src/services/redis.ts`)**
   - Manages Redis connection for job queue
   - Handles connection events and graceful shutdown
   - Configurable via environment variables

2. **Job Queue (`server/src/services/jobQueue.ts`)**
   - Main job queue using BullMQ
   - Dead letter queue for permanently failed jobs
   - Job priority levels (Critical, High, Normal, Low)
   - Automatic retry with exponential backoff (up to 3 attempts)
   - Job execution history retention (90 days)
   - Queue health monitoring

3. **Job Worker (`server/src/services/jobWorker.ts`)**
   - Processes jobs from the queue
   - Concurrency: 5 jobs at a time
   - Job processors for all scheduled tasks:
     - Xero employee sync
     - Accelerate LMS sync
     - Feedback AI analysis
     - PD reminders
     - Credential expiry alerts
     - Policy review reminders
     - Complaint SLA checks
     - Weekly digests
     - Monthly compliance reports
     - Failed email retries
     - Incomplete onboarding checks

4. **Scheduler (`server/src/services/scheduler.ts`)**
   - Migrated from node-cron to BullMQ
   - Registers all scheduled jobs on startup
   - Timezone support (Australia/Sydney)

### API Endpoints
**Jobs Controller (`server/src/controllers/jobs.ts`)**
- List all jobs with status
- Get job details
- Manually trigger jobs
- Pause/resume jobs
- Pause/resume entire queue
- View job execution history
- Get queue metrics
- Manage dead letter queue
- Clean old jobs

**Routes (`server/src/routes/jobs.ts`)**
- All endpoints require authentication and SystemAdmin role
- RESTful API design
- RFC 7807 error responses

### Frontend Dashboard
**Jobs View (`src/components/views/JobsView.tsx`)**
- Real-time queue metrics display
- Job status monitoring
- Manual job triggers
- Job pause/resume controls
- Auto-refresh every 10 seconds
- Responsive design

## Job Schedules

| Job Name | Schedule | Time (AEST) | Description |
|----------|----------|-------------|-------------|
| feedbackAIAnalysis | 0 1 * * * | 1:00 AM daily | Process pending feedback with AI |
| syncXero | 0 2 * * * | 2:00 AM daily | Sync employees from Xero |
| syncAccelerate | 0 3 * * * | 3:00 AM daily | Sync data from Accelerate LMS |
| pdReminders | 0 8 * * * | 8:00 AM daily | Send PD due reminders |
| credentialExpiry | 0 8 * * * | 8:00 AM daily | Check and alert credential expiry |
| policyReviews | 0 8 * * * | 8:00 AM daily | Send policy review reminders |
| complaintSLA | 0 9 * * * | 9:00 AM daily | Check complaint SLA breaches |
| weeklyDigest | 0 8 * * 1 | 8:00 AM Monday | Send weekly activity summary |
| monthlyComplianceReport | 0 9 1 * * | 9:00 AM 1st of month | Generate compliance report |
| retryFailedEmails | 0 */2 * * * | Every 2 hours | Retry failed email deliveries |
| checkIncompleteOnboarding | 30 9 * * * | 9:30 AM daily | Check incomplete onboarding |

## Key Features

### Retry Logic
- Automatic retry up to 3 times
- Exponential backoff (starts at 2 seconds)
- Failed jobs after 3 attempts move to dead letter queue
- Admin notifications for permanent failures

### Job Priority
- **Critical (1)**: Time-sensitive operations
- **High (5)**: Important but can wait briefly
- **Normal (10)**: Standard operations
- **Low (15)**: Background maintenance

### Monitoring
- Real-time queue metrics
- Job execution history
- Failed job tracking
- Dead letter queue management
- Queue health status

### Management
- Manual job triggering
- Job pause/resume
- Queue pause/resume
- Old job cleanup
- Failed job retry from DLQ

## Environment Variables

Add to `.env`:
```bash
# Redis Configuration (for job queue)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0
REDIS_URL="redis://localhost:6379"
```

## Setup Instructions

### 1. Install Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (via WSL or Docker)
docker run -d -p 6379:6379 redis:latest
```

### 2. Install Dependencies
Already included in package.json:
- bullmq
- ioredis
- @types/ioredis

### 3. Start the Application
```bash
# Development
npm run dev:server

# Production
npm run build:server
npm run server:start
```

### 4. Verify Job Scheduler
Check server logs for:
```
✅ Redis connected
✅ Scheduled: Daily Xero sync at 2:00 AM
✅ Scheduled: Daily Accelerate sync at 3:00 AM
...
✅ Job scheduler initialized successfully
```

## Testing

### Manual Job Trigger
1. Navigate to Jobs page in UI
2. Click "Run Now" on any job
3. Monitor status in real-time

### API Testing
```bash
# Get all jobs
curl -X GET http://localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger a job manually
curl -X POST http://localhost:3000/api/v1/jobs/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "syncXero"}'

# Get queue metrics
curl -X GET http://localhost:3000/api/v1/jobs/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get job history
curl -X GET http://localhost:3000/api/v1/jobs/history?limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Redis Connection Issues
**Error**: `Redis connection error`
- Verify Redis is running: `redis-cli ping` (should return "PONG")
- Check REDIS_HOST and REDIS_PORT in .env
- Check firewall settings

### Jobs Not Running
- Check Redis connection
- Verify job worker is running (check server logs)
- Check database Job records
- Review queue metrics in dashboard

### Job Failures
- Check job execution history in dashboard
- Review last result message
- Check application logs
- Inspect dead letter queue for permanently failed jobs

### Performance Issues
- Adjust worker concurrency (currently 5)
- Monitor Redis memory usage
- Review job timeout settings
- Consider job priority adjustments

## Acceptance Criteria Status

✅ Jobs run reliably on their defined schedules
✅ Failed jobs are automatically retried (up to 3 times)
✅ Job status is visible in admin dashboard
✅ Admins can manually trigger any job
✅ Job errors are logged and administrators are alerted
✅ Job execution history is retained for 90 days
✅ Long-running jobs don't block other jobs (concurrency: 5)
✅ Jobs can be paused and resumed
✅ Job queue is monitored for health
✅ Dead letter queue captures permanently failed jobs

## Technical Requirements Status

✅ Use Redis for job queue backend
✅ Implement job concurrency limits (5 concurrent jobs)
✅ Set appropriate job timeouts (30 seconds lock duration)
✅ Configure job priority levels (Critical, High, Normal, Low)
✅ Implement idempotent job processing
✅ Create job monitoring dashboard UI

## Future Enhancements

1. **Job Performance Metrics**
   - Average execution time per job type
   - Success/failure rates
   - Performance trends over time

2. **Advanced Scheduling**
   - Custom cron expressions via UI
   - One-time scheduled jobs
   - Recurring jobs with end dates

3. **Notifications**
   - Email alerts for critical job failures
   - Slack/Teams integration
   - SMS alerts for high-priority failures

4. **Job Dependencies**
   - Chain jobs together
   - Conditional job execution
   - Parent/child job relationships

5. **Batch Processing**
   - Bulk job operations
   - Job templates
   - Job groups

## Security Considerations

1. **Authentication**: All job endpoints require SystemAdmin role
2. **Rate Limiting**: API endpoints are rate-limited
3. **Input Validation**: Job names are validated against enum
4. **Error Handling**: Sensitive information not exposed in errors
5. **Audit Logging**: All job operations are logged

## Monitoring Recommendations

1. Set up Redis monitoring (memory, connections, operations/sec)
2. Monitor queue metrics (waiting, active, failed)
3. Set up alerts for:
   - Queue paused state
   - High failure rate (>10%)
   - Dead letter queue growth
   - Redis connection failures
4. Review job execution history weekly
5. Clean dead letter queue monthly

## Documentation References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Job API Endpoints](../PRD.md#1110-notifications--jobs)
