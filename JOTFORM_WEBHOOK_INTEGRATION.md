# JotForm Webhook Integration

This document describes the JotForm webhook integration for automated feedback collection.

## Overview

The JotForm webhook integration enables automatic processing of form submissions from JotForm surveys. When a user submits a form in JotForm, the data is automatically sent to our system, processed, and stored in the database.

## Features

- ✅ **Secure**: HMAC-SHA256 signature validation prevents unauthorized submissions
- ✅ **Async Processing**: Submissions are queued and processed asynchronously
- ✅ **Retry Logic**: Failed submissions are automatically retried (up to 3 attempts)
- ✅ **Duplicate Detection**: Prevents duplicate submissions from being processed
- ✅ **Anonymous Support**: Properly handles anonymous submissions by excluding PII
- ✅ **Form Type Detection**: Automatically detects learner, employer, industry, and SOP forms
- ✅ **Comprehensive Logging**: All webhook events are logged for debugging
- ✅ **Status Tracking**: Query the processing status of any submission

## Endpoints

### POST /api/v1/webhooks/jotform

Receives JotForm webhook submissions.

**Authentication**: None (uses signature validation)

**Headers**:
- `Content-Type: application/json`
- `x-jotform-signature`: HMAC-SHA256 signature (optional but recommended)

**Request Body**: JotForm webhook payload (see examples below)

**Response**:

```json
{
  "message": "Submission received and queued for processing",
  "submissionId": "uuid-here",
  "processingTime": "25ms"
}
```

**Status Codes**:
- `202`: Submission accepted and queued
- `400`: Invalid request (missing submission ID)
- `401`: Invalid signature
- `500`: Server error

### GET /api/v1/webhooks/jotform/status/:id

Check the processing status of a submission.

**Authentication**: None

**Response**:

```json
{
  "id": "uuid",
  "source": "jotform",
  "formId": "241234567890",
  "submissionId": "learner-123456789",
  "formType": "learner",
  "status": "Completed",
  "retryCount": 0,
  "processingError": null,
  "processedAt": "2025-11-09T11:30:15.000Z",
  "createdAt": "2025-11-09T11:30:00.000Z",
  "updatedAt": "2025-11-09T11:30:15.000Z"
}
```

**Status Values**:
- `Pending`: Queued for processing
- `Processing`: Currently being processed
- `Completed`: Successfully processed and stored
- `Failed`: Processing failed after all retry attempts

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# JotForm Integration
JOTFORM_API_KEY=""
JOTFORM_WEBHOOK_SECRET="your-webhook-secret-here"
```

The `JOTFORM_WEBHOOK_SECRET` should match the secret configured in JotForm's webhook settings.

### JotForm Setup

1. **Create Forms**: Create your feedback forms in JotForm
2. **Add Form Type Indicator**: Include a field that indicates the form type (learner, employer, industry, sop)
3. **Configure Webhook**:
   - Go to Form Settings → Integrations → Webhooks
   - Add webhook URL: `https://your-domain.com/api/v1/webhooks/jotform`
   - Set webhook secret (recommended)
   - Select "Send all submission data"
4. **Test**: Submit a test form and verify it appears in the system

## Form Types

The system automatically detects form types based on field names or form titles:

### Learner Feedback
- Form title contains "learner" or "student"
- Used for collecting feedback from students/learners
- Maps to `Feedback` table with `type = "learner"`

### Employer Feedback
- Form title contains "employer"
- Used for collecting feedback from employers about training outcomes
- Maps to `Feedback` table with `type = "employer"`

### Industry Feedback
- Form title contains "industry"
- Used for collecting feedback from industry stakeholders
- Maps to `Feedback` table with `type = "industry"`

### SOP Training Completion
- Form title contains "sop" or "training completion"
- Used for tracking SOP training completions
- Maps to `Feedback` table with `type = "sop"`

## Field Mapping

The webhook processor automatically maps common JotForm fields:

| JotForm Field Name (contains) | Maps To | Description |
|-------------------------------|---------|-------------|
| `rating`, `score` | `rating` | Numeric rating (converted to float) |
| `comment`, `feedback`, `suggestion` | `comments` | Text feedback |
| `trainer`, `instructor` | `trainerId` | Trainer identifier |
| `course`, `training`, `product` | `courseId`, `trainingProductId` | Course/product identifier |
| `anonymous` | `anonymous` | Boolean flag for anonymous submissions |

## Anonymous Submissions

When a submission is marked as anonymous:
- PII fields (names, emails, etc.) are excluded from storage
- Only aggregated feedback data is stored
- The `anonymous` flag is set to `true` in the `Feedback` table

Detection logic:
- Field named "anonymous" with value "yes", "true", or "1"
- Automatically excludes trainer and student identification

## Processing Flow

1. **Receive**: Webhook endpoint receives POST request
2. **Validate**: Signature validation (if secret configured)
3. **Deduplicate**: Check if submission ID already exists
4. **Store**: Create `WebhookSubmission` record with status "Pending"
5. **Queue**: Submission queued for async processing
6. **Process**: Extract and map fields to `Feedback` record
7. **Complete**: Update status to "Completed" or retry on failure

## Error Handling

### Retry Logic

Failed submissions are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay

After 3 failed retries, the submission is marked as "Failed" and logged.

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid signature | Secret mismatch | Verify `JOTFORM_WEBHOOK_SECRET` matches JotForm config |
| Missing submission ID | Invalid payload | Check JotForm webhook configuration |
| Duplicate submission | Resubmission | Normal behavior - returns success |
| Processing timeout | Database issues | Check database connection and logs |

## Security

### Signature Validation

The webhook uses HMAC-SHA256 for signature validation:

```javascript
const hmac = crypto.createHmac('sha256', JOTFORM_WEBHOOK_SECRET);
hmac.update(JSON.stringify(payload));
const expectedSignature = hmac.digest('hex');
```

This ensures:
- Requests come from JotForm
- Payloads haven't been tampered with
- Unauthorized submissions are rejected

### Rate Limiting

The webhook endpoint is protected by the API rate limiter configured in the application:
- Default: 5 requests per 15 minutes per IP
- Configurable via `RATE_LIMIT_*` environment variables

## Monitoring

### Logs

All webhook events are logged with emoji indicators:
- 📨 Webhook received
- ✅ Signature validated
- 💾 Submission stored
- 🔄 Processing started
- ✅ Processing completed
- ❌ Errors

### Metrics to Monitor

- Submission rate (per minute/hour)
- Processing time (target: <3 seconds)
- Success rate (should be >95%)
- Retry rate (should be <5%)
- Duplicate rate

### Querying Submissions

```sql
-- Check recent submissions
SELECT * FROM webhook_submissions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check failed submissions
SELECT * FROM webhook_submissions 
WHERE status = 'Failed' 
ORDER BY created_at DESC;

-- Check processing metrics
SELECT 
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM webhook_submissions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## Testing

See [server/test/README.md](../server/test/README.md) for detailed testing instructions.

Quick test:

```bash
# Start server
npm run dev:server

# Test learner feedback
node server/test/test-webhook.js learner
```

## Troubleshooting

### Webhooks Not Arriving

1. Check JotForm webhook configuration
2. Verify URL is accessible from internet
3. Check firewall/security group rules
4. Review JotForm webhook logs

### Signature Validation Failing

1. Verify secret matches in both systems
2. Check for trailing whitespace in secret
3. Ensure payload is not modified in transit
4. Test without signature validation first

### Submissions Stuck in Pending

1. Check server logs for processing errors
2. Verify database connection
3. Check for missing fields in Feedback table
4. Review form type detection logic

### Performance Issues

1. Monitor database query performance
2. Check for lock contention on webhook_submissions table
3. Consider adding database indexes
4. Implement proper queue system (Bull/BullMQ) for production

## Production Recommendations

1. **Use a Queue System**: Replace `setImmediate` with proper queue (Bull, BullMQ, or AWS SQS)
2. **Add Monitoring**: Implement alerting for failed submissions
3. **Scale Horizontally**: Multiple webhook workers can process submissions in parallel
4. **Add Circuit Breaker**: Prevent cascading failures
5. **Implement Idempotency Keys**: Additional protection against duplicates
6. **Add Webhook History**: Archive old submissions for compliance
7. **Set up Dead Letter Queue**: For submissions that fail all retries

## API Examples

### cURL Example

```bash
curl -X POST https://your-domain.com/api/v1/webhooks/jotform \
  -H "Content-Type: application/json" \
  -H "x-jotform-signature: abc123..." \
  -d @path/to/payload.json
```

### JavaScript Example

```javascript
const response = await fetch('https://your-domain.com/api/v1/webhooks/jotform', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-jotform-signature': signature,
  },
  body: JSON.stringify(payload),
});

const result = await response.json();
console.log('Submission ID:', result.submissionId);
```

## Support

For issues or questions:
1. Check server logs for error details
2. Review the test fixtures in `server/test/fixtures/`
3. Run manual tests with `server/test/test-webhook.js`
4. Check the database for submission status
5. Contact the development team with logs and submission ID
