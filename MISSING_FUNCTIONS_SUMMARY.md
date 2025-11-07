# Missing Functions Summary - Quick Reference

**Date**: November 7, 2025  
**Status**: Ready for Sub-Task Creation  
**Related Documents**: 
- [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) - Full detailed analysis
- [IMPLEMENTATION_INVENTORY.md](./IMPLEMENTATION_INVENTORY.md) - Current implementation

---

## Overview

This document provides a **quick reference** of the most critical missing functions identified in the gap analysis. Each section represents a potential GitHub issue/sub-task that should be created to implement the full RTO Compliance Hub platform.

**Current Status**: 15-20% complete (frontend prototype only)  
**Missing Work**: ~1,020 hours (~6 months for 1 developer)

---

## 🔴 CRITICAL PRIORITY - Must Do First

### 1. Database Setup & Schema Design
**Issue Type**: Infrastructure  
**Estimated Effort**: 80 hours (2 weeks)

**Missing Components**:
- PostgreSQL database setup
- Prisma ORM configuration
- Database schema covering 22+ tables:
  - users, roles, permissions, user_roles
  - policies, policy_versions, policy_standard_mappings
  - standards
  - training_products, sops, training_product_sops
  - staff, credentials, pd_items
  - feedback
  - assets, asset_services
  - complaints, complaint_timeline
  - evidence, notifications, jobs, audit_logs
- Migration system setup
- Seed data scripts
- Connection pooling configuration

**Acceptance Criteria**:
- ✅ PostgreSQL database is running
- ✅ Prisma schema is defined and matches all requirements
- ✅ Initial migration creates all tables
- ✅ Seed script populates RTO standards and default roles
- ✅ Database can be reset and re-seeded
- ✅ Connection pooling is configured

---

### 2. Authentication & Authorization System
**Issue Type**: Security / Backend  
**Estimated Effort**: 100 hours (2.5 weeks)

**Missing Functions**:
- `POST /api/v1/auth/login` - JWT authentication
- `POST /api/v1/auth/logout` - Session termination
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/reset-password` - Password reset
- `POST /api/v1/auth/change-password` - Password change
- JWT token generation and validation
- Password hashing (bcrypt)
- RBAC middleware for route protection
- Permission checking utilities
- Session management

**User Roles to Define**:
- SystemAdmin (full access)
- ComplianceAdmin (compliance management)
- Manager (staff oversight, approvals)
- Trainer (training and PD)
- Staff (limited self-service)

**Acceptance Criteria**:
- ✅ Users can log in with email/password
- ✅ JWT tokens are issued and validated
- ✅ Tokens expire and can be refreshed
- ✅ All API routes are protected by auth middleware
- ✅ RBAC correctly limits access based on roles
- ✅ Password reset flow works end-to-end
- ✅ Audit logs capture all auth events

---

### 3. Core API Endpoints - Users & Policies
**Issue Type**: Backend  
**Estimated Effort**: 120 hours (3 weeks)

**Missing API Endpoints**:

#### User Management
- `GET /api/v1/users` - List users (with filters)
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/{id}` - Get user details
- `PATCH /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Soft delete user
- `POST /api/v1/users/{id}/credentials` - Add credential
- `GET /api/v1/users/{id}/pd` - List PD records

#### Policy Management
- `GET /api/v1/policies` - List policies (with filters)
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies/{id}` - Get policy with version history
- `PATCH /api/v1/policies/{id}` - Update policy metadata
- `POST /api/v1/policies/{id}/publish` - Publish new version
- `POST /api/v1/policies/{id}/map` - Map to standards
- `GET /api/v1/policies/{id}/versions` - Version history

#### Standards
- `GET /api/v1/standards` - List all standards
- `GET /api/v1/standards/{id}` - Get standard details
- `GET /api/v1/standards/{id}/mappings` - Get linked items

**Acceptance Criteria**:
- ✅ All endpoints return valid JSON
- ✅ Endpoints enforce authentication
- ✅ Endpoints enforce authorization (RBAC)
- ✅ Input validation prevents invalid data
- ✅ Errors follow RFC 7807 format
- ✅ API response time <500ms (95th percentile)
- ✅ All operations are logged in audit trail

---

### 4. Core API Endpoints - Training & Staff
**Issue Type**: Backend  
**Estimated Effort**: 80 hours (2 weeks)

**Missing API Endpoints**:

#### Training Products & SOPs
- `GET /api/v1/training-products` - List training products
- `POST /api/v1/training-products` - Create product
- `GET /api/v1/training-products/{id}` - Get product details
- `PATCH /api/v1/training-products/{id}` - Update product
- `POST /api/v1/training-products/{id}/sops` - Link SOPs
- `GET /api/v1/sops` - List SOPs
- `GET /api/v1/sops/{id}` - Get SOP details
- `POST /api/v1/sops` - Create SOP

#### Professional Development
- `GET /api/v1/pd` - Query PD items (with filters)
- `POST /api/v1/pd` - Create PD item
- `GET /api/v1/pd/{id}` - Get PD details
- `POST /api/v1/pd/{id}/complete` - Mark complete
- `POST /api/v1/pd/{id}/verify` - Manager verification
- `GET /api/v1/credentials` - List credentials
- `POST /api/v1/credentials` - Create credential

**Acceptance Criteria**:
- ✅ All CRUD operations work correctly
- ✅ Training products can be linked to SOPs
- ✅ PD workflow (create → complete → verify) works
- ✅ Credential expiry dates are tracked
- ✅ Status calculations are automatic (due/overdue)

---

### 5. Frontend API Integration - Replace Mock Data
**Issue Type**: Frontend  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- API client setup (fetch/axios)
- Replace mock data in OverviewView with API calls
- Replace mock data in StandardsView with API calls
- Replace mock data in PoliciesView with API calls
- Replace mock data in TrainingView with API calls
- Replace mock data in StaffView with API calls
- Error handling for API failures
- Loading states during API calls
- Token management (store JWT, refresh on expiry)

**Acceptance Criteria**:
- ✅ All views fetch real data from API
- ✅ Loading spinners show during fetch
- ✅ Error messages display on API failure
- ✅ JWT token is stored securely
- ✅ Token refresh works automatically
- ✅ No mock data remains in production code

---

## 🟠 HIGH PRIORITY - Core Integrations

### 6. JotForm Webhook Integration
**Issue Type**: Integration  
**Estimated Effort**: 40 hours (1 week)

**Missing Functions**:
- `POST /api/v1/webhooks/jotform` - Webhook endpoint
- JotForm signature validation
- Payload parsing and field mapping
- Queue submission for async processing
- Support for multiple form types:
  - Learner feedback
  - Employer feedback
  - Industry feedback
  - SOP training completion
- Anonymous submission handling
- Duplicate submission detection

**Acceptance Criteria**:
- ✅ Webhook receives JotForm submissions
- ✅ Signature validation prevents unauthorized access
- ✅ Data is parsed and stored in database
- ✅ Processing happens within 3 seconds
- ✅ Failed submissions are retried
- ✅ Anonymous submissions exclude PII

---

### 7. Xero Payroll Sync Integration
**Issue Type**: Integration  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Functions**:
- `POST /api/v1/sync/xero` - Trigger sync endpoint
- Xero OAuth2 authentication flow
- Token refresh mechanism
- Fetch employees from Xero
- Map Xero employees to staff records
- Sync positions and departments
- Duplicate detection (by email or external ID)
- Conflict resolution strategy
- Sync audit logging

**Acceptance Criteria**:
- ✅ OAuth2 flow connects to Xero
- ✅ Employee list syncs successfully
- ✅ New employees are created in database
- ✅ Existing employees are updated
- ✅ Duplicates are detected and resolved
- ✅ Sync runs daily via scheduled job
- ✅ Manual sync trigger works
- ✅ All sync operations are logged

---

### 8. Accelerate API Integration
**Issue Type**: Integration  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Functions**:
- `POST /api/v1/sync/accelerate` - Trigger sync endpoint
- Accelerate API authentication
- Fetch trainer list from Accelerate
- Fetch student enrollment data
- Map Accelerate users to staff/students
- Sync course enrollments
- Handle data conflicts
- Sync audit logging

**Acceptance Criteria**:
- ✅ API authentication works
- ✅ Trainer list syncs successfully
- ✅ Student data syncs successfully
- ✅ Enrollments are linked to training products
- ✅ Sync runs daily via scheduled job
- ✅ Manual sync trigger works

---

### 9. Google Drive File Storage Integration
**Issue Type**: Integration  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Functions**:
- Google Drive OAuth2 flow
- Upload policy documents
- Upload SOP documents
- Upload evidence files
- Create folder structure
- Generate shareable links
- Get file metadata
- Document version tracking
- File preview generation

**Acceptance Criteria**:
- ✅ OAuth2 connects to Google Drive
- ✅ Files upload successfully
- ✅ Folder structure is organized
- ✅ Shareable links are generated
- ✅ File metadata is stored in database
- ✅ File versions are tracked

---

### 10. Email Notification System
**Issue Type**: Integration  
**Estimated Effort**: 40 hours (1 week)

**Missing Functions**:
- Email provider setup (SendGrid/AWS SES)
- Email template system
- Templates for:
  - Policy review reminders
  - Credential expiry alerts
  - PD due reminders
  - Complaint notifications
  - Welcome/onboarding emails
- Send individual emails
- Send batch/digest emails
- Track delivery status
- Handle bounces/failures

**Acceptance Criteria**:
- ✅ Email provider is configured
- ✅ Templates are designed and tested
- ✅ Emails send successfully
- ✅ Delivery status is tracked
- ✅ Failed sends are retried
- ✅ Digest emails compile multiple notifications

---

## 🟡 MEDIUM PRIORITY - New Modules

### 11. Feedback Management Module (API + UI)
**Issue Type**: Feature / Module  
**Estimated Effort**: 80 hours (2 weeks)

**Missing Components**:

#### Backend API
- `GET /api/v1/feedback` - List feedback with filters
- `POST /api/v1/feedback` - Manual feedback entry
- `GET /api/v1/feedback/{id}` - Get feedback details
- `GET /api/v1/feedback/insights` - AI-generated insights
- `GET /api/v1/feedback/export` - Export CSV/PDF

#### Frontend UI
- FeedbackView.tsx component
- Feedback dashboard with metrics
- Feedback list with filters (type, date, course, trainer)
- Feedback detail modal
- AI insights panel
- Export button

**Acceptance Criteria**:
- ✅ Feedback is stored from JotForm webhook
- ✅ Users can view feedback by filters
- ✅ Anonymous feedback excludes PII
- ✅ AI generates sentiment scores and themes
- ✅ Export generates CSV with all feedback
- ✅ UI displays feedback in organized lists

---

### 12. Resource Management Module (API + UI)
**Issue Type**: Feature / Module  
**Estimated Effort**: 80 hours (2 weeks)

**Missing Components**:

#### Backend API
- `GET /api/v1/assets` - List assets
- `POST /api/v1/assets` - Create asset
- `GET /api/v1/assets/{id}` - Get asset details
- `PATCH /api/v1/assets/{id}` - Update asset
- `POST /api/v1/assets/{id}/service` - Log service
- `POST /api/v1/assets/{id}/state` - Transition state
- `GET /api/v1/assets/{id}/history` - Maintenance history

#### Frontend UI
- ResourcesView.tsx component
- Asset inventory list
- Asset detail modal with maintenance history
- Service logging form
- State transition interface
- Asset types: cranes, plant, tablets, laptops, lifting equipment

**Acceptance Criteria**:
- ✅ Assets can be created and tracked
- ✅ Maintenance events are logged
- ✅ Lifecycle states work (Available → Assigned → Servicing → Retired)
- ✅ Service schedule creates automatic reminders
- ✅ Compliance status shown based on last service
- ✅ UI displays asset inventory clearly

---

### 13. Complaints & Appeals Module (API + UI)
**Issue Type**: Feature / Module  
**Estimated Effort**: 80 hours (2 weeks)

**Missing Components**:

#### Backend API
- `GET /api/v1/complaints` - List complaints
- `POST /api/v1/complaints` - Create complaint
- `GET /api/v1/complaints/{id}` - Get complaint details
- `PATCH /api/v1/complaints/{id}` - Update complaint
- `POST /api/v1/complaints/{id}/close` - Close complaint
- `GET /api/v1/complaints/{id}/timeline` - Audit timeline

#### Frontend UI
- ComplaintsView.tsx component
- Complaints dashboard
- Complaint list with status filters
- Complaint detail view with timeline
- Complaint creation form
- Workflow tracker (New → In Review → Actioned → Closed)
- SLA breach indicators

**Acceptance Criteria**:
- ✅ Complaints can be logged and tracked
- ✅ Status workflow is enforced
- ✅ Timeline shows all updates
- ✅ SLA breaches are flagged (>2 business days)
- ✅ Complaints link to policies/staff/training
- ✅ Closure requires root cause and corrective action
- ✅ UI clearly shows complaint status

---

### 14. HR & Onboarding Module (API + UI)
**Issue Type**: Feature / Module  
**Estimated Effort**: 80 hours (2 weeks)

**Missing Components**:

#### Backend API
- Onboarding workflow engine
- Onboarding task templates by department/role
- Track onboarding completion
- Auto-assign SOPs and PD items

#### Frontend UI
- HR/OnboardingView.tsx component (enhance current StaffView)
- Onboarding workflow tracker
- Onboarding checklist per staff member
- Department management
- Position/role management
- Bulk staff operations

**Acceptance Criteria**:
- ✅ New staff trigger onboarding workflow
- ✅ Tasks are auto-assigned based on role
- ✅ Completion is tracked
- ✅ Managers see onboarding progress
- ✅ SOPs and PD are linked automatically
- ✅ UI shows onboarding status clearly

---

## 🟢 LOWER PRIORITY - Enhancements

### 15. File Upload & Document Preview
**Issue Type**: Enhancement  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- File upload component (drag-and-drop)
- Pre-signed URL generation for uploads
- File preview modal (PDF, images, docs)
- Google Docs embed
- Document viewer component
- Thumbnail generation

**Acceptance Criteria**:
- ✅ Users can upload files via drag-and-drop
- ✅ PDF preview works in modal
- ✅ Google Docs can be embedded
- ✅ Upload progress is shown
- ✅ File size limits are enforced

---

### 16. Data Export Functionality
**Issue Type**: Enhancement  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- CSV export for policies
- CSV export for standards mapping
- CSV export for staff credentials
- CSV export for feedback
- PDF export for compliance gap report
- PDF export for audit reports
- Report generation service

**Acceptance Criteria**:
- ✅ Export buttons work in all views
- ✅ CSV files are well-formatted
- ✅ PDF reports are professional
- ✅ Large exports don't timeout
- ✅ Files download correctly

---

### 17. Advanced Filtering & Sorting
**Issue Type**: Enhancement  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- Multi-criteria filter UI
- AND/OR filter logic
- Date range pickers
- Status multi-select
- Column sorting (asc/desc)
- Save filter presets
- Filter persistence in URL

**Acceptance Criteria**:
- ✅ Users can apply multiple filters
- ✅ Filters combine with AND/OR logic
- ✅ Sorting works on all columns
- ✅ Filter state persists in URL
- ✅ Users can save favorite filters

---

### 18. Background Job Scheduler
**Issue Type**: Infrastructure  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Components**:
- Job queue setup (Bull/BullMQ)
- Job definitions for:
  - Daily Xero sync
  - Daily Accelerate sync
  - Daily PD reminders
  - Daily credential expiry check
  - Daily policy review reminders
  - Daily complaint SLA check
  - Weekly digest emails
- Job retry logic
- Job failure handling
- Job monitoring dashboard
- Manual job trigger API

**Acceptance Criteria**:
- ✅ Jobs run on schedule
- ✅ Failed jobs are retried
- ✅ Job status is visible in dashboard
- ✅ Admins can trigger jobs manually
- ✅ Job errors are logged and alerted

---

### 19. Audit Logging System
**Issue Type**: Security / Infrastructure  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- Audit log table
- Audit log middleware
- Log all data changes (who/what/when)
- Log authentication events
- Log permission changes
- Log policy publications
- Log complaint actions
- Audit log viewer UI
- Audit log export

**Acceptance Criteria**:
- ✅ All critical actions are logged
- ✅ Logs are immutable
- ✅ Logs capture who/what/when
- ✅ Logs exclude sensitive data (passwords)
- ✅ Audit log viewer works
- ✅ Logs can be exported

---

### 20. AI Sentiment Analysis for Feedback
**Issue Type**: AI / Enhancement  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Components**:
- OpenAI API integration
- Sentiment analysis function
- Theme extraction (top 5 themes)
- Trend detection over time
- Scheduled job to process feedback
- AI insights API endpoint
- AI insights UI panel

**Acceptance Criteria**:
- ✅ Feedback is analyzed for sentiment
- ✅ Sentiment score is –1 to +1
- ✅ Top 5 themes are extracted
- ✅ Trends show sentiment over time
- ✅ Insights visible in UI
- ✅ AI analysis runs daily

---

## 🔵 PRODUCTION READINESS

### 21. Comprehensive Test Suite
**Issue Type**: Testing  
**Estimated Effort**: 120 hours (3 weeks)

**Missing Tests**:
- Unit tests for all components (React Testing Library)
- Unit tests for all services/functions (Jest)
- Integration tests for all API endpoints
- E2E tests for critical user journeys (Playwright)
- Test coverage reporting (Istanbul)
- CI integration for tests

**Acceptance Criteria**:
- ✅ Test coverage ≥80%
- ✅ All API endpoints have integration tests
- ✅ Critical paths have E2E tests
- ✅ Tests run in CI on every PR
- ✅ Coverage report is generated

---

### 22. CI/CD Pipeline Setup
**Issue Type**: DevOps  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- GitHub Actions workflows:
  - Build and test on PR
  - Lint and type check on PR
  - Deploy to staging on merge to develop
  - Deploy to production on merge to main
- Database migration runner
- Environment variable validation
- Health check endpoints
- Rollback procedures

**Acceptance Criteria**:
- ✅ CI runs on every PR
- ✅ Failed tests block merge
- ✅ Staging deploys automatically
- ✅ Production deploys on merge to main
- ✅ Rollback works if deploy fails

---

### 23. Monitoring & Alerting
**Issue Type**: DevOps  
**Estimated Effort**: 40 hours (1 week)

**Missing Components**:
- Application monitoring (Grafana/Datadog)
- Error tracking (Sentry)
- Log aggregation (CloudWatch/ELK)
- Uptime monitoring (Pingdom)
- Performance monitoring (Lighthouse CI)
- Alert thresholds and notifications

**Acceptance Criteria**:
- ✅ Application metrics are visible
- ✅ Errors are captured and alerted
- ✅ Logs are aggregated and searchable
- ✅ Uptime is monitored
- ✅ Alerts notify on-call team

---

### 24. Security Audit & Hardening
**Issue Type**: Security  
**Estimated Effort**: 60 hours (1.5 weeks)

**Missing Security**:
- Input validation on all endpoints
- SQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting
- PII encryption at rest
- Security headers (CORS, CSP, etc.)
- Penetration testing
- Dependency vulnerability scanning

**Acceptance Criteria**:
- ✅ All inputs are validated
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ CSRF tokens are required
- ✅ Rate limits prevent abuse
- ✅ PII is encrypted
- ✅ Security scan passes

---

### 25. API Documentation (OpenAPI)
**Issue Type**: Documentation  
**Estimated Effort**: 40 hours (1 week)

**Missing Documentation**:
- Complete OpenAPI 3.1 spec
- API endpoint documentation
- Schema definitions
- Example requests/responses
- Error codes and meanings
- Authentication guide
- Integration guides (JotForm, Xero, Accelerate)

**Acceptance Criteria**:
- ✅ OpenAPI spec is complete
- ✅ Spec validates with Spectral
- ✅ Swagger UI is available
- ✅ All endpoints are documented
- ✅ Examples are accurate
- ✅ Integration guides are clear

---

## Summary Statistics

### By Priority:
- **🔴 Critical (5 tasks)**: 420 hours (~11 weeks)
- **🟠 High (5 tasks)**: 260 hours (~7 weeks)
- **🟡 Medium (4 tasks)**: 320 hours (~8 weeks)
- **🟢 Lower (6 tasks)**: 320 hours (~8 weeks)
- **🔵 Production (5 tasks)**: 300 hours (~8 weeks)

### Total Effort:
- **25 Sub-Tasks**: ~1,620 hours
- **1 Developer**: ~40 weeks (10 months)
- **2 Developers**: ~20 weeks (5 months)
- **4 Developers**: ~10 weeks (2.5 months)

### Implementation Order:
1. Complete **Critical** tasks first (foundation)
2. Then **High** priority (core integrations)
3. Then **Medium** priority (new modules)
4. Then **Lower** priority (enhancements)
5. Finally **Production** readiness

---

## Next Steps

1. ✅ Create GitHub issues for each of the 25 sub-tasks above
2. ⬜ Assign priorities and labels
3. ⬜ Estimate story points
4. ⬜ Create project board with phases
5. ⬜ Assign tasks to team members
6. ⬜ Begin Sprint 1 with Critical tasks

---

**Document Status**: ✅ Complete  
**Ready For**: Issue creation in GitHub  
**Related**: [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) for full details
