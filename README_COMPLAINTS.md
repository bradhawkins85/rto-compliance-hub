# Complaints & Appeals Module - Quick Start Guide

## What Was Built

A complete, production-ready complaints and appeals management system for RTO compliance tracking.

## Quick Links

- **Technical Documentation**: [COMPLAINTS_MODULE_SUMMARY.md](COMPLAINTS_MODULE_SUMMARY.md)
- **Security Analysis**: [SECURITY_SUMMARY_COMPLAINTS.md](SECURITY_SUMMARY_COMPLAINTS.md)
- **Visual Guide**: [COMPLAINTS_MODULE_VISUAL_GUIDE.md](COMPLAINTS_MODULE_VISUAL_GUIDE.md)

## Features at a Glance

### Backend API (8 Endpoints)
- List complaints with filters
- Create new complaint
- Get complaint details
- Update complaint status
- Close complaint
- Escalate to management
- View timeline
- Add notes

### Frontend UI
- Dashboard with 6 metrics
- Multi-dimensional filtering
- Create/Update/Close workflows
- Timeline visualization
- SLA breach indicators
- Responsive design

## Getting Started

### 1. Backend Setup

The backend is ready to use. Just ensure:
- Database is connected
- Authentication is configured
- RBAC permissions are set up for 'complaints' resource

### 2. Frontend Access

Navigate to the Complaints tab in the main navigation (Warning icon).

### 3. Usage

**Create a Complaint:**
1. Click "+ New Complaint" button
2. Select source (Student, Staff, Employer, External)
3. Enter description
4. Optionally add student ID, trainer ID, course ID
5. Submit

**Manage Complaints:**
1. View dashboard metrics
2. Filter by status, source, or SLA
3. Search by keywords
4. Click on complaint card to view details
5. Use action buttons to update status
6. Add notes as needed
7. Close with root cause and corrective action

## File Structure

```
Backend:
server/src/
├── controllers/complaints.ts     (710 lines)
├── routes/complaints.ts          (107 lines)
├── utils/validation.ts           (+60 lines)
└── index.ts                      (+2 lines)

Frontend:
src/
├── components/views/ComplaintsView.tsx  (798 lines)
├── hooks/api/useComplaints.ts           (124 lines)
├── lib/api/
│   ├── complaints.ts                    (85 lines)
│   ├── types.ts                         (+84 lines)
│   └── index.ts                         (+1 line)
├── components/Navigation.tsx            (+3 lines)
└── App.tsx                              (+2 lines)

Documentation:
├── COMPLAINTS_MODULE_SUMMARY.md         (237 lines)
├── SECURITY_SUMMARY_COMPLAINTS.md       (109 lines)
├── COMPLAINTS_MODULE_VISUAL_GUIDE.md    (348 lines)
└── README_COMPLAINTS.md                 (this file)
```

## API Endpoints

All endpoints under `/api/v1/complaints` require authentication.

### List Complaints
```
GET /api/v1/complaints
Query: status, source, trainerId, trainingProductId, studentId, 
       dateFrom, dateTo, slaBreach, q, page, perPage
```

### Create Complaint
```
POST /api/v1/complaints
Body: { source, description, studentId?, trainerId?, 
        trainingProductId?, courseId? }
```

### Get Complaint
```
GET /api/v1/complaints/:id
Returns: Full complaint with timeline
```

### Update Complaint
```
PATCH /api/v1/complaints/:id
Body: { status?, description?, trainerId?, trainingProductId?, 
        courseId?, rootCause?, correctiveAction?, notes? }
```

### Close Complaint
```
POST /api/v1/complaints/:id/close
Body: { rootCause, correctiveAction, notes? }
```

### Escalate Complaint
```
POST /api/v1/complaints/:id/escalate
Body: { notes? }
```

### Get Timeline
```
GET /api/v1/complaints/:id/timeline
Returns: Array of timeline entries
```

### Add Note
```
POST /api/v1/complaints/:id/notes
Body: { notes }
```

## Status Workflow

```
New → In Review → Actioned → Closed
  ↓        ↓          ↓
  └────→ Escalate ←──┘
```

- **New**: Just submitted, awaiting review
- **In Review**: Being investigated
- **Actioned**: Resolution in progress
- **Closed**: Resolved with documentation
- **Escalate**: Can happen at any stage (except Closed)

## SLA Tracking

- **Threshold**: 2 business days
- **Calculated From**: Submission date or last status change
- **Visual Indicator**: Red border + warning badge
- **Applies To**: All non-closed complaints

## Color Coding

- 🔴 **Red**: New status, SLA breach
- 🟡 **Yellow**: In Review
- 🔵 **Blue**: Actioned
- �� **Green**: Closed
- 🟠 **Orange**: Escalated

## Permissions Required

Users need these RBAC permissions:
- `complaints:read` - View complaints
- `complaints:create` - Create new complaints
- `complaints:update` - Update status, close, escalate, add notes
- `complaints:delete` - (Not implemented yet)

## Testing Checklist

- [ ] Create complaint from each source type
- [ ] Update status through workflow
- [ ] Test workflow validation (can't skip states)
- [ ] Close complaint with required fields
- [ ] Escalate complaint
- [ ] Add notes to complaint
- [ ] Test all filters
- [ ] Test search functionality
- [ ] Verify SLA calculation
- [ ] Check timeline visualization
- [ ] Test on mobile/tablet
- [ ] Verify audit logs

## Common Issues

### Backend won't start
- Check database connection
- Verify environment variables
- Ensure Prisma schema is up to date

### Frontend not loading complaints
- Check API endpoint URL
- Verify authentication token
- Check browser console for errors

### SLA not showing correctly
- Verify date calculations
- Check timezone settings
- Review business day logic

## Support

For issues or questions:
1. Check the three documentation files
2. Review API endpoints and request/response formats
3. Check browser console for frontend errors
4. Check server logs for backend errors

## Compliance Notes

This module helps meet RTO compliance requirements:
- Complete audit trail
- Documented resolution process
- SLA tracking and reporting
- Stakeholder feedback capture
- Continuous improvement tracking

## Next Steps

After merge:
1. Configure RBAC permissions
2. Train users on workflow
3. Set up monitoring/alerts for SLA breaches
4. Configure email notifications (optional)
5. Generate initial compliance reports

## License

Part of the RTO Compliance Hub system.
