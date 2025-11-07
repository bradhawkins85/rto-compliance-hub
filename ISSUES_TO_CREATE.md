# GitHub Issues to Create - RTO Compliance Hub Gap Analysis

**Date**: November 7, 2025  
**Source**: GAP_ANALYSIS.md and MISSING_FUNCTIONS_SUMMARY.md  
**Total Issues**: 25  
**Purpose**: Track implementation of missing features identified in gap analysis

---

## Instructions for Creating Issues

Each section below represents one GitHub issue that should be created. The issues are numbered in the order they should be processed based on dependencies and priority.

**To create each issue:**
1. Copy the title (including the number)
2. Copy the full description including acceptance criteria
3. Add the priority label indicated
4. Add the estimated effort as a comment or in the description

---

## Issue #1: Set up PostgreSQL database with Prisma ORM

**Priority**: 🔴 Critical  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `infrastructure`, `critical`, `backend`, `database`

### Description

Establish the foundational database infrastructure for the RTO Compliance Hub platform. This includes setting up PostgreSQL, configuring Prisma ORM, defining the complete database schema, and creating migration systems.

### Missing Components

- PostgreSQL database setup and configuration
- Prisma ORM installation and configuration
- Database schema covering 22+ tables:
  - `users`, `roles`, `permissions`, `user_roles`
  - `policies`, `policy_versions`, `policy_standard_mappings`
  - `standards`
  - `training_products`, `sops`, `training_product_sops`
  - `staff`, `credentials`, `pd_items`
  - `feedback`
  - `assets`, `asset_services`
  - `complaints`, `complaint_timeline`
  - `evidence`, `notifications`, `jobs`, `audit_logs`
- Migration system setup with version control
- Seed data scripts for initial data
- Connection pooling configuration

### Acceptance Criteria

- ✅ PostgreSQL database is running and accessible
- ✅ Prisma schema is defined and matches all requirements from PRD
- ✅ Initial migration successfully creates all tables
- ✅ Seed script populates RTO standards (29+ standards) and default roles
- ✅ Database can be reset and re-seeded for development
- ✅ Connection pooling is properly configured
- ✅ Schema includes proper indexes for performance
- ✅ Foreign key constraints are defined correctly
- ✅ Documentation includes setup instructions

### Technical Notes

- Use PostgreSQL 14+ for best performance
- Prisma schema should use strict mode
- Consider using UUIDs for primary keys
- Implement soft deletes where appropriate
- Plan for future scalability

---

## Issue #2: Implement JWT authentication and RBAC system

**Priority**: 🔴 Critical  
**Estimated Effort**: 100 hours (2.5 weeks)  
**Labels**: `security`, `critical`, `backend`, `authentication`

### Description

Implement a comprehensive authentication and authorization system using JWT tokens and role-based access control (RBAC). This is a foundational security requirement that must be completed before other API endpoints can be properly secured.

### Missing Functions

**API Endpoints**:
- `POST /api/v1/auth/login` - User authentication with JWT token generation
- `POST /api/v1/auth/logout` - Session termination
- `POST /api/v1/auth/refresh` - Token refresh mechanism
- `POST /api/v1/auth/reset-password` - Password reset flow
- `POST /api/v1/auth/change-password` - Password change

**Backend Components**:
- JWT token generation and validation
- Password hashing using bcrypt
- RBAC middleware for route protection
- Permission checking utilities
- Session management
- Token refresh logic

**User Roles to Define**:
- `SystemAdmin` - Full system access
- `ComplianceAdmin` - Compliance management and reporting
- `Manager` - Staff oversight and approvals
- `Trainer` - Training and professional development
- `Staff` - Limited self-service access

### Acceptance Criteria

- ✅ Users can log in with email/password
- ✅ JWT tokens are issued with appropriate expiration
- ✅ Tokens are validated on every protected route
- ✅ Tokens can be refreshed before expiration
- ✅ All API routes are protected by auth middleware
- ✅ RBAC correctly limits access based on user roles
- ✅ Password reset flow works end-to-end with email
- ✅ Passwords are hashed with bcrypt (minimum 10 rounds)
- ✅ All authentication events are logged in audit trail
- ✅ Failed login attempts are tracked and rate-limited
- ✅ Security headers are properly configured

### Security Requirements

- Implement rate limiting for login attempts
- Use secure HTTP-only cookies for token storage
- Implement CSRF protection
- Follow OWASP authentication best practices
- Token expiration: 15 minutes (access), 7 days (refresh)

---

## Issue #3: Create core API endpoints - Users and Policies

**Priority**: 🔴 Critical  
**Estimated Effort**: 120 hours (3 weeks)  
**Labels**: `backend`, `critical`, `api`, `users`, `policies`

### Description

Implement the core API endpoints for user management, policy management, and standards tracking. These endpoints form the foundation for most frontend features and must support CRUD operations, filtering, and relationships between entities.

### Missing API Endpoints

#### User Management
- `GET /api/v1/users` - List users with filters (department, role, search query)
- `POST /api/v1/users` - Create new user
- `GET /api/v1/users/{id}` - Get user details
- `PATCH /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Soft delete user
- `POST /api/v1/users/{id}/credentials` - Add credential to user
- `GET /api/v1/users/{id}/pd` - List professional development records

#### Policy Management
- `GET /api/v1/policies` - List policies with filters (standardId, status)
- `POST /api/v1/policies` - Create new policy
- `GET /api/v1/policies/{id}` - Get policy with full version history
- `PATCH /api/v1/policies/{id}` - Update policy metadata
- `POST /api/v1/policies/{id}/publish` - Publish new policy version
- `POST /api/v1/policies/{id}/map` - Map policy to standards
- `GET /api/v1/policies/{id}/versions` - Get version history

#### Standards
- `GET /api/v1/standards` - List all RTO standards
- `GET /api/v1/standards/{id}` - Get standard details
- `GET /api/v1/standards/{id}/mappings` - Get linked policies/SOPs/evidence

### Acceptance Criteria

- ✅ All endpoints return valid JSON responses
- ✅ All endpoints enforce authentication via JWT
- ✅ All endpoints enforce authorization via RBAC
- ✅ Input validation prevents invalid data entry
- ✅ Errors follow RFC 7807 Problem Details format
- ✅ API response time <500ms for 95th percentile
- ✅ Pagination works correctly for list endpoints
- ✅ Filtering and sorting work as specified
- ✅ All operations are logged in audit trail
- ✅ Database transactions are used for data consistency
- ✅ Soft deletes preserve data for audit purposes

### Technical Requirements

- Use RESTful conventions
- Implement proper HTTP status codes
- Support pagination (default 30, max 100 items)
- Implement field filtering (?fields=id,name)
- Support sorting (?sort=name:asc)
- Include proper CORS headers

---

## Issue #4: Create core API endpoints - Training and Professional Development

**Priority**: 🔴 Critical  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `backend`, `critical`, `api`, `training`, `pd`

### Description

Implement API endpoints for training product management, SOPs, and professional development tracking. These endpoints enable the core training and compliance workflows.

### Missing API Endpoints

#### Training Products & SOPs
- `GET /api/v1/training-products` - List all training products
- `POST /api/v1/training-products` - Create new training product
- `GET /api/v1/training-products/{id}` - Get product details with linked SOPs
- `PATCH /api/v1/training-products/{id}` - Update training product
- `POST /api/v1/training-products/{id}/sops` - Link SOPs to training product
- `GET /api/v1/sops` - List all SOPs
- `GET /api/v1/sops/{id}` - Get SOP details
- `POST /api/v1/sops` - Create new SOP
- `PATCH /api/v1/sops/{id}` - Update SOP

#### Professional Development
- `GET /api/v1/pd` - Query PD items with filters (userId, status, dueBefore)
- `POST /api/v1/pd` - Create new PD item
- `GET /api/v1/pd/{id}` - Get PD details
- `POST /api/v1/pd/{id}/complete` - Mark PD item as complete
- `POST /api/v1/pd/{id}/verify` - Manager verification of PD
- `GET /api/v1/credentials` - List all credentials
- `POST /api/v1/credentials` - Create new credential
- `PATCH /api/v1/credentials/{id}` - Update credential

### Acceptance Criteria

- ✅ All CRUD operations work correctly
- ✅ Training products can be linked to multiple SOPs
- ✅ PD workflow (create → complete → verify) functions properly
- ✅ Credential expiry dates are tracked automatically
- ✅ Status calculations work (planned, due, overdue, completed, verified)
- ✅ Due date calculations trigger status changes
- ✅ Notifications are triggered for upcoming/overdue items
- ✅ Evidence attachments can be linked to PD items
- ✅ Manager approvals update PD status correctly
- ✅ All endpoints follow authentication and authorization requirements

### Business Logic

- PD items show "Due" when within 30 days of due date
- PD items show "Overdue" when past due date
- Credentials show "Expiring" when within 30 days of expiry
- Training products marked "Incomplete" if missing required SOPs or assessments

---

## Issue #5: Frontend API integration - Replace all mock data

**Priority**: 🔴 Critical  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `frontend`, `critical`, `integration`

### Description

Replace all mock data in frontend views with real API calls. Implement proper error handling, loading states, and token management for seamless API integration.

### Missing Components

- API client service setup (using fetch or axios)
- Replace mock data in `OverviewView.tsx` with API calls
- Replace mock data in `StandardsView.tsx` with API calls
- Replace mock data in `PoliciesView.tsx` with API calls
- Replace mock data in `TrainingView.tsx` with API calls
- Replace mock data in `StaffView.tsx` with API calls
- Error handling UI components
- Loading state components (spinners, skeletons)
- JWT token storage and management
- Automatic token refresh on expiry
- API error interceptors

### Acceptance Criteria

- ✅ All views fetch real data from backend API
- ✅ Loading spinners/skeletons display during data fetch
- ✅ Error messages display clearly when API calls fail
- ✅ JWT token is stored securely (httpOnly cookie or secure storage)
- ✅ Token refresh works automatically before expiration
- ✅ No mock data remains in production code
- ✅ API calls are optimized to prevent unnecessary requests
- ✅ Proper React Query or similar caching is implemented
- ✅ Network errors are handled gracefully
- ✅ User is redirected to login on 401 Unauthorized

### Technical Implementation

- Use React Query for data fetching and caching
- Implement axios interceptors for token refresh
- Create reusable API hooks (useUsers, usePolicies, etc.)
- Implement optimistic updates where appropriate
- Add request/response logging in development mode

---

## Issue #6: Implement JotForm webhook integration

**Priority**: 🟠 High  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `integration`, `high`, `backend`, `feedback`

### Description

Implement webhook endpoint to receive and process form submissions from JotForm. This integration enables automated feedback collection from learners, employers, and industry stakeholders.

### Missing Functions

- `POST /api/v1/webhooks/jotform` - Webhook endpoint
- JotForm signature validation for security
- Payload parsing and field mapping
- Queue submission for async processing
- Support for multiple form types:
  - Learner feedback forms
  - Employer feedback forms
  - Industry feedback forms
  - SOP training completion forms
- Anonymous submission handling
- Duplicate submission detection
- Error handling and retry logic

### Acceptance Criteria

- ✅ Webhook successfully receives JotForm submissions
- ✅ Signature validation prevents unauthorized submissions
- ✅ Data is correctly parsed from JotForm payload
- ✅ Submissions are stored in database within 3 seconds
- ✅ Processing happens asynchronously via job queue
- ✅ Failed submissions are automatically retried
- ✅ Anonymous submissions properly exclude PII
- ✅ Duplicate submissions are detected and handled
- ✅ All webhook events are logged for debugging
- ✅ Different form types are correctly identified and processed

### Integration Details

- Configure JotForm webhook URL in JotForm dashboard
- Store JotForm API key securely in environment variables
- Implement rate limiting to prevent abuse
- Create mapping for each form type's field structure
- Test with sample submissions from each form type

---

## Issue #7: Implement Xero payroll sync integration

**Priority**: 🟠 High  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `integration`, `high`, `backend`, `hr`

### Description

Implement OAuth2 integration with Xero for automated staff synchronization. This enables automatic updates of staff records based on payroll data.

### Missing Functions

- `POST /api/v1/sync/xero` - Manual sync trigger endpoint
- Xero OAuth2 authentication flow
- Token refresh mechanism
- Fetch employees from Xero Payroll API
- Map Xero employees to internal staff records
- Sync positions and departments
- Duplicate detection by email or external ID
- Conflict resolution strategy
- Scheduled daily sync job
- Sync audit logging

### Acceptance Criteria

- ✅ OAuth2 flow successfully connects to Xero
- ✅ Access tokens are stored securely
- ✅ Token refresh works automatically
- ✅ Employee list syncs successfully from Xero
- ✅ New employees are created in database
- ✅ Existing employees are updated with changes
- ✅ Duplicates are detected and handled appropriately
- ✅ Sync runs automatically daily at 2:00 AM
- ✅ Manual sync trigger works for admins
- ✅ All sync operations are logged in audit trail
- ✅ Sync failures trigger notifications to admins
- ✅ Sync status is visible in admin dashboard

### Technical Requirements

- Use Xero Node SDK
- Store OAuth tokens encrypted in database
- Implement connection testing endpoint
- Create Xero employee ID to internal staff ID mapping table
- Handle rate limiting from Xero API
- Implement incremental sync (only changed records)

---

## Issue #8: Implement Accelerate API integration

**Priority**: 🟠 High  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `integration`, `high`, `backend`, `training`

### Description

Integrate with Accelerate LMS API to synchronize trainer and student data. This provides real-time access to enrollment information and training completion status.

### Missing Functions

- `POST /api/v1/sync/accelerate` - Manual sync trigger
- Accelerate API authentication
- Connection testing
- Fetch trainer list from Accelerate
- Fetch student enrollment data
- Fetch course completion data
- Map Accelerate users to internal staff/students
- Sync course enrollments
- Handle data conflicts
- Scheduled daily sync job
- Sync audit logging

### Acceptance Criteria

- ✅ API authentication successfully connects to Accelerate
- ✅ API key is stored securely
- ✅ Connection can be tested via admin interface
- ✅ Trainer list syncs successfully
- ✅ Student enrollment data syncs successfully
- ✅ Course completions are tracked
- ✅ Enrollments are linked to internal training products
- ✅ Sync runs automatically daily at 3:00 AM
- ✅ Manual sync trigger works for admins
- ✅ Data conflicts are handled gracefully
- ✅ Sync status is visible in admin dashboard

### Integration Details

- Store Accelerate API credentials in environment variables
- Create mapping between Accelerate courses and internal training products
- Implement webhook endpoint for real-time updates (optional)
- Handle API rate limits
- Cache frequently accessed data

---

## Issue #9: Implement Google Drive file storage integration

**Priority**: 🟠 High  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `integration`, `high`, `backend`, `files`

### Description

Integrate with Google Drive API for document storage and management. This enables policy documents, SOPs, and evidence files to be stored in Google Drive while maintaining links in the database.

### Missing Functions

- Google Drive OAuth2 authentication flow
- Token management and refresh
- Upload policy documents
- Upload SOP documents
- Upload evidence files
- Create organized folder structure
- Generate shareable links
- Get file metadata
- Document version tracking
- File preview generation
- Permission management

### Acceptance Criteria

- ✅ OAuth2 flow successfully connects to Google Drive
- ✅ Files upload successfully to designated folders
- ✅ Folder structure is automatically organized (by type/year)
- ✅ Shareable links are generated for uploaded files
- ✅ File metadata is stored in database
- ✅ Document versions are tracked in Drive
- ✅ Users can preview files without downloading
- ✅ File permissions are managed appropriately
- ✅ Large file uploads work reliably
- ✅ Upload progress is tracked and displayed

### Technical Requirements

- Use Google Drive API v3
- Implement resumable uploads for large files
- Create standard folder structure template
- Store Drive file IDs in database
- Implement file type validation
- Maximum file size: 100MB per file
- Support common formats: PDF, DOCX, XLSX, PNG, JPG

---

## Issue #10: Implement email notification system

**Priority**: 🟠 High  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `integration`, `high`, `backend`, `notifications`

### Description

Set up email service integration for automated notifications and reminders. This is critical for keeping staff informed about upcoming deadlines and compliance requirements.

### Missing Functions

- Email provider setup (SendGrid or AWS SES)
- SMTP configuration
- Email template system
- Template designs for:
  - Policy review reminders
  - Credential expiry alerts
  - PD due reminders
  - Complaint notifications
  - Welcome/onboarding emails
- Send individual emails
- Send batch/digest emails
- Track email delivery status
- Handle bounces and failures
- Retry logic for failed sends

### Acceptance Criteria

- ✅ Email provider is configured and tested
- ✅ All email templates are designed and approved
- ✅ Emails send successfully to recipients
- ✅ Email delivery status is tracked
- ✅ Failed sends are automatically retried (3 attempts)
- ✅ Digest emails correctly compile multiple notifications
- ✅ Unsubscribe mechanism is implemented
- ✅ Bounces are detected and logged
- ✅ Email sending is rate-limited appropriately
- ✅ HTML and plain text versions are both sent

### Template Requirements

Each template should include:
- Professional header with logo
- Clear subject line
- Personalized greeting
- Action required with deadline
- Direct link to relevant resource
- Footer with contact info and unsubscribe link
- Mobile-responsive design

---

## Issue #11: Build Feedback Management module (API + UI)

**Priority**: 🟡 Medium  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `feature`, `medium`, `backend`, `frontend`, `feedback`

### Description

Create a complete feedback management module including API endpoints and UI components. This module aggregates and analyzes feedback from learners, employers, and industry stakeholders.

### Missing Components

#### Backend API
- `GET /api/v1/feedback` - List feedback with filters
- `POST /api/v1/feedback` - Manual feedback entry
- `GET /api/v1/feedback/{id}` - Get feedback details
- `GET /api/v1/feedback/insights` - AI-generated insights
- `GET /api/v1/feedback/export` - Export feedback data
- `PATCH /api/v1/feedback/{id}` - Update feedback
- `DELETE /api/v1/feedback/{id}` - Delete feedback

#### Frontend UI
- `FeedbackView.tsx` - Main view component
- Feedback dashboard with key metrics
- Feedback list with advanced filters
- Feedback detail modal
- AI insights panel
- Export functionality
- Filter panel (type, date range, course, trainer, rating)
- Search functionality

### Acceptance Criteria

- ✅ Feedback is automatically stored from JotForm webhook
- ✅ Users can view feedback filtered by multiple criteria
- ✅ Anonymous feedback properly excludes PII
- ✅ AI generates sentiment scores (-1 to +1) daily
- ✅ AI extracts top 5 themes from feedback
- ✅ Export generates CSV with all filtered feedback
- ✅ UI displays feedback in organized, searchable lists
- ✅ Ratings are displayed with visual indicators
- ✅ Trends show changes over time (30/90 days)
- ✅ Feedback can be responded to by admin

### AI Analysis Features

- Sentiment analysis using OpenAI API
- Theme extraction (topics mentioned frequently)
- Trend detection (improving/declining satisfaction)
- Anomaly detection (sudden changes)
- Recommendations based on feedback patterns

---

## Issue #12: Build Resource Management module (API + UI)

**Priority**: 🟡 Medium  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `feature`, `medium`, `backend`, `frontend`, `assets`

### Description

Create a comprehensive resource management module for tracking physical assets, equipment, and infrastructure. This enables maintenance scheduling and compliance tracking for all organizational resources.

### Missing Components

#### Backend API
- `GET /api/v1/assets` - List all assets
- `POST /api/v1/assets` - Create new asset
- `GET /api/v1/assets/{id}` - Get asset details
- `PATCH /api/v1/assets/{id}` - Update asset
- `POST /api/v1/assets/{id}/service` - Log service event
- `POST /api/v1/assets/{id}/state` - Transition lifecycle state
- `GET /api/v1/assets/{id}/history` - Get maintenance history
- `DELETE /api/v1/assets/{id}` - Retire asset

#### Frontend UI
- `ResourcesView.tsx` - Main view component
- Asset inventory list with filters
- Asset detail modal with full history
- Service logging form
- State transition interface
- Maintenance schedule calendar
- Asset type categories (cranes, plant, tablets, laptops, equipment)

### Acceptance Criteria

- ✅ Assets can be created and tracked by type
- ✅ Maintenance events are logged with date, notes, and documents
- ✅ Lifecycle states work correctly (Available → Assigned → Servicing → Retired)
- ✅ Service schedules create automatic reminder notifications
- ✅ Compliance status shown based on last service date
- ✅ UI displays asset inventory with clear status indicators
- ✅ Assets can be assigned to staff members
- ✅ Service history is fully auditable
- ✅ Assets due for service are highlighted
- ✅ Reports can be generated for asset utilization

### Asset Types to Support

- Heavy equipment (cranes, forklifts)
- Vehicles
- IT equipment (laptops, tablets)
- Training equipment (lifting gear, simulators)
- Infrastructure (classrooms, training yards)
- Safety equipment

---

## Issue #13: Build Complaints & Appeals module (API + UI)

**Priority**: 🟡 Medium  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `feature`, `medium`, `backend`, `frontend`, `complaints`

### Description

Implement a workflow-driven complaints and appeals management system. This module tracks complaints from submission through resolution with full audit trails.

### Missing Components

#### Backend API
- `GET /api/v1/complaints` - List all complaints
- `POST /api/v1/complaints` - Create new complaint
- `GET /api/v1/complaints/{id}` - Get complaint details
- `PATCH /api/v1/complaints/{id}` - Update complaint
- `POST /api/v1/complaints/{id}/close` - Close complaint
- `POST /api/v1/complaints/{id}/escalate` - Escalate complaint
- `GET /api/v1/complaints/{id}/timeline` - Get audit timeline
- `POST /api/v1/complaints/{id}/notes` - Add notes

#### Frontend UI
- `ComplaintsView.tsx` - Main view component
- Complaints dashboard with SLA metrics
- Complaint list with status filters
- Complaint detail view with full timeline
- Complaint creation form
- Workflow tracker visualization
- SLA breach indicators
- Status update interface

### Acceptance Criteria

- ✅ Complaints can be logged with complete details
- ✅ Status workflow is enforced (New → In Review → Actioned → Closed)
- ✅ Timeline shows all updates with timestamps
- ✅ SLA breaches are flagged if not moved within 2 business days
- ✅ Complaints can be linked to policies, staff, and training
- ✅ Closure requires root cause and corrective action
- ✅ UI clearly shows complaint status with color coding
- ✅ Escalation workflow notifies appropriate managers
- ✅ Student demographics are captured
- ✅ Reports can be generated for compliance audits

### Workflow Requirements

- Automatic notifications on status changes
- SLA tracking (2 business day response time)
- Escalation rules for overdue complaints
- Manager approval required for closure
- Integration with continuous improvement actions

---

## Issue #14: Build HR & Onboarding module (API + UI)

**Priority**: 🟡 Medium  
**Estimated Effort**: 80 hours (2 weeks)  
**Labels**: `feature`, `medium`, `backend`, `frontend`, `hr`

### Description

Create an HR and onboarding module that automates the staff onboarding process and tracks onboarding completion. This extends the existing staff view with workflow automation.

### Missing Components

#### Backend API
- Onboarding workflow engine
- Onboarding task templates by department/role
- Task assignment automation
- Completion tracking
- Auto-assign SOPs based on role
- Auto-assign PD items based on department

#### Frontend UI
- Enhanced `StaffView.tsx` or new `OnboardingView.tsx`
- Onboarding workflow tracker
- Onboarding checklist per staff member
- Department management interface
- Position/role management
- Bulk staff operations
- Onboarding progress dashboard

### Acceptance Criteria

- ✅ New staff automatically trigger onboarding workflow
- ✅ Tasks are auto-assigned based on role and department
- ✅ Completion status is tracked in real-time
- ✅ Managers can view onboarding progress for their team
- ✅ Required SOPs are automatically assigned
- ✅ Required PD items are automatically scheduled
- ✅ UI clearly shows onboarding status (% complete)
- ✅ Notifications sent for incomplete onboarding after 7 days
- ✅ Onboarding can be customized per department
- ✅ Completion certificate generated when onboarding finished

### Onboarding Checklist Items

- Account creation
- System access setup
- Policy acknowledgment
- SOP training assignments
- Initial PD planning
- Equipment allocation
- Facility orientation
- Safety training
- Compliance documentation

---

## Issue #15: Implement file upload and document preview

**Priority**: 🟢 Lower  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `enhancement`, `frontend`, `files`

### Description

Add drag-and-drop file upload functionality and in-app document preview capabilities. This improves user experience when working with policies, SOPs, and evidence documents.

### Missing Components

- Drag-and-drop file upload component
- Pre-signed URL generation for secure uploads
- File preview modal (PDF, images, Word docs)
- Google Docs embed viewer
- Document viewer component with zoom/download
- Thumbnail generation for images
- Upload progress indicator
- Multiple file upload support

### Acceptance Criteria

- ✅ Users can upload files via drag-and-drop or file picker
- ✅ PDF files preview correctly in modal
- ✅ Image files display with zoom capability
- ✅ Google Docs can be embedded and viewed
- ✅ Upload progress bar shows during file transfer
- ✅ File size limits are enforced (100MB max)
- ✅ File type validation prevents unsupported formats
- ✅ Multiple files can be uploaded simultaneously
- ✅ Upload errors are clearly communicated
- ✅ Preview modal has download and share buttons

### Supported File Types

- Documents: PDF, DOCX, XLSX, PPTX
- Images: PNG, JPG, GIF
- Archives: ZIP (for batch uploads)
- Google Drive: Docs, Sheets, Slides (via embed)

---

## Issue #16: Implement data export functionality

**Priority**: 🟢 Lower  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `enhancement`, `backend`, `frontend`, `reporting`

### Description

Add comprehensive data export capabilities across all modules. This enables users to extract data for external analysis, reporting, and compliance audits.

### Missing Components

- CSV export for policies
- CSV export for standards mapping
- CSV export for staff credentials
- CSV export for feedback
- CSV export for assets
- PDF export for compliance gap reports
- PDF export for audit reports
- Report generation service
- Export job queue (for large exports)

### Acceptance Criteria

- ✅ Export buttons appear in all relevant views
- ✅ CSV files are well-formatted with proper headers
- ✅ PDF reports are professionally formatted
- ✅ Large exports don't timeout (queued processing)
- ✅ Files download correctly with appropriate filenames
- ✅ Export respects current filters and search criteria
- ✅ Users receive notification when large export is ready
- ✅ Exports include all relevant fields
- ✅ Date ranges can be specified for exports
- ✅ Export history is tracked for audit purposes

### Export Formats

**CSV Exports**:
- Policies list with metadata and status
- Standards mapping (standard → policies)
- Staff credentials with expiry dates
- Feedback with all responses
- Asset inventory with service history

**PDF Reports**:
- Compliance gap analysis
- Audit readiness report
- PD completion report
- Feedback summary report

---

## Issue #17: Implement advanced filtering and sorting

**Priority**: 🟢 Lower  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `enhancement`, `frontend`, `ux`

### Description

Enhance all list views with advanced filtering, sorting, and search capabilities. This improves usability and helps users find information quickly.

### Missing Components

- Multi-criteria filter UI component
- AND/OR filter logic implementation
- Date range picker components
- Status multi-select filters
- Column sorting (ascending/descending)
- Save filter presets functionality
- Filter state persistence in URL
- Clear all filters button
- Filter count indicators

### Acceptance Criteria

- ✅ Users can apply multiple filters simultaneously
- ✅ Filters combine with AND/OR logic as appropriate
- ✅ Sorting works on all applicable columns
- ✅ Filter state persists in URL for sharing
- ✅ Users can save favorite filter combinations
- ✅ Saved filters appear in quick-access dropdown
- ✅ Filter changes update results in real-time
- ✅ Active filters are clearly visible
- ✅ Clear filters button resets to default view
- ✅ Filter performance is optimized (debounced search)

### Filter Types by View

**Policies**: status, standard, owner, review date range  
**Standards**: compliance status, coverage percentage  
**Training**: product type, status, trainer assigned  
**Staff**: department, role, credential status  
**Feedback**: type, date range, rating, trainer, course  
**Assets**: type, status, location, service due  
**Complaints**: status, date range, SLA status

---

## Issue #18: Implement background job scheduler

**Priority**: 🟢 Lower  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `infrastructure`, `backend`, `automation`

### Description

Set up a robust background job scheduling system for automated tasks. This enables daily syncs, reminders, and maintenance operations to run reliably.

### Missing Components

- Job queue setup using Bull or BullMQ
- Job definitions for scheduled tasks:
  - Daily Xero sync (2:00 AM)
  - Daily Accelerate sync (3:00 AM)
  - Daily PD reminders (8:00 AM)
  - Daily credential expiry check (8:00 AM)
  - Daily policy review reminders (8:00 AM)
  - Daily complaint SLA check (9:00 AM)
  - Weekly digest emails (Monday 8:00 AM)
  - Monthly compliance reports (1st of month)
- Job retry logic with exponential backoff
- Job failure handling and alerting
- Job monitoring dashboard
- Manual job trigger API endpoints

### Acceptance Criteria

- ✅ Jobs run reliably on their defined schedules
- ✅ Failed jobs are automatically retried (up to 3 times)
- ✅ Job status is visible in admin dashboard
- ✅ Admins can manually trigger any job
- ✅ Job errors are logged and administrators are alerted
- ✅ Job execution history is retained for 90 days
- ✅ Long-running jobs don't block other jobs
- ✅ Jobs can be paused and resumed
- ✅ Job queue is monitored for health
- ✅ Dead letter queue captures permanently failed jobs

### Technical Requirements

- Use Redis for job queue backend
- Implement job concurrency limits
- Set appropriate job timeouts
- Configure job priority levels
- Implement idempotent job processing
- Create job monitoring dashboard UI

---

## Issue #19: Implement audit logging system

**Priority**: 🟢 Lower  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `security`, `backend`, `compliance`

### Description

Create a comprehensive audit logging system that tracks all critical actions in the system. This is essential for compliance audits and security investigations.

### Missing Components

- Audit log database table
- Audit log middleware for automatic logging
- Log all data changes (who/what/when/before/after)
- Log authentication events (login, logout, failed attempts)
- Log permission changes
- Log policy publications
- Log complaint actions
- Audit log viewer UI
- Audit log search and filter
- Audit log export functionality

### Acceptance Criteria

- ✅ All critical actions are automatically logged
- ✅ Audit logs are immutable (cannot be modified or deleted)
- ✅ Logs capture user, timestamp, action, and changes
- ✅ Logs exclude sensitive data like passwords
- ✅ Audit log viewer allows searching and filtering
- ✅ Logs can be exported for external audit
- ✅ Log retention policy is enforced (7+ years)
- ✅ Audit logs are included in backup procedures
- ✅ Performance impact of logging is minimal
- ✅ Logs include IP address and user agent

### Events to Log

- User authentication (success and failure)
- Policy creation, updates, and publication
- Standard mapping changes
- Staff credential changes
- PD completions and verifications
- Complaint status changes
- Asset service events
- Permission and role changes
- Data exports
- Configuration changes

---

## Issue #20: Implement AI sentiment analysis for feedback

**Priority**: 🟢 Lower  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `ai`, `enhancement`, `feedback`

### Description

Integrate OpenAI API for automated sentiment analysis and theme extraction from feedback. This provides actionable insights from feedback data.

### Missing Components

- OpenAI API integration
- Sentiment analysis function
- Theme extraction (identify top 5 themes)
- Trend detection over time
- Scheduled job to process new feedback daily
- AI insights API endpoint
- AI insights UI panel
- Sentiment score visualization

### Acceptance Criteria

- ✅ All feedback is analyzed for sentiment automatically
- ✅ Sentiment score ranges from -1 (negative) to +1 (positive)
- ✅ Top 5 themes are extracted from feedback corpus
- ✅ Trends show sentiment changes over 30/90 day periods
- ✅ AI insights are visible in feedback dashboard
- ✅ AI analysis runs daily for new feedback
- ✅ Analysis results are cached to avoid re-processing
- ✅ Precision and recall metrics meet ≥70% threshold
- ✅ Cost monitoring prevents excessive API usage
- ✅ Fallback behavior exists if API is unavailable

### AI Features

**Sentiment Analysis**:
- Overall sentiment score
- Aspect-based sentiment (trainer, content, facilities)
- Confidence scores

**Theme Extraction**:
- Automatically identify common topics
- Group similar feedback
- Detect emerging issues
- Highlight positive trends

**Trend Analysis**:
- Compare sentiment over time
- Detect sudden changes
- Predict future trends
- Generate alerts for concerning patterns

---

## Issue #21: Write comprehensive test suite

**Priority**: 🔵 Production  
**Estimated Effort**: 120 hours (3 weeks)  
**Labels**: `testing`, `quality`, `production`

### Description

Develop a comprehensive test suite covering unit tests, integration tests, and end-to-end tests. This ensures code quality and prevents regressions.

### Missing Tests

#### Unit Tests
- Component tests using React Testing Library
- Service/function tests using Jest
- Utility function tests
- Helper function tests
- Mock data factory tests
- Validation schema tests

#### Integration Tests
- API endpoint tests for all routes
- Database query tests
- Authentication flow tests
- Authorization tests
- External integration tests (mocked)
- Workflow tests

#### End-to-End Tests
- User journey tests using Playwright
- Critical path testing (login → create policy → publish)
- Cross-browser testing
- Mobile responsive testing

#### Coverage
- Test coverage reporting with Istanbul
- Coverage thresholds enforced in CI
- Branch coverage ≥80%
- Statement coverage ≥80%

### Acceptance Criteria

- ✅ Test coverage is ≥80% overall
- ✅ All API endpoints have integration tests
- ✅ Critical user paths have E2E tests
- ✅ Tests run automatically in CI on every PR
- ✅ Coverage report is generated and visible
- ✅ Failed tests block PR merges
- ✅ Tests run fast (<5 minutes for unit/integration)
- ✅ E2E tests run on multiple browsers
- ✅ Test documentation explains how to run tests
- ✅ Mock data is consistent and realistic

### Test Organization

```
/tests
  /unit
    /components
    /services
    /utils
  /integration
    /api
    /database
    /workflows
  /e2e
    /journeys
  /fixtures
  /factories
```

---

## Issue #22: Set up CI/CD pipeline

**Priority**: 🔵 Production  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `devops`, `production`, `automation`

### Description

Implement automated CI/CD pipeline using GitHub Actions for continuous integration and deployment. This ensures code quality and automates deployment processes.

### Missing Components

#### GitHub Actions Workflows
- Build and test on pull request
- Lint and type check on pull request
- Deploy to staging on merge to develop
- Deploy to production on merge to main
- Automated security scanning
- Dependency vulnerability checks

#### Deployment Components
- Database migration runner
- Environment variable validation
- Health check endpoints
- Smoke tests post-deployment
- Rollback procedures
- Blue-green deployment strategy

### Acceptance Criteria

- ✅ CI runs automatically on every PR
- ✅ Failed tests block PR merges
- ✅ Linting errors prevent merge
- ✅ Type errors prevent merge
- ✅ Staging deploys automatically on develop merge
- ✅ Production deploys on main merge after approval
- ✅ Database migrations run automatically
- ✅ Rollback works if deployment fails
- ✅ Health checks verify deployment success
- ✅ Deployment notifications sent to team
- ✅ Zero-downtime deployments

### Workflow Steps

**PR Workflow**:
1. Checkout code
2. Install dependencies
3. Run linter
4. Run type checker
5. Run tests with coverage
6. Build application
7. Report status

**Deploy Workflow**:
1. Build Docker image
2. Run database migrations
3. Deploy new version
4. Run smoke tests
5. Switch traffic to new version
6. Monitor for errors
7. Rollback if needed

---

## Issue #23: Implement monitoring and alerting

**Priority**: 🔵 Production  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `devops`, `production`, `monitoring`

### Description

Set up comprehensive monitoring and alerting infrastructure to ensure system health and rapid incident response.

### Missing Components

- Application monitoring (Grafana or Datadog)
- Error tracking (Sentry)
- Log aggregation (CloudWatch or ELK)
- Uptime monitoring (Pingdom or UptimeRobot)
- Performance monitoring (Lighthouse CI)
- Alert threshold configuration
- On-call rotation setup
- Status page for users

### Acceptance Criteria

- ✅ Application metrics are collected and visualized
- ✅ Errors are automatically captured and reported
- ✅ Logs are aggregated and searchable
- ✅ Uptime is monitored with 5-minute checks
- ✅ Performance metrics track page load times
- ✅ Alerts notify on-call engineer for critical issues
- ✅ Alert thresholds are appropriate (not too noisy)
- ✅ Dashboards show key system metrics
- ✅ Historical data retained for 90 days
- ✅ Status page shows current system health

### Metrics to Monitor

**Application Metrics**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Database query performance
- API endpoint latency
- Background job success rate

**Infrastructure Metrics**:
- CPU utilization
- Memory usage
- Disk space
- Network throughput
- Database connections

**Business Metrics**:
- Active users
- Policy views
- Feedback submissions
- Sync completion rate

### Alert Conditions

- Error rate >5% for 5 minutes
- Response time p95 >2 seconds
- Database connection pool >80%
- Disk space <20%
- Background job failure rate >10%
- Uptime check failure

---

## Issue #24: Perform security audit and hardening

**Priority**: 🔵 Production  
**Estimated Effort**: 60 hours (1.5 weeks)  
**Labels**: `security`, `production`, `critical`

### Description

Conduct comprehensive security audit and implement security hardening measures across the application. This ensures the platform meets security best practices and compliance requirements.

### Missing Security Measures

#### Input Security
- Input validation on all API endpoints
- SQL injection prevention (using parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (tokens)
- Path traversal prevention
- Command injection prevention

#### Infrastructure Security
- Rate limiting per user and per IP
- Security headers (CORS, CSP, HSTS, etc.)
- PII encryption at rest
- TLS 1.3 for all connections
- Secure cookie configuration
- API key rotation policy

#### Testing
- Penetration testing
- Dependency vulnerability scanning
- Security code review
- OWASP Top 10 compliance check

### Acceptance Criteria

- ✅ All user inputs are validated against schemas
- ✅ No SQL injection vulnerabilities found
- ✅ No XSS vulnerabilities found
- ✅ CSRF tokens required for state-changing operations
- ✅ Rate limits prevent brute force and DOS attacks
- ✅ All PII fields are encrypted at rest
- ✅ Security headers are properly configured
- ✅ TLS 1.3 is enforced, older versions rejected
- ✅ Dependency scan shows no high/critical vulnerabilities
- ✅ Penetration test report shows no critical findings

### Security Headers to Implement

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Rate Limits

- Login: 5 attempts per 15 minutes per IP
- API calls: 100 requests per minute per user
- File upload: 10 files per hour per user
- Password reset: 3 requests per hour per email

---

## Issue #25: Complete API documentation with OpenAPI

**Priority**: 🔵 Production  
**Estimated Effort**: 40 hours (1 week)  
**Labels**: `documentation`, `production`, `api`

### Description

Create comprehensive API documentation using OpenAPI 3.1 specification. This enables developers and auditors to understand and integrate with the API.

### Missing Documentation

- Complete OpenAPI 3.1 specification file
- API endpoint documentation for all routes
- Request/response schema definitions
- Authentication documentation
- Error code catalog
- Rate limiting documentation
- Integration guides:
  - JotForm webhook setup
  - Xero OAuth connection
  - Accelerate API integration
  - Google Drive setup
- Example requests and responses
- Postman collection

### Acceptance Criteria

- ✅ OpenAPI spec is complete and valid
- ✅ Spec validates successfully with Spectral linter
- ✅ Swagger UI is available at /api/docs
- ✅ All endpoints are documented with descriptions
- ✅ All request/response schemas are defined
- ✅ Example requests show realistic data
- ✅ Error responses are documented
- ✅ Authentication flow is clearly explained
- ✅ Integration guides are complete and tested
- ✅ Postman collection is generated and works

### Documentation Structure

**OpenAPI Spec Sections**:
1. Info (title, version, description, contact)
2. Servers (development, staging, production)
3. Authentication (JWT bearer, API keys)
4. Paths (all endpoints with operations)
5. Components:
   - Schemas (data models)
   - Responses (common responses)
   - Parameters (reusable parameters)
   - Security schemes
   - Examples

**Integration Guides**:
- Step-by-step setup instructions
- Required credentials and permissions
- Webhook configuration
- Testing procedures
- Troubleshooting common issues
- Rate limits and best practices

### API Documentation Standards

- Use clear, consistent language
- Include examples for every endpoint
- Document all possible error responses
- Explain business logic where applicable
- Keep documentation in sync with code
- Version documentation with API versions

---

## Summary

### Priority Distribution
- **🔴 Critical**: 5 issues (#1-5) - Foundation must be completed first
- **🟠 High**: 5 issues (#6-10) - Core integrations enable key features
- **🟡 Medium**: 4 issues (#11-14) - New modules extend functionality
- **🟢 Lower**: 6 issues (#15-20) - Enhancements improve user experience
- **🔵 Production**: 5 issues (#21-25) - Production readiness requirements

### Total Effort
- **25 issues total**
- **~1,620 hours** estimated
- **10 months** (1 developer) or **2.5 months** (4 developers)

### Implementation Approach
1. Complete all Critical issues first (foundation)
2. Then implement High priority issues (integrations)
3. Build out Medium priority new modules
4. Add Lower priority enhancements
5. Complete Production readiness tasks before launch

### Dependencies
- Issues #3-5 depend on #1-2 (database and auth must exist first)
- Issues #11-14 depend on #1-5 (need API foundation)
- Issues #6-10 can be done in parallel after #1-2
- Issues #15-20 should wait until core modules are stable
- Issues #21-25 should be ongoing throughout development

---

**Next Steps**: 
1. Create these 25 issues in GitHub
2. Apply appropriate labels
3. Link related issues
4. Assign to project board
5. Begin with Issue #1

**Document Date**: November 7, 2025
