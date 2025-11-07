# Database Setup & Usage Guide

This document provides comprehensive guidance on setting up and using the PostgreSQL database with Prisma ORM for the RTO Compliance Hub platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Database Schema](#database-schema)
- [Setup Instructions](#setup-instructions)
- [Database Commands](#database-commands)
- [Seeding Data](#seeding-data)
- [Connection Configuration](#connection-configuration)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The RTO Compliance Hub uses:
- **PostgreSQL 14+** as the database engine
- **Prisma ORM** for type-safe database access
- **22+ tables** covering all compliance management modules
- **UUID primary keys** for better scalability
- **Soft deletes** where appropriate
- **Comprehensive indexes** for query performance
- **Foreign key constraints** for data integrity

## Prerequisites

Before setting up the database, ensure you have:

1. **Node.js 18+** installed
2. **PostgreSQL 14+** installed and running
3. Database credentials with permission to create databases

### Installing PostgreSQL

**On macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**On Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

## Database Schema

The database includes the following modules:

### Core Tables (22+)

1. **User Management**
   - `users` - User accounts
   - `roles` - System roles (SystemAdmin, ComplianceAdmin, Trainer, etc.)
   - `permissions` - Granular permissions
   - `user_roles` - User-role assignments
   - `role_permissions` - Role-permission mappings

2. **Governance & Policies**
   - `policies` - Policy documents
   - `policy_versions` - Version history
   - `standards` - RTO compliance standards (29+ standards)
   - `policy_standard_mappings` - Links between policies and standards

3. **Training Management**
   - `training_products` - Training courses/products
   - `sops` - Standard Operating Procedures
   - `training_product_sops` - Links between training and SOPs
   - `sop_standard_mappings` - Links between SOPs and standards

4. **Professional Development**
   - `credentials` - Staff credentials and qualifications
   - `pd_items` - Professional development activities

5. **Feedback & Quality**
   - `feedback` - Learner, employer, and industry feedback

6. **Asset Management**
   - `assets` - Physical assets (equipment, facilities)
   - `asset_services` - Service and maintenance records

7. **Complaints & Appeals**
   - `complaints` - Complaint records
   - `complaint_timeline` - Complaint status history

8. **System & Support**
   - `evidence` - Document evidence (polymorphic)
   - `notifications` - User notifications
   - `jobs` - Scheduled background jobs
   - `audit_logs` - System audit trail

## Setup Instructions

### 1. Create Database

Create a PostgreSQL database for the application:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE rto_compliance_hub;

# Create user (optional)
CREATE USER rto_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rto_compliance_hub TO rto_admin;

# Exit
\q
```

### 2. Configure Environment Variables

Copy the `.env` file and update the connection string:

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rto_compliance_hub?schema=public"
```

**Connection String Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

### 3. Run Migrations

Generate and apply the database schema:

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migration
npm run db:migrate
```

When prompted, provide a migration name (e.g., "initial_setup").

### 4. Seed the Database

Populate the database with initial data:

```bash
npm run db:seed
```

This will create:
- **29+ RTO standards** (ASQA Standards for 2015)
- **5 default roles** (SystemAdmin, ComplianceAdmin, Trainer, Manager, Staff)
- **32+ permissions** with appropriate role assignments
- **Default admin user** (email: admin@rto-compliance-hub.local)
- **3 scheduled jobs** (PD reminders, policy reviews, credential expiry checks)

## Database Commands

The following npm scripts are available:

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Create a new migration (development)
npm run db:migrate

# Apply migrations (production)
npm run db:migrate:deploy

# Push schema changes without migrations (development only)
npm run db:push

# Seed the database
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset

# Open Prisma Studio (GUI for database)
npm run db:studio
```

## Seeding Data

The seed script (`prisma/seed.ts`) populates the database with:

### RTO Standards (29+)

Based on the Australian Skills Quality Authority (ASQA) Standards for RTOs 2015:

- **Standard 1**: Training and assessment (8 clauses)
- **Standard 2**: Operations of the RTO (4 clauses)
- **Standard 3**: AQF certification documentation (4 clauses)
- **Standard 4**: Accurate and accessible information (2 clauses)
- **Standard 5**: Learner protection (3 clauses)
- **Standard 6**: Complaints and appeals (2 clauses)
- **Standard 7**: Governance and administration (2 clauses)
- **Standard 8**: VET Regulator cooperation (4 clauses)

### Default Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **SystemAdmin** | Full system access | All permissions |
| **ComplianceAdmin** | Compliance management | Policies, standards, reports, training |
| **Trainer** | Training delivery | Training products, SOPs, PD, feedback |
| **Manager** | Staff oversight | Read access + PD management |
| **Staff** | Basic user | View policies/training, manage own PD |

### Default Admin User

- **Email**: `admin@rto-compliance-hub.local`
- **Role**: SystemAdmin
- **Note**: Change password immediately in production

## Connection Configuration

### Development

For local development, use the default connection:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rto_compliance_hub?schema=public"
```

### Connection Pooling (Production)

For production deployments with connection pooling:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&connection_limit=10&pool_timeout=20"
```

Recommended pool settings:
- **Connection limit**: 10-20 per instance
- **Pool timeout**: 20 seconds
- **Idle timeout**: 30 seconds

### PgBouncer (Optional)

For high-traffic applications, use PgBouncer for connection pooling:

```env
# Application connects to PgBouncer
DATABASE_URL="postgresql://user:password@pgbouncer:6432/database?schema=public"

# PgBouncer connects to PostgreSQL
# Configure in pgbouncer.ini
```

## Development Workflow

### Making Schema Changes

1. **Modify the schema** in `prisma/schema.prisma`
2. **Format the schema**: `npx prisma format`
3. **Generate client**: `npm run db:generate`
4. **Create migration**: `npm run db:migrate`
5. **Update seed** if needed in `prisma/seed.ts`

### Example: Adding a New Field

```prisma
model User {
  // ... existing fields
  phoneNumber String? // Add new field
}
```

Then run:
```bash
npm run db:migrate
# Name it: "add_phone_number_to_users"
```

### Testing Schema Changes

Reset and re-seed the database:

```bash
npm run db:reset
# Confirms reset, runs migrations, and seeds data
```

## Production Deployment

### 1. Environment Variables

Set production environment variables:

```bash
DATABASE_URL="postgresql://prod_user:secure_password@db.example.com:5432/rto_compliance_hub?schema=public"
NODE_ENV="production"
```

### 2. Run Migrations

Apply migrations without prompts:

```bash
npm run db:migrate:deploy
```

### 3. Seed Production Data

Modify the seed script to skip data cleanup in production:

```typescript
// In prisma/seed.ts
if (process.env.NODE_ENV !== 'production') {
  // Cleanup only in development
}
```

Then seed:
```bash
NODE_ENV=production npm run db:seed
```

### 4. Database Backups

Set up automated backups:

```bash
# Daily backup cron job
0 2 * * * pg_dump -U postgres rto_compliance_hub > /backups/rto_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to database

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d rto_compliance_hub
```

**Problem**: Authentication failed

- Verify credentials in `.env`
- Check `pg_hba.conf` for authentication method
- Ensure user has database permissions

### Migration Issues

**Problem**: Migration failed

```bash
# Check migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --rolled-back <migration_name>

# Or reset and start fresh (development only)
npm run db:reset
```

**Problem**: Out of sync schema

```bash
# Generate new migration from current schema
npm run db:migrate

# Or push changes without migration (dev only)
npm run db:push
```

### Performance Issues

**Problem**: Slow queries

1. **Check indexes**:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users';
   ```

2. **Analyze query plans**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
   ```

3. **Add missing indexes** in schema:
   ```prisma
   @@index([field_name])
   ```

**Problem**: Too many connections

- Implement connection pooling (PgBouncer)
- Reduce `connection_limit` in connection string
- Scale database instance

### Data Issues

**Problem**: Need to reset database

```bash
# WARNING: This deletes all data
npm run db:reset
```

**Problem**: Need to re-seed specific data

Edit `prisma/seed.ts` to only seed required data, then:
```bash
npm run db:seed
```

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong passwords** - Minimum 16 characters
3. **Restrict database access** - Use firewall rules
4. **Enable SSL connections** - Add `?sslmode=require` to connection string
5. **Regular backups** - Automated daily backups
6. **Audit logs** - All actions logged in `audit_logs` table
7. **Encrypted connections** - Use SSL/TLS in production

## Database Maintenance

### Regular Tasks

1. **Weekly**:
   - Check database size: `SELECT pg_size_pretty(pg_database_size('rto_compliance_hub'));`
   - Review slow queries
   - Verify backup integrity

2. **Monthly**:
   - Vacuum and analyze: `VACUUM ANALYZE;`
   - Update statistics: `ANALYZE;`
   - Review audit logs
   - Archive old data (soft-deleted records)

3. **Quarterly**:
   - Review indexes
   - Optimize queries
   - Capacity planning

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [ASQA RTO Standards](https://www.asqa.gov.au/standards)
- [Database Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

## Support

For database-related issues:
1. Check this documentation
2. Review Prisma logs
3. Check PostgreSQL logs: `/var/log/postgresql/`
4. Consult the development team
