# Accelerate LMS Integration Guide

## Overview
This guide explains how to integrate the Accelerate Learning Management System with the RTO Compliance Hub for automated student and trainer data synchronization.

## Prerequisites
- Accelerate LMS account with API access
- Admin or SystemAdmin role in RTO Compliance Hub
- Accelerate API credentials

## Step 1: Obtain API Credentials

1. **Login to Accelerate** admin portal
2. **Navigate to Settings** → **API Access**
3. **Generate API Key**:
   - Application name: "RTO Compliance Hub"
   - Permissions: Read access to students, trainers, and courses
4. **Save credentials**:
   - API Key
   - API Secret
   - Base URL

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Accelerate Configuration
ACCELERATE_API_KEY=your_api_key_here
ACCELERATE_API_SECRET=your_api_secret_here
ACCELERATE_BASE_URL=https://api.accelerate.com.au
ACCELERATE_TENANT_ID=your_tenant_id
```

## Step 3: Test the Connection

### Verify API Access
```bash
# Check Accelerate connection status
GET /api/v1/sync/accelerate/status
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected response:
```json
{
  "connected": true,
  "tenantName": "Your RTO Name",
  "apiVersion": "v2",
  "lastSync": "2025-11-13T10:30:00Z",
  "features": ["students", "trainers", "courses", "enrolments"]
}
```

## Step 4: Configure Synchronization

### Manual Sync
Trigger a manual synchronization:

```bash
POST /api/v1/sync/accelerate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "syncType": "full",  # Options: "full", "students", "trainers", "courses"
  "includeInactive": false
}
```

Response:
```json
{
  "jobId": "job_xyz789",
  "message": "Sync job queued successfully",
  "estimatedDuration": "5-10 minutes",
  "status": "queued"
}
```

### Automatic Sync Schedule
By default, Accelerate sync runs:
- **Daily at 3:00 AM**: Full student and trainer sync
- **Every 4 hours**: Incremental enrolment updates

Configure custom schedule:
```bash
ACCELERATE_SYNC_SCHEDULE="0 3 * * *"  # Cron format
ACCELERATE_INCREMENTAL_SCHEDULE="0 */4 * * *"
```

## Step 5: Data Mapping

### Student Data
Accelerate student data is stored separately from users:

| Accelerate Field | RTO Hub Field | Notes |
|------------------|---------------|-------|
| `student_id` | `accelerateStudentId` | External reference |
| `first_name` + `last_name` | `name` | Combined |
| `email` | `email` | Primary identifier |
| `phone` | `phone` | Contact number |
| `course_code` | `courseId` | Links to training products |
| `enrolment_date` | `enrolmentDate` | Start date |
| `completion_date` | `completionDate` | Completion date |
| `status` | `status` | Active/Completed/Withdrawn |

### Trainer Data
Accelerate trainer data maps to RTO Hub users:

| Accelerate Field | RTO Hub Field | Notes |
|------------------|---------------|-------|
| `trainer_id` | `accelerateTrainerId` | External reference |
| `first_name` + `last_name` | `name` | Combined |
| `email` | `email` | Primary identifier |
| `qualifications` | `credentials` | Mapped to credential records |
| `status` | `status` | Active/Inactive |

### Course Data
Courses sync to training products:

| Accelerate Field | RTO Hub Field | Notes |
|------------------|---------------|-------|
| `course_code` | `code` | National code (e.g., TLI41221) |
| `course_name` | `name` | Full course name |
| `version` | `version` | Training package version |
| `status` | `status` | Active/Superseded |

## Step 6: Monitor Sync Activity

### View Sync History
```bash
GET /api/v1/sync/accelerate/history?page=1&perPage=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Response:
```json
{
  "syncs": [
    {
      "id": "sync_456",
      "type": "full",
      "status": "completed",
      "startedAt": "2025-11-13T03:00:00Z",
      "completedAt": "2025-11-13T03:08:45Z",
      "studentsProcessed": 523,
      "studentsCreated": 15,
      "studentsUpdated": 42,
      "trainersProcessed": 28,
      "trainersCreated": 1,
      "trainersUpdated": 3,
      "errors": []
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Check Sync Job Status
```bash
GET /api/v1/jobs/{jobId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Step 7: Query Synchronized Data

### Get Students
```bash
GET /api/v1/students?page=1&perPage=30
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get Student by Accelerate ID
```bash
GET /api/v1/students/by-accelerate-id/{accelerateStudentId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get Trainers
```bash
GET /api/v1/users?role=Trainer&page=1
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Troubleshooting

### Common Issues

#### 1. API Authentication Failed
**Symptoms**: 401 or 403 errors from Accelerate API
**Solutions**:
- Verify API key and secret are correct
- Check API permissions in Accelerate admin
- Ensure tenant ID matches your organization
- Regenerate API credentials if compromised

#### 2. Sync Takes Too Long
**Symptoms**: Sync job runs longer than expected
**Solutions**:
- Use incremental sync instead of full sync
- Increase sync frequency to reduce batch size
- Check Accelerate API performance status
- Schedule sync during low-traffic hours

#### 3. Missing or Duplicate Records
**Symptoms**: Students/trainers not syncing correctly
**Solutions**:
- Verify email is populated in Accelerate
- Check for duplicate emails in source data
- Enable strict duplicate detection
- Review sync logs for skipped records

#### 4. Course Mapping Issues
**Symptoms**: Courses not linking to training products
**Solutions**:
- Verify course codes match national codes
- Check training products exist in RTO Hub
- Use course code mapping configuration
- Manually create missing training products

## Advanced Configuration

### Custom Field Mapping
Override default field mappings:

```json
{
  "studentFieldMapping": {
    "custom_field_1": "studentNumber",
    "custom_field_2": "cohort"
  },
  "trainerFieldMapping": {
    "trainer_custom_1": "employeeNumber",
    "trainer_custom_2": "specialization"
  }
}
```

Add to environment:
```bash
ACCELERATE_STUDENT_FIELD_MAPPING='{"custom_field_1":"studentNumber"}'
ACCELERATE_TRAINER_FIELD_MAPPING='{"trainer_custom_1":"employeeNumber"}'
```

### Selective Sync
Sync only specific courses or cohorts:

```bash
POST /api/v1/sync/accelerate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "syncType": "students",
  "filters": {
    "courseCode": ["TLI41221", "TLI50419"],
    "enrolmentDateFrom": "2025-01-01",
    "status": "Active"
  }
}
```

### Batch Size Configuration
Adjust batch size for large datasets:

```bash
# Process records in smaller batches
ACCELERATE_BATCH_SIZE=100
ACCELERATE_MAX_CONCURRENT_REQUESTS=5
```

## Real-time Updates

### Webhook Configuration (if supported)
If Accelerate supports webhooks:

1. Configure webhook in Accelerate admin
2. Set webhook URL: `https://api.rtocompliancehub.com/api/v1/webhooks/accelerate`
3. Subscribe to events:
   - `student.created`
   - `student.updated`
   - `student.enrolment.changed`
   - `trainer.created`
   - `trainer.updated`

### Webhook Payload Example
```json
{
  "event": "student.updated",
  "timestamp": "2025-11-13T14:30:00Z",
  "data": {
    "student_id": "12345",
    "email": "student@example.com",
    "status": "Completed",
    "completion_date": "2025-11-13"
  }
}
```

## Security Best Practices

1. **API Key Management**
   - Store credentials encrypted
   - Rotate API keys quarterly
   - Never commit credentials to version control
   - Use environment variables only

2. **Access Control**
   - Request minimum required API permissions
   - Regularly audit API access logs
   - Implement IP whitelisting if available
   - Monitor for unusual activity

3. **Data Privacy**
   - Comply with privacy regulations (Privacy Act 1988)
   - Only sync necessary student data
   - Implement data retention policies
   - Provide data access and deletion mechanisms

## Rate Limits

Accelerate API limits (typical):
- **Requests**: 100 per minute per API key
- **Concurrent**: Maximum 10 concurrent requests
- **Daily**: 50,000 requests per day

RTO Hub handles rate limiting:
- Implements request queuing
- Uses exponential backoff on errors
- Provides rate limit status in headers

## Performance Optimization

### Large Datasets
For organizations with 1000+ students:

1. **Use incremental sync**: Only sync changes since last sync
2. **Increase batch size**: Process 200-500 records per batch
3. **Schedule wisely**: Run during off-peak hours (2-5 AM)
4. **Enable caching**: Cache course and trainer data

Configuration:
```bash
ACCELERATE_INCREMENTAL_ENABLED=true
ACCELERATE_BATCH_SIZE=500
ACCELERATE_CACHE_TTL=3600  # 1 hour
```

## Support Resources

- **Accelerate Support**: support@accelerate.com.au
- **Accelerate API Docs**: [https://docs.accelerate.com.au/api](https://docs.accelerate.com.au/api)
- **RTO Hub API Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **RTO Hub Support**: support@rtocompliancehub.com

## Testing Checklist

- [ ] API credentials obtained and verified
- [ ] Environment variables configured
- [ ] Connection status verified
- [ ] Manual sync tested successfully
- [ ] Students appear in RTO Hub
- [ ] Trainers synced and mapped to users
- [ ] Courses linked to training products
- [ ] Automatic sync scheduled
- [ ] Error handling tested
- [ ] Performance acceptable for dataset size
- [ ] Rate limiting understood
- [ ] Security practices implemented

## Next Steps

- Configure [Student Dashboard](../features/student-dashboard.md)
- Set up [Feedback Collection](./jotform-webhook.md) for students
- Explore [Reporting Features](../features/reporting.md)
- Enable [Email Notifications](./email-notifications.md)
