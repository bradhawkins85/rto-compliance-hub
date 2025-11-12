# Audit Logging System - Test Plan

## Manual Testing Checklist

### Prerequisites
- [ ] Database is running and seeded with test data
- [ ] Server is running (`npm run dev:server`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Test user with SystemAdmin or ComplianceAdmin role exists
- [ ] Authentication token is valid

### 1. Authentication Events Logging
- [ ] **Test Login Success**
  1. Navigate to login page
  2. Enter valid credentials
  3. Check audit logs for `login` action with `Auth` entity type
  4. Verify user ID, timestamp, and IP address are captured

- [ ] **Test Login Failure**
  1. Attempt login with invalid credentials
  2. Check audit logs for `login_failed` action
  3. Verify IP address and user agent are captured

- [ ] **Test Logout**
  1. Click logout button
  2. Check audit logs for `logout` action
  3. Verify timestamp and user info

### 2. Policy Operations Logging
- [ ] **Test Policy Creation**
  1. Navigate to Policies view
  2. Create a new policy with title "Test Audit Policy"
  3. Navigate to Audit Logs view
  4. Filter by `entityType=Policy` and `action=create`
  5. Verify log entry exists with policy details in changes field
  6. Verify no sensitive data is exposed

- [ ] **Test Policy Update**
  1. Edit an existing policy
  2. Change the title or status
  3. Check audit logs for `update` action
  4. Verify `before` and `after` states are captured in changes field
  5. Verify before state shows old values
  6. Verify after state shows new values

- [ ] **Test Policy Publication**
  1. Publish a draft policy
  2. Check audit logs for `publish` action
  3. Verify version information is captured

### 3. User Management Logging
- [ ] **Test User Creation**
  1. Create a new user
  2. Check audit logs for `create` action with `User` entity type
  3. Verify password is NOT in the changes field (should be [REDACTED])
  4. Verify other user details are captured

- [ ] **Test User Update**
  1. Update user department or status
  2. Check audit logs for `update` action
  3. Verify before/after states captured
  4. Verify no password field in logs

- [ ] **Test Role Change**
  1. Add or remove a role from a user
  2. Check audit logs for `add_role` or `remove_role` action
  3. Verify role details are captured

### 4. Integration Sync Logging
- [ ] **Test Xero Sync**
  1. Trigger Xero employee sync
  2. Check audit logs for `sync` action with `XeroSync` entity type
  3. Verify sync results (employees created/updated/failed) are logged
  4. Verify no access tokens in logs

- [ ] **Test Accelerate Sync**
  1. Trigger Accelerate LMS sync
  2. Check audit logs for `sync` action with `AccelerateSync` entity type
  3. Verify sync type and initiation are logged

### 5. Asset Management Logging
- [ ] **Test Asset Creation**
  1. Create a new asset
  2. Check audit logs for `create` action with `Asset` entity type

- [ ] **Test Asset Service Event**
  1. Log a service event for an asset
  2. Check audit logs for `update` or `service` action
  3. Verify service details are captured

### 6. Complaint Logging
- [ ] **Test Complaint Creation**
  1. Create a new complaint
  2. Check audit logs for `create` action with `Complaint` entity type
  3. Verify complaint details captured

- [ ] **Test Complaint Status Change**
  1. Change complaint status from New to InReview
  2. Check audit logs for `update` action
  3. Verify status change captured in before/after

### 7. Audit Log Viewer Features

#### Search and Filter
- [ ] **Test Search**
  1. Enter search term in search box (e.g., user email)
  2. Verify results are filtered
  3. Clear search and verify all logs appear

- [ ] **Test Action Filter**
  1. Select "create" from action filter
  2. Verify only create actions shown
  3. Try other actions (update, delete, login)

- [ ] **Test Entity Type Filter**
  1. Select "Policy" from entity type filter
  2. Verify only policy-related logs shown
  3. Try other entity types

- [ ] **Test Date Range Filter**
  1. Set date range for today
  2. Verify only today's logs shown
  3. Set date range for yesterday
  4. Verify no logs shown (or only yesterday's logs)

- [ ] **Test Combined Filters**
  1. Apply multiple filters (action + entity type + date range)
  2. Verify results match all criteria
  3. Clear filters and verify all logs appear

#### Pagination
- [ ] **Test Pagination**
  1. Verify page 1 shows first 20 logs
  2. Click "Next" button
  3. Verify page 2 shows next 20 logs
  4. Click "Previous" button
  5. Verify back on page 1

#### Statistics Dashboard
- [ ] **Test Stats Display**
  1. Verify "Total Logs" card shows correct count
  2. Verify "Most Common Action" shows most frequent action
  3. Verify "Most Active Entity" shows entity type with most logs
  4. Verify "Top User Activity" shows highest log count

#### Detailed Log View
- [ ] **Test Log Detail Modal**
  1. Click "View" on any log entry
  2. Verify modal opens with full details
  3. Verify timestamp, user, action, entity displayed
  4. Verify IP address and user agent displayed
  5. Verify changes field shows JSON with proper formatting
  6. Verify sensitive data is [REDACTED]
  7. Click X to close modal

### 8. Export Functionality
- [ ] **Test CSV Export**
  1. Click "Export CSV" button
  2. Verify file downloads with name like `audit-logs-2024-11-12T...csv`
  3. Open CSV file
  4. Verify columns: id, timestamp, user, userEmail, department, action, entityType, entityId, ipAddress, userAgent, changes
  5. Verify data is properly formatted
  6. Verify sensitive data is excluded

- [ ] **Test Export with Filters**
  1. Apply filters (e.g., action=create)
  2. Click "Export CSV"
  3. Open exported file
  4. Verify only filtered logs are exported

- [ ] **Test Export Logging**
  1. Perform an export
  2. Check audit logs for `export` action
  3. Verify export details captured (format, filters)

### 9. Sensitive Data Protection
- [ ] **Test Password Redaction**
  1. Check any log with user creation/update
  2. Search for "password" in changes field
  3. Verify value is [REDACTED]

- [ ] **Test Token Redaction**
  1. Check logs related to authentication
  2. Search for "accessToken", "refreshToken"
  3. Verify values are [REDACTED]

- [ ] **Test API Key Redaction**
  1. Check logs related to integrations
  2. Search for "apiKey", "secret"
  3. Verify values are [REDACTED]

### 10. Performance Testing
- [ ] **Test with Large Dataset**
  1. Generate 1000+ audit logs (script or manual)
  2. Navigate to audit logs view
  3. Verify page loads within 2 seconds
  4. Test pagination performance
  5. Test filter performance
  6. Test export with large dataset (may take longer)

- [ ] **Test Concurrent Operations**
  1. Perform multiple operations simultaneously
  2. Verify all are logged correctly
  3. Verify no logs are missing
  4. Verify timestamps are accurate

### 11. Immutability Verification
- [ ] **Verify No Update Endpoint**
  1. Try to make PUT/PATCH request to `/api/v1/audit-logs/:id`
  2. Verify 404 or 405 response (route doesn't exist)

- [ ] **Verify No Delete Endpoint**
  1. Try to make DELETE request to `/api/v1/audit-logs/:id`
  2. Verify 404 or 405 response (route doesn't exist)

### 12. Access Control
- [ ] **Test Unauthorized Access**
  1. Logout or use token without proper roles
  2. Try to access `/api/v1/audit-logs`
  3. Verify 401 or 403 response

- [ ] **Test Role-Based Access**
  1. Login with Trainer role (no audit log access)
  2. Navigate to Audit Logs (should not be visible)
  3. Try direct API access
  4. Verify 403 Forbidden response

- [ ] **Test Admin Access**
  1. Login with SystemAdmin role
  2. Verify audit logs menu item is visible
  3. Verify can view all logs
  4. Verify can export logs

## Expected Results Summary
- ✅ All critical actions are logged automatically
- ✅ Logs cannot be modified or deleted
- ✅ User, timestamp, action, and changes are captured
- ✅ Sensitive data (passwords, tokens) is redacted
- ✅ Search and filter work correctly
- ✅ Export produces valid CSV files
- ✅ IP address and user agent are captured
- ✅ Performance is acceptable (<2s page load)
- ✅ Access control is enforced
- ✅ UI is responsive and user-friendly

## Bug Reporting Template
```
**Test Case**: [Name of test case]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**: 
**Actual Result**: 
**Screenshots**: [if applicable]
**Browser/Environment**: 
**Severity**: [Critical/High/Medium/Low]
```

## Automated Testing Notes
While this is a manual test plan, the following areas could benefit from automated tests:
1. Sensitive data filtering function
2. Audit log creation in various scenarios
3. API endpoint responses
4. Filter and search logic
5. Export file generation
6. Permission checks

Consider adding automated tests in future sprints.
