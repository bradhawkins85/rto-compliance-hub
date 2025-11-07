# Prisma Database Schema

This directory contains the Prisma schema definition and database seeding scripts for the RTO Compliance Hub.

## Files

- **`schema.prisma`** - The complete database schema definition with 22+ tables
- **`seed.ts`** - Seed script to populate the database with initial data
- **`migrations/`** - Database migration history (auto-generated, do not modify manually)

## Schema Overview

The schema defines the following main modules:

### 1. User Management
- Users, Roles, Permissions
- Role-based access control (RBAC)
- User-role and role-permission mappings

### 2. Governance & Policies
- Policies with version control
- 29+ ASQA RTO Standards
- Policy-standard mappings

### 3. Training Management
- Training products (courses)
- Standard Operating Procedures (SOPs)
- Training-SOP and SOP-standard mappings

### 4. Professional Development
- Staff credentials and qualifications
- PD items with tracking and evidence

### 5. Feedback Management
- Learner, employer, and industry feedback
- AI sentiment analysis support

### 6. Asset Management
- Physical assets (equipment, facilities)
- Service and maintenance records

### 7. Complaints & Appeals
- Complaint tracking with timeline
- Status workflow (New → InReview → Actioned → Closed)

### 8. System Support
- Evidence (polymorphic document storage)
- Notifications
- Background jobs
- Audit logs

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER MANAGEMENT                          │
├─────────────┬─────────────┬──────────────┬─────────────────┤
│   users     │   roles     │  permissions │  user_roles     │
│             │             │              │ role_permissions│
└─────────────┴─────────────┴──────────────┴─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 GOVERNANCE & POLICIES                       │
├─────────────┬──────────────┬────────────────────────────────┤
│  policies   │ policy_vers  │ policy_standard_mappings       │
│             │ standards    │                                │
└─────────────┴──────────────┴────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   TRAINING MANAGEMENT                       │
├──────────────────┬─────────────┬────────────────────────────┤
│training_products │    sops     │ training_product_sops      │
│                  │             │ sop_standard_mappings      │
└──────────────────┴─────────────┴────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PROFESSIONAL DEVELOPMENT                       │
├──────────────────┬──────────────────────────────────────────┤
│  credentials     │           pd_items                       │
└──────────────────┴──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          FEEDBACK, ASSETS, COMPLAINTS                       │
├──────────┬──────────┬──────────────┬─────────────────────────┤
│ feedback │  assets  │  complaints  │  complaint_timeline     │
│          │ asset_sv │              │                         │
└──────────┴──────────┴──────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM SUPPORT                           │
├──────────────┬─────────────────┬───────────┬────────────────┤
│   evidence   │  notifications  │   jobs    │  audit_logs    │
└──────────────┴─────────────────┴───────────┴────────────────┘
```

## Key Features

### UUID Primary Keys
All tables use UUID as primary keys for better scalability and distributed systems support.

### Soft Deletes
The following tables support soft deletes (deletedAt field):
- policies
- training_products
- sops
- assets
- evidence

### Indexes
Comprehensive indexes are defined for:
- Foreign keys
- Frequently queried fields (email, status, dates)
- Composite indexes for complex queries

### Constraints
- Unique constraints on emails, codes, and mapping relationships
- Foreign key constraints with CASCADE delete where appropriate
- Check constraints via validation at application level

## Seeding Data

The seed script populates:

1. **29+ RTO Standards** - ASQA Standards for RTOs 2015
2. **5 Default Roles**:
   - SystemAdmin (full access)
   - ComplianceAdmin (compliance management)
   - Trainer (training delivery)
   - Manager (oversight)
   - Staff (basic access)
3. **32+ Permissions** - Granular CRUD permissions per resource
4. **Default Admin User** - admin@rto-compliance-hub.local
5. **3 Scheduled Jobs** - PD reminders, policy reviews, credential checks

## Usage

See the main [DATABASE.md](../DATABASE.md) documentation for complete setup and usage instructions.

### Quick Start

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Modifying the Schema

1. Edit `schema.prisma`
2. Format: `npx prisma format`
3. Generate: `npm run db:generate`
4. Migrate: `npm run db:migrate`
5. Name your migration descriptively

## Best Practices

1. **Always create migrations** - Don't use `db:push` in production
2. **Name migrations clearly** - Use descriptive names like "add_phone_to_users"
3. **Test migrations** - Run `db:reset` after major changes
4. **Document changes** - Update this README for significant schema changes
5. **Review generated SQL** - Check migration files before applying

## Prisma Client Usage

```typescript
import { prisma } from '@/lib/db';

// Find users
const users = await prisma.user.findMany({
  include: {
    userRoles: {
      include: { role: true }
    }
  }
});

// Create policy
const policy = await prisma.policy.create({
  data: {
    title: 'New Policy',
    ownerId: userId,
    status: 'Draft'
  }
});
```

For more examples, see [src/lib/db/examples.ts](../src/lib/db/examples.ts).
