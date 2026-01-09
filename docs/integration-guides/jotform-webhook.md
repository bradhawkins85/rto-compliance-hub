# JotForm Webhook Integration Guide

## Overview
This guide explains how to integrate JotForm surveys with the RTO Compliance Hub using webhooks. JotForm submissions will automatically be captured and stored in the feedback system.

## Prerequisites
- JotForm account with API access
- Admin or SystemAdmin role in RTO Compliance Hub
- Access to the webhook endpoint URL

## Step 1: Configure Webhook in JotForm

1. **Login to JotForm** and navigate to your form
2. **Go to Settings** → **Integrations** → **Webhooks**
3. **Add a new webhook** with the following details:
   - **URL**: `https://api.rtocompliancehub.com/api/v1/webhooks/jotform`
   - **Method**: POST
   - **Content Type**: application/x-www-form-urlencoded

## Step 2: Configure Form Fields

For optimal integration, map your JotForm fields to match these recommended field names:

### Learner Feedback Forms
- `type`: Set to "learner" (hidden field)
- `courseId`: Course identifier (dropdown or text)
- `trainerId`: Trainer identifier (dropdown or text)
- `rating`: Rating (1-5 scale)
- `comments`: Open text feedback
- `anonymous`: Checkbox (optional - for anonymous submissions)

### Employer Feedback Forms
- `type`: Set to "employer" (hidden field)
- `companyName`: Employer name
- `rating`: Rating (1-5 scale)
- `outcomeMetrics`: Specific outcomes or metrics
- `comments`: Open text feedback

### Industry Feedback Forms
- `type`: Set to "industry" (hidden field)
- `stakeholderType`: Type of stakeholder (safety officer, coordinator, etc.)
- `rating`: Rating (1-5 scale)
- `comments`: Open text feedback
- `audioUrl`: Link to audio recording (optional)

## Step 3: Test the Integration

1. **Submit a test form** through JotForm
2. **Check the webhook logs** in JotForm to verify successful delivery
3. **Verify in RTO Compliance Hub** by navigating to Feedback → List Feedback
4. **Confirm the data** appears with correct mapping

## Step 4: Monitor Webhook Health

### Check Webhook Status
```bash
# View recent webhook submissions
GET /api/v1/webhooks/jotform/status
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Common Issues and Troubleshooting

#### Webhook Not Firing
- **Check JotForm webhook settings**: Ensure the URL is correct and active
- **Verify SSL certificate**: Production URL must use HTTPS
- **Check rate limits**: Maximum 30 requests per minute

#### Data Not Appearing
- **Check field mapping**: Ensure form fields match expected names
- **Verify form type**: The `type` field must be set correctly
- **Review logs**: Check server logs for parsing errors

#### Rate Limiting
If you're being rate limited:
- **Reduce submission frequency**: Limit to 30 submissions per minute
- **Contact support**: For increased rate limits if needed

## Step 5: Security Best Practices

1. **Use HTTPS only**: Never use HTTP for webhook URLs
2. **Validate submissions**: The API validates all incoming data
3. **Monitor webhook activity**: Regularly check for suspicious patterns
4. **Rotate credentials**: If webhook URL is compromised, update immediately

## Advanced Configuration

### Custom Field Mapping
For custom field mappings, configure the field mapping in the webhook controller:

```typescript
// Example custom mapping
const fieldMapping = {
  'custom_course_field': 'courseId',
  'custom_trainer_field': 'trainerId',
  'custom_rating_field': 'rating'
};
```

### Webhook Signature Verification
To enable webhook signature verification:

1. Generate a webhook secret in JotForm
2. Add the secret to your environment variables:
   ```bash
   JOTFORM_WEBHOOK_SECRET=your_secret_here
   ```
3. The API will automatically verify incoming webhooks

## Rate Limits
- **General webhooks**: 30 requests per minute per IP
- **Burst allowance**: 50 requests in 10 seconds
- **Rate limit headers**: Check `X-RateLimit-*` headers in responses

## Support
For issues with JotForm integration:
- Check the [API Documentation](http://localhost:3000/api/docs)
- Review [JotForm Webhook Documentation](https://www.jotform.com/help/390-how-to-setup-webhooks)
- Contact support: support@rtocompliancehub.com

## Example Form Configuration

### Sample JotForm Setup
```json
{
  "form_id": "231234567890",
  "fields": [
    {
      "name": "type",
      "type": "hidden",
      "default_value": "learner"
    },
    {
      "name": "courseId",
      "type": "dropdown",
      "label": "Course Completed"
    },
    {
      "name": "trainerId",
      "type": "dropdown",
      "label": "Trainer Name"
    },
    {
      "name": "rating",
      "type": "scale",
      "label": "Overall Rating",
      "min": 1,
      "max": 5
    },
    {
      "name": "comments",
      "type": "textarea",
      "label": "Additional Comments"
    }
  ]
}
```

## Testing Checklist
- [ ] Webhook URL configured in JotForm
- [ ] Form fields mapped correctly
- [ ] Test submission sent and received
- [ ] Data appears in RTO Compliance Hub
- [ ] Webhook logs show successful delivery
- [ ] Rate limiting tested and understood
- [ ] Security practices implemented

## Next Steps
- Set up [Email Notifications](./email-notifications.md) for new feedback
- Configure [AI Sentiment Analysis](./ai-analysis.md) for feedback insights
- Explore [Feedback Analytics](./feedback-analytics.md) dashboard
