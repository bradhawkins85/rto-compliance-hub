# Accelerate LMS Integration Services

This directory contains services for integrating with the Accelerate LMS API.

## Files

### `accelerate.ts`
API client for communicating with Accelerate LMS. Handles:
- API authentication with Bearer token
- Rate limiting (1 request per second)
- Error handling and retry logic
- Fetching trainers, students, enrollments, and completions

### `accelerateSync.ts`
Synchronization service that handles:
- Syncing trainers to internal User records
- Syncing students to AccelerateStudent records
- Syncing enrollments and linking to TrainingProducts
- Conflict resolution and data mapping
- Audit logging of sync operations

### `scheduler.ts`
Job scheduler service that:
- Schedules daily Accelerate sync at 3:00 AM
- Manages scheduled job lifecycle
- Updates job status in database
- Handles graceful shutdown

## Configuration

Set these environment variables in `.env`:

```bash
ACCELERATE_API_URL="https://api.acceleratelms.com/v1"
ACCELERATE_API_KEY="your-api-key-here"
ACCELERATE_ORGANIZATION_ID="your-org-id"
```

## API Endpoints

### Test Connection
```
GET /api/v1/sync/accelerate/test
```

### Trigger Manual Sync
```
POST /api/v1/sync/accelerate
Body: { "syncType": "trainers" | "students" | "enrollments" | "full" }
```

### Get Sync Status
```
GET /api/v1/sync/accelerate/status
```

### Get Sync Statistics
```
GET /api/v1/sync/accelerate/stats
```

### Get Students
```
GET /api/v1/sync/accelerate/students
```

### Get Enrollments
```
GET /api/v1/sync/accelerate/enrollments
```

## Database Schema

### AccelerateSyncLog
Tracks each sync operation with:
- Sync type (trainers, students, enrollments, full)
- Status (Running, Completed, Failed)
- Record counts (total, synced, failed)
- Error messages and metadata

### AccelerateMapping
Maps Accelerate IDs to internal IDs:
- accelerateId: ID in Accelerate system
- internalId: ID in our system
- accelerateType/internalType: Entity types

### AccelerateStudent
Stores student data from Accelerate:
- Basic info (name, email, phone)
- Enrollment status
- Metadata from Accelerate

### AccelerateEnrollment
Stores enrollment data:
- Student and course references
- Enrollment dates and status
- Completion information
- Links to TrainingProduct

## Usage

### Automatic Sync
The system automatically syncs data daily at 3:00 AM when the server is running.

### Manual Sync
Trigger a sync via the API:

```typescript
// Full sync (all data types)
POST /api/v1/sync/accelerate
{ "syncType": "full" }

// Sync only trainers
POST /api/v1/sync/accelerate
{ "syncType": "trainers" }
```

### Monitoring
Check sync status:

```typescript
// Get recent sync logs
GET /api/v1/sync/accelerate/status

// Get overall statistics
GET /api/v1/sync/accelerate/stats
```

## Error Handling

- API errors are logged and tracked in AccelerateSyncLog
- Individual record failures don't stop the sync
- Failed records are counted separately
- Detailed error messages are available in sync logs

## Rate Limiting

The client enforces a minimum 1-second delay between API requests to respect rate limits.

## Data Mapping

### Trainers → Users
- Creates User records with department="Training"
- Assigns "Trainer" role
- Creates AccelerateMapping for future updates
- Status: 'active' in Accelerate → 'Active' in our system

### Students → AccelerateStudent
- Stores all student data in AccelerateStudent table
- Maintains link to Accelerate via accelerateId
- Does not create User records (students are external)

### Enrollments → AccelerateEnrollment
- Links to AccelerateStudent via studentId
- Links to TrainingProduct via courseId mapping
- Tracks completion status and dates

## Conflict Resolution

When syncing:
1. Check for existing mapping via accelerateId
2. If exists, update internal record
3. If not exists, create new record and mapping
4. Log all changes for audit trail
