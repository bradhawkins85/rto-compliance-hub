# JotForm Webhook Integration Tests

This directory contains test fixtures and scripts for testing the JotForm webhook integration.

## Test Fixtures

Sample JotForm webhook payloads for different form types:

- **jotform-learner-feedback.json**: Learner feedback survey with student name and email
- **jotform-employer-feedback.json**: Employer feedback with company information
- **jotform-anonymous-feedback.json**: Anonymous learner feedback (PII excluded)
- **jotform-sop-completion.json**: SOP training completion form with signature

## Manual Testing

### Prerequisites

1. Start the server:
   ```bash
   npm run dev:server
   ```

2. (Optional) Set webhook secret for signature validation:
   ```bash
   export JOTFORM_WEBHOOK_SECRET="your-secret-key"
   ```

### Running Tests

Test with a specific fixture:

```bash
# Test learner feedback
node server/test/test-webhook.js learner

# Test employer feedback
node server/test/test-webhook.js employer

# Test anonymous feedback
node server/test/test-webhook.js anonymous

# Test SOP completion
node server/test/test-webhook.js sop
```

The test script will:
1. Load the specified fixture
2. Generate a signature (if secret is configured)
3. Send the webhook to the endpoint
4. Display the response
5. Check the processing status after 2 seconds

### Testing Against a Different Server

```bash
WEBHOOK_URL=https://your-server.com/api/v1/webhooks/jotform node server/test/test-webhook.js learner
```

## Expected Behavior

### Successful Submission

```json
{
  "message": "Submission received and queued for processing",
  "submissionId": "uuid-here",
  "processingTime": "25ms"
}
```

### Duplicate Submission

```json
{
  "message": "Submission already processed",
  "submissionId": "existing-uuid-here"
}
```

### Invalid Signature (if secret configured)

```json
{
  "type": "https://tools.ietf.org/html/rfc7235#section-3.1",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid webhook signature"
}
```

## Checking Submission Status

After a submission is accepted, you can check its processing status:

```bash
curl http://localhost:3000/api/v1/webhooks/jotform/status/{submissionId}
```

Response:
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

Possible statuses:
- **Pending**: Queued for processing
- **Processing**: Currently being processed
- **Completed**: Successfully processed
- **Failed**: Processing failed after retries

## Integration Testing with JotForm

### Setting up JotForm Webhook

1. Go to your JotForm form settings
2. Navigate to "Integrations" → "Webhooks"
3. Add webhook URL: `https://your-domain.com/api/v1/webhooks/jotform`
4. Configure webhook secret (recommended for production)
5. Save and test the webhook

### Configuring Webhook Secret

In JotForm, you can configure a webhook secret. Store this in your environment:

```bash
# In .env file
JOTFORM_WEBHOOK_SECRET="your-jotform-webhook-secret"
```

The webhook endpoint will validate signatures using HMAC-SHA256.

## Troubleshooting

### Connection Refused

Make sure the server is running:
```bash
npm run dev:server
```

### Signature Validation Fails

Ensure the `JOTFORM_WEBHOOK_SECRET` matches in both:
- Your environment variables
- JotForm webhook configuration

### Processing Errors

Check server logs for detailed error messages. Common issues:
- Missing required fields in form
- Invalid form type detection
- Database connection errors

### Duplicate Detection Not Working

The duplicate detection uses a unique constraint on `(source, submissionId)`. If you're getting duplicates:
1. Check that `submissionId` is being extracted correctly
2. Verify the database migration was applied
3. Check for any database errors in logs
