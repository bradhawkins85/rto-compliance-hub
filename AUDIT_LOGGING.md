# Audit Logging System

## Overview
The audit logging system tracks all critical actions in the RTO Compliance Hub. All logs are immutable and retained for compliance purposes.

## Features

### Comprehensive Logging
- **Authentication Events**: Login, logout, password changes, failed attempts
- **Data Changes**: Create, update, delete operations on all entities
- **Policy Management**: Policy creation, updates, publication, version control
- **User Management**: User creation, role changes, permission updates
- **Credentials**: Staff credential additions, updates, expirations
- **Professional Development**: PD completions, verifications
- **Complaints**: Status changes, assignments, resolutions
- **Assets**: Service events, state transitions
- **Integrations**: Xero sync, Accelerate sync, Google Drive operations
- **Data Exports**: All data export operations

### Security Features
1. **Immutability**: Audit logs can only be created, never updated or deleted
2. **Sensitive Data Protection**: Automatic filtering of:
   - Passwords
   - Access tokens and refresh tokens
   - API keys
   - Encryption keys
   - Private keys
   - Any field containing "password", "token", "secret", "key" in its name
3. **Context Capture**: Every log includes:
   - User ID and details
   - Timestamp
   - Action performed
   - Entity type and ID
   - Before/after state (for updates)
   - IP address
   - User agent

### Access Control
- Viewing audit logs requires `SystemAdmin` or `ComplianceAdmin` role
- Export functionality requires specific `audit_logs:export` permission
- All audit log operations are themselves logged

## API Endpoints

### List Audit Logs
```
GET /api/v1/audit-logs
```
Query Parameters:
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 20)
- `userId`: Filter by user ID
- `action`: Filter by action (create, update, delete, read, login, logout, sync, export)
- `entityType`: Filter by entity type (Policy, User, Credential, etc.)
- `entityId`: Filter by specific entity ID
- `dateFrom`: Filter by start date (ISO 8601)
- `dateTo`: Filter by end date (ISO 8601)
- `q`: Search query (searches action, entity type, entity ID, IP address)

### Get Audit Log
```
GET /api/v1/audit-logs/:id
```

### Get Entity Audit Logs
```
GET /api/v1/audit-logs/entity/:entityType/:entityId
```
Returns all audit logs for a specific entity.

### Get Statistics
```
GET /api/v1/audit-logs/stats
```
Returns aggregated statistics:
- Total log count
- Action counts
- Entity type counts
- Top users by activity

Query Parameters:
- `dateFrom`: Start date for statistics
- `dateTo`: End date for statistics

### Export Audit Logs
```
GET /api/v1/audit-logs/export
```
Exports filtered audit logs to CSV format.

Query Parameters: Same as list endpoint, plus:
- `format`: Export format (csv, pdf, excel) - currently only CSV supported

## Usage

### Backend - Manual Logging
```typescript
import { createAuditLog } from '../middleware/audit';

await createAuditLog(
  userId,
  'create',
  'Policy',
  policyId,
  { title, status, changes... },
  req.ip || req.socket.remoteAddress,
  req.headers['user-agent']
);
```

### Backend - Middleware
```typescript
import { auditCrudOperation } from '../middleware/audit';

// Add to route
router.patch(
  '/:id',
  authenticate,
  auditCrudOperation(
    'Policy',
    (req) => req.params.id,
    async (req) => {
      // Return entity state before modification
      return await prisma.policy.findUnique({ where: { id: req.params.id } });
    }
  ),
  updatePolicy
);
```

### Frontend - Viewing Logs
Navigate to "Audit Logs" in the main navigation. The viewer provides:
- Table view of all logs
- Statistics dashboard
- Search and filter functionality
- Detailed log viewer
- CSV export

## Data Retention

### Policy
Audit logs are retained for **7+ years** as per compliance requirements:
- Logs are never deleted programmatically
- Database backup procedures include audit logs
- Consider archiving strategy for logs older than 7 years

### Implementation
1. Regular database backups include audit_logs table
2. No delete operations permitted on audit_logs table
3. Archive strategy should be implemented for logs older than 7 years to manage database size

## Performance Considerations

### Async Logging
All audit logging is performed asynchronously to minimize impact on request performance:
```typescript
createAuditLog(...).catch(err => console.error('Audit log error:', err));
```

### Indexing
The audit_logs table includes indexes on:
- `userId`
- `entityType` + `entityId` (composite)
- `createdAt`

### Database Growth
- Expect ~100-1000 logs per day depending on activity
- Plan for ~365,000 logs per year
- Monitor table size and query performance
- Consider partitioning by date for large datasets

## Compliance

### Standards Covered
- ISO 27001: Information security audit trails
- RTO Standards: Record keeping and audit requirements
- Privacy regulations: User activity tracking and data access logs

### Audit Trail Requirements
✅ Who: User identified by ID, name, email, department
✅ What: Action and entity type
✅ When: Timestamp (ISO 8601, UTC)
✅ Where: IP address captured
✅ Why: Context in changes field
✅ Before/After: State captured for updates
✅ Immutable: Cannot be modified or deleted

## Troubleshooting

### Logs Not Appearing
1. Check user has required permissions (SystemAdmin or ComplianceAdmin)
2. Verify authentication token is valid
3. Check date filters are not excluding recent logs
4. Verify database connection

### Export Failing
1. Check user has `audit_logs:export` permission
2. Verify query filters are valid
3. Check server has write permissions for temporary files
4. Monitor memory usage for large exports

### Performance Issues
1. Add indexes if querying large datasets
2. Use date filters to limit query scope
3. Consider pagination limits (default 20, max 100)
4. Archive old logs if table is very large

## Future Enhancements
- [ ] PDF export format
- [ ] Excel export format
- [ ] Real-time log streaming for security monitoring
- [ ] Automated anomaly detection
- [ ] Alert system for suspicious activities
- [ ] Log retention automation (archive after 7 years)
- [ ] Advanced search with query builder
- [ ] Saved filters and searches
- [ ] Log aggregation and reporting
- [ ] Integration with SIEM systems
