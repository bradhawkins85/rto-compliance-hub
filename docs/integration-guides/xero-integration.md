# Xero Integration Guide

## Overview
This guide explains how to integrate Xero accounting software with the RTO Compliance Hub for automated staff and payroll synchronization.

## Prerequisites
- Xero organization with API access
- Admin or SystemAdmin role in RTO Compliance Hub
- Xero OAuth 2.0 credentials

## Step 1: Create Xero OAuth App

1. **Login to Xero Developer Portal**: Visit [https://developer.xero.com/](https://developer.xero.com/)
2. **Create a new app**:
   - App name: "RTO Compliance Hub"
   - Company/Application URL: Your domain
   - OAuth 2.0 redirect URI: `https://api.rtocompliancehub.com/api/v1/sync/xero/callback`
3. **Save your credentials**:
   - Client ID
   - Client Secret

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Xero Configuration
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=https://api.rtocompliancehub.com/api/v1/sync/xero/callback
XERO_SCOPES=accounting.transactions,accounting.contacts,payroll.employees
XERO_TENANT_ID=your_tenant_id_here
```

## Step 3: Authorize the Connection

### Initial Authorization
```bash
# Navigate to the authorization URL
GET /api/v1/sync/xero/authorize
```

This will redirect you to Xero's OAuth consent screen. After authorizing:
1. You'll be redirected back to the callback URL
2. The access and refresh tokens will be stored securely
3. You'll see a confirmation message

### Verify Connection
```bash
# Check Xero connection status
GET /api/v1/sync/xero/status
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected response:
```json
{
  "connected": true,
  "tenantName": "Your RTO Name",
  "tenantId": "abc-123-def-456",
  "lastSync": "2025-11-13T10:30:00Z",
  "expiresAt": "2025-11-13T11:30:00Z"
}
```

## Step 4: Configure Synchronization

### Manual Sync
Trigger a manual synchronization:

```bash
POST /api/v1/sync/xero
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "syncType": "full"  # Options: "full", "employees", "payroll"
}
```

Response:
```json
{
  "jobId": "job_abc123",
  "message": "Sync job queued successfully",
  "status": "queued"
}
```

### Automatic Sync Schedule
By default, Xero sync runs:
- **Daily at 2:00 AM**: Full employee sync
- **Hourly**: Incremental updates for changes

Configure custom schedule in environment:
```bash
XERO_SYNC_SCHEDULE="0 2 * * *"  # Cron format
```

## Step 5: Data Mapping

### Employee to User Mapping
Xero employee data maps to RTO Compliance Hub users:

| Xero Field | RTO Hub Field | Notes |
|------------|---------------|-------|
| `EmployeeID` | `xeroEmployeeId` | External ID reference |
| `FirstName` + `LastName` | `name` | Combined full name |
| `Email` | `email` | Primary identifier |
| `JobTitle` | `department` | Mapped to department enum |
| `Status` | `status` | Active/Inactive |

### Department Mapping
Configure department mapping:

```json
{
  "Trainer": ["Training Officer", "Instructor", "Assessor"],
  "Admin": ["Administrative Officer", "Office Manager"],
  "Management": ["General Manager", "Operations Manager", "Compliance Manager"],
  "Support": ["Support Officer", "Coordinator"]
}
```

## Step 6: Monitor Sync Activity

### View Sync History
```bash
GET /api/v1/sync/xero/history
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Response:
```json
{
  "syncs": [
    {
      "id": "sync_123",
      "type": "full",
      "status": "completed",
      "startedAt": "2025-11-13T02:00:00Z",
      "completedAt": "2025-11-13T02:05:32Z",
      "employeesProcessed": 45,
      "employeesCreated": 2,
      "employeesUpdated": 5,
      "errors": []
    }
  ]
}
```

### Check Sync Job Status
```bash
GET /api/v1/jobs/{jobId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Troubleshooting

### Common Issues

#### 1. Authorization Failed
**Symptoms**: 401 Unauthorized errors
**Solutions**:
- Verify Client ID and Secret are correct
- Check redirect URI matches exactly
- Ensure all required scopes are granted
- Re-authorize if tokens expired

#### 2. Sync Fails
**Symptoms**: Sync job completes with errors
**Solutions**:
- Check Xero API rate limits (60 requests per minute)
- Verify tenant ID is correct
- Ensure employee data is valid in Xero
- Review error logs for specific issues

#### 3. Duplicate Users
**Symptoms**: Multiple users created for same employee
**Solutions**:
- Use email as primary identifier
- Check for email mismatches in Xero
- Manually merge duplicate accounts
- Enable strict email validation

#### 4. Missing Employees
**Symptoms**: Not all employees synced
**Solutions**:
- Verify employees are marked as Active in Xero
- Check email addresses are populated
- Ensure employees have required fields
- Review sync logs for skipped records

## Security Best Practices

1. **Token Management**
   - Refresh tokens are stored encrypted
   - Access tokens auto-refresh before expiry
   - Never log or expose tokens

2. **API Access**
   - Use minimum required scopes
   - Regularly review access permissions
   - Audit API usage monthly

3. **Data Privacy**
   - Only sync necessary employee data
   - Comply with privacy regulations
   - Document data retention policies

## Rate Limits

Xero API limits:
- **Requests**: 60 per minute per tenant
- **Burst**: 100 requests in 60 seconds
- **Daily**: 5,000 requests per day

RTO Hub handles rate limiting automatically:
- Implements exponential backoff
- Queues requests during high load
- Provides rate limit status in responses

## Advanced Configuration

### Custom Field Mapping
Override default field mappings:

```typescript
// In server environment config
XERO_FIELD_MAPPING={
  "customField1": "department",
  "customField2": "employeeNumber"
}
```

### Selective Sync
Sync only specific employee types:

```bash
POST /api/v1/sync/xero
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "syncType": "employees",
  "filters": {
    "jobTitle": ["Trainer", "Assessor"],
    "status": "Active"
  }
}
```

### Webhook Integration
Enable real-time updates from Xero:

1. Configure webhook in Xero Developer Portal
2. Set webhook URL: `https://api.rtocompliancehub.com/api/v1/webhooks/xero`
3. Subscribe to events: `EMPLOYEE.CREATE`, `EMPLOYEE.UPDATE`

## Support Resources

- **Xero API Documentation**: [https://developer.xero.com/documentation/](https://developer.xero.com/documentation/)
- **RTO Hub API Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Support Email**: support@rtocompliancehub.com

## Testing Checklist

- [ ] Xero OAuth app created
- [ ] Environment variables configured
- [ ] Authorization completed successfully
- [ ] Connection status verified
- [ ] Manual sync tested
- [ ] Employees appear in RTO Hub
- [ ] Department mapping verified
- [ ] Automatic sync scheduled
- [ ] Error handling tested
- [ ] Rate limiting understood

## Next Steps

- Configure [Email Notifications](./email-notifications.md) for sync issues
- Set up [Audit Logging](./audit-logging.md) for compliance
- Explore [Staff Dashboard](../features/staff-dashboard.md)
