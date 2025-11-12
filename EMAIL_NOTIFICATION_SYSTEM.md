# Email Notification System

Comprehensive email notification system for the RTO Compliance Hub with automated reminders, digest emails, and delivery tracking.

## Features

### ✅ Implemented Features

1. **Email Provider Support**
   - SMTP (Generic mail servers, Gmail, etc.)
   - SendGrid (API-based)
   - AWS SES (planned - configuration ready)

2. **Email Templates**
   - Policy Review Reminders
   - Credential Expiry Alerts
   - Professional Development (PD) Due Reminders
   - Complaint Notifications
   - Welcome/Onboarding Emails
   - Daily Digest Summaries

3. **Automated Scheduling**
   - Daily digest emails (7:00 AM)
   - Policy review reminders (8:00 AM)
   - Credential expiry alerts (8:30 AM)
   - PD due reminders (9:00 AM)
   - Failed email retry (every 2 hours)

4. **Email Tracking**
   - Delivery status tracking
   - Retry attempts (up to 3 retries)
   - Failure logging with reasons
   - Message ID tracking
   - Unsubscribe tracking

5. **Template Features**
   - Professional HTML design
   - Plain text fallback
   - Mobile-responsive layout
   - Personalized content
   - Action buttons with direct links
   - Unsubscribe footer
   - Contact information

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Email Provider: 'smtp', 'sendgrid', or 'ses'
EMAIL_PROVIDER=smtp

# SMTP Configuration (for generic SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES (alternative)
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key

# Email Settings
EMAIL_FROM_ADDRESS=noreply@rto-compliance-hub.com
EMAIL_FROM_NAME="RTO Compliance Hub"
EMAIL_REPLY_TO=support@rto-compliance-hub.com
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=60000
EMAIL_RATE_LIMIT_PER_SECOND=10

# Features
EMAIL_ENABLE_TRACKING=true
EMAIL_ENABLE_UNSUBSCRIBE=true
```

### Gmail Setup

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASSWORD`

### SendGrid Setup

1. Sign up at https://sendgrid.com/
2. Create an API key with "Mail Send" permissions
3. Set `SENDGRID_API_KEY` in environment variables

## Database Schema

The system uses the `EmailLog` model to track all email sends:

```prisma
model EmailLog {
  id              String    @id @default(uuid())
  notificationId  String?   @unique
  to              String
  from            String
  subject         String
  templateName    String?
  status          String    @default("pending") // pending, sent, failed, bounced
  retryCount      Int       @default(0)
  lastRetryAt     DateTime?
  sentAt          DateTime?
  failureReason   String?
  messageId       String?
  openedAt        DateTime?
  clickedAt       DateTime?
  unsubscribed    Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## API Endpoints

### Email Management

- `POST /api/v1/email/test` - Send a test email
- `GET /api/v1/email/logs` - Get email logs with filters
- `GET /api/v1/email/stats` - Get email statistics
- `GET /api/v1/email/unsubscribe` - Handle unsubscribe requests
- `POST /api/v1/email/retry-failed` - Retry failed emails

### Trigger Notifications

- `POST /api/v1/email/trigger/policy-reviews` - Send policy review reminders
- `POST /api/v1/email/trigger/credential-expiry` - Send credential expiry alerts
- `POST /api/v1/email/trigger/pd-reminders` - Send PD due reminders
- `POST /api/v1/email/trigger/daily-digests` - Send daily digest emails
- `POST /api/v1/email/welcome/:userId` - Send welcome email to a user

All endpoints (except unsubscribe) require authentication and appropriate permissions.

## Usage Examples

### Sending a Test Email

```bash
curl -X POST http://localhost:3000/api/v1/email/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateName": "policy-review-reminder",
    "data": {
      "userName": "John Doe",
      "policyTitle": "Code of Conduct",
      "reviewDueDate": "2025-12-15",
      "daysRemaining": 10,
      "policyUrl": "http://localhost:5173/policies/123"
    }
  }'
```

### Get Email Statistics

```bash
curl http://localhost:3000/api/v1/email/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Manually Trigger Daily Digests

```bash
curl -X POST http://localhost:3000/api/v1/email/trigger/daily-digests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Email Templates

### Available Templates

1. **policy-review-reminder**
   - Subject: Policy Review Due Soon
   - Use: Remind policy owners of upcoming review dates
   - Data: userName, policyTitle, reviewDueDate, daysRemaining, policyUrl

2. **credential-expiry-alert**
   - Subject: Credential Expiring Soon
   - Use: Alert staff of expiring credentials
   - Data: userName, credentialName, credentialType, expiryDate, daysRemaining, credentialUrl

3. **pd-due-reminder**
   - Subject: Professional Development Due
   - Use: Remind staff of upcoming PD activities
   - Data: userName, pdTitle, pdCategory, pdHours, dueDate, daysRemaining, pdUrl

4. **complaint-notification**
   - Subject: New Complaint Received
   - Use: Notify staff of new complaints
   - Data: userName, complaintId, complaintSource, complaintStatus, receivedDate, slaDeadline, complaintUrl

5. **welcome-onboarding**
   - Subject: Welcome to RTO Compliance Hub
   - Use: Welcome new users
   - Data: userName, userEmail, userDepartment, userRole, dashboardUrl

6. **digest-summary**
   - Subject: Your Daily Compliance Digest
   - Use: Send daily summary of pending items
   - Data: userName, digestDate, policyReviews[], credentialsExpiring[], pdActivities[], complaints[], dashboardUrl

### Customizing Templates

Templates are defined in `server/src/services/email.ts`. Each template includes:
- Subject line
- HTML generator function
- Plain text generator function

To add a new template:

```typescript
'my-new-template': {
  subject: 'My Template Subject',
  html: (data) => `
    <!DOCTYPE html>
    <html>
      <!-- Your HTML content -->
    </html>
  `,
  text: (data) => `
    Your plain text content
  `,
}
```

## Scheduled Jobs

The system automatically runs the following scheduled jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digests | 7:00 AM | Sends compiled digest emails to all active users |
| Policy Reviews | 8:00 AM | Sends reminders for policies due in 30 days |
| Credential Expiry | 8:30 AM | Alerts for credentials expiring in 30 days |
| PD Reminders | 9:00 AM | Reminds staff of PD due in 14 days |
| Retry Failed | Every 2 hours | Retries failed email sends (up to 3 attempts) |

All times are in Australia/Sydney timezone.

## Testing

### Template Testing

Run the template test suite:

```bash
npm run test:email-templates
# or
cd server && npx tsx test/test-email-templates.ts
```

This validates:
- All 6 email templates
- HTML structure and content
- Plain text generation
- Personalization fields
- Unsubscribe links

### Manual Testing

1. Configure email settings in `.env`
2. Start the server
3. Use the test endpoint to send sample emails
4. Check email delivery and appearance

## Monitoring

### Email Logs

View email logs through the API:

```bash
curl "http://localhost:3000/api/v1/email/logs?status=sent&perPage=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Email Statistics

Get aggregated statistics:

```bash
curl http://localhost:3000/api/v1/email/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Returns:
- Total emails sent
- Success/failure counts
- Success rate percentage
- Breakdown by template

## Troubleshooting

### Emails Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials are valid
3. Check email logs for error messages
4. Ensure firewall allows SMTP port (587 or 465)
5. For Gmail, ensure app password is being used

### Failed Sends

Failed emails are automatically retried up to 3 times with a 60-second delay. Check the `EmailLog` table for failure reasons.

### High Bounce Rate

1. Verify email addresses are valid
2. Check email content isn't triggering spam filters
3. Ensure sender domain has proper SPF/DKIM records
4. Monitor unsubscribe requests

## Rate Limiting

The system implements rate limiting to prevent overwhelming email providers:

- Maximum: 10 emails per second (configurable via `EMAIL_RATE_LIMIT_PER_SECOND`)
- Retry delay: 60 seconds between retry attempts
- Daily digest sending is spread across user base

## Security Considerations

1. **Unsubscribe**: All emails include unsubscribe link
2. **Data Privacy**: Email logs store minimal PII
3. **Credentials**: SMTP passwords should be stored securely (use app passwords, not account passwords)
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
5. **Authentication**: All management endpoints require authentication

## Future Enhancements

- [ ] Email open tracking (pixel tracking)
- [ ] Click tracking for links
- [ ] A/B testing for templates
- [ ] Template editor in UI
- [ ] Bounce handling webhook
- [ ] Email preferences per user
- [ ] SMS notifications integration
- [ ] Push notifications support

## Support

For issues or questions:
- Check the logs: `npm run dev:server`
- Review email logs in the database
- Test with the provided test script
- Verify environment configuration

## License

Part of the RTO Compliance Hub system.
