# Xero Payroll Integration

This document describes the Xero Payroll integration for automated employee synchronization.

## Overview

The Xero integration enables automatic synchronization of employee data from Xero Payroll to the RTO Compliance Hub. This ensures that staff records are always up-to-date with the organization's payroll system.

## Features

- **OAuth2 Authentication** - Secure authentication with Xero using OAuth 2.0
- **Encrypted Token Storage** - Access and refresh tokens stored encrypted in database
- **Automatic Token Refresh** - Tokens refreshed automatically before expiration
- **Employee Synchronization** - Fetch and sync employees from Xero Payroll
- **Duplicate Detection** - Smart matching by email or Xero employee ID
- **Scheduled Sync** - Daily automatic sync at 2:00 AM
- **Manual Sync** - Admin-triggered sync on demand
- **Audit Logging** - All sync operations logged for compliance
- **Admin Notifications** - Automatic notifications on sync failures

## Setup

### 1. Xero Application Setup

1. Go to [Xero Developer Portal](https://developer.xero.com/)
2. Create a new app or use existing app
3. Add OAuth 2.0 redirect URI: `http://your-domain.com/api/v1/sync/xero/callback`
4. Note down your Client ID and Client Secret
5. Enable the following scopes:
   - `openid`
   - `profile`
   - `email`
   - `accounting.transactions`
   - `accounting.settings`
   - `payroll.employees`
   - `payroll.payruns`
   - `offline_access`

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# Encryption key for token storage
# ⚠️ IMPORTANT: Generate a UNIQUE key for each environment
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Never reuse this key across environments or commit it to version control
ENCRYPTION_KEY="your-32-byte-hex-encryption-key"

# Xero OAuth credentials
XERO_CLIENT_ID="your-xero-client-id"
XERO_CLIENT_SECRET="your-xero-client-secret"
# ⚠️ UPDATE for production: Use your production domain instead of localhost
XERO_REDIRECT_URI="http://localhost:3000/api/v1/sync/xero/callback"
```

### 3. Database Migration

Run Prisma migrations to add Xero tables:

```bash
npm run db:migrate
```

This creates the following tables:
- `xero_connections` - Stores OAuth tokens and connection info
- `xero_employee_mappings` - Maps Xero employees to internal users
- `xero_sync_logs` - Tracks sync history and results

### 4. Permissions Setup

Ensure the following permissions exist in your database:
- `sync:create` - Create/trigger syncs
- `sync:read` - View sync status and history
- `sync:delete` - Disconnect integrations

Assign these permissions to the SystemAdmin role.

## Usage

### Connecting to Xero

1. **Get Authorization URL**
   ```bash
   GET /api/v1/sync/xero/authorize
   ```
   Returns an authorization URL to redirect the user to.

2. **Complete OAuth Flow**
   - User is redirected to Xero to grant permissions
   - After approval, Xero redirects back to callback URL
   - Tokens are automatically stored encrypted

3. **Verify Connection**
   ```bash
   GET /api/v1/sync/xero/test
   ```
   Tests the connection and returns tenant information.

### Manual Sync

Trigger a manual sync:
```bash
POST /api/v1/sync/xero
Authorization: Bearer <your-jwt-token>
```

Response:
```json
{
  "message": "Sync completed successfully",
  "result": {
    "employeesCreated": 5,
    "employeesUpdated": 10,
    "employeesFailed": 0,
    "errors": []
  }
}
```

### Check Sync Status

Get current connection and last sync status:
```bash
GET /api/v1/sync/xero/status
Authorization: Bearer <your-jwt-token>
```

### View Sync History

Get recent sync history:
```bash
GET /api/v1/sync/xero/history?limit=10
Authorization: Bearer <your-jwt-token>
```

### Disconnect

Deactivate the Xero connection:
```bash
DELETE /api/v1/sync/xero
Authorization: Bearer <your-jwt-token>
```

## Automatic Sync Schedule

The system automatically syncs employees from Xero every day at 2:00 AM (Australia/Sydney timezone). This can be configured in `server/src/services/scheduler.ts`.

### Sync Process

1. **Fetch Employees** - Retrieve all employees from Xero Payroll API
2. **Match Existing Users** - Check if employee already exists by:
   - Xero employee ID (stored in user record)
   - Email address (fallback)
3. **Create or Update** - 
   - Create new user if no match found
   - Update existing user with latest data from Xero
4. **Map Departments** - Job titles are mapped to internal departments:
   - "Trainer/Instructor" → Training
   - "Admin/Manager" → Admin
   - "Director/Executive" → Management
   - Other → Support
5. **Log Results** - Record sync outcome in `xero_sync_logs`
6. **Notify Admins** - If failures occur, send notifications

## Data Mapping

### Xero Employee → User

| Xero Field | User Field | Notes |
|------------|------------|-------|
| employeeID | xeroEmployeeId | Unique identifier for matching |
| email | email | Primary duplicate detection |
| firstName + lastName | name | Combined full name |
| jobTitle | department | Mapped to internal department |
| - | status | Set to "Active" |
| - | password | Set to null (requires password reset)* |

*New users created from Xero sync will need to complete a password reset flow before they can log in. The system should send a password reset email to the user's email address upon creation. Implement password reset notifications in your notification service.

## Security Considerations

1. **Encrypted Tokens** - OAuth tokens are encrypted using AES-256-GCM before storage
2. **Token Refresh** - Tokens automatically refreshed 5 minutes before expiration
3. **RBAC Protection** - All endpoints require authentication and appropriate permissions
4. **Audit Logging** - All sync operations logged with user ID and timestamp
5. **Rate Limiting** - API rate limiting applied to all endpoints

## Troubleshooting

### Connection Issues

If connection fails:
1. Verify `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are correct
2. Check redirect URI matches exactly in Xero app settings
3. Ensure required scopes are enabled in Xero app
4. Check that Xero app is not in development mode (if using production)

### Sync Failures

If sync fails:
1. Check `xero_sync_logs` table for detailed error messages
2. Verify Xero connection is still active (`GET /api/v1/sync/xero/status`)
3. Test connection (`GET /api/v1/sync/xero/test`)
4. Check Xero API status at [status.xero.com](https://status.xero.com)

### Token Expiration

Tokens are automatically refreshed. If manual intervention is needed:
1. Re-authorize the connection through `/api/v1/sync/xero/authorize`
2. Complete OAuth flow again

### Duplicate Employees

If duplicate employees are created:
1. Check email addresses in Xero match exactly
2. Verify `xeroEmployeeId` is being stored correctly
3. Manually merge duplicates in database if needed

## API Reference

See [API_INTEGRATION.md](./API_INTEGRATION.md) for complete API documentation.

## Support

For issues or questions:
1. Check the sync logs: `SELECT * FROM xero_sync_logs ORDER BY started_at DESC LIMIT 10`
2. Review notifications: `SELECT * FROM notifications WHERE title LIKE '%Xero%'`
3. Contact system administrator

## Notes

- **Xero API Regions**: The integration uses Xero Payroll AU API by default. To support other regions:
  - **UK**: Replace `xero.payrollAUApi` with `xero.payrollUKApi` in `server/src/services/xeroSync.ts`
  - **US**: Replace `xero.payrollAUApi` with `xero.payrollUSApi`
  - **NZ**: Use `xero.payrollNZApi`
  - Each region has slightly different employee data structures - review Xero API docs for your region
  - You may need to adjust the employee field mappings in the `syncEmployees` function
- Sync can be manually triggered at any time by admins
- Failed syncs do not stop the scheduled sync from running next day
- Token encryption uses AES-256-GCM - ensure ENCRYPTION_KEY is kept secure and backed up
