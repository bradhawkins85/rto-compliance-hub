# Database Setup for JotForm Webhook Integration

This guide explains how to set up the database to support the JotForm webhook integration.

## Prerequisites

- PostgreSQL 12+ installed and running
- Database created (e.g., `rto_compliance_hub`)
- Environment variables configured in `.env`

## Setup Steps

### 1. Configure Environment

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Example:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rto_compliance_hub?schema=public"
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

This generates the Prisma Client based on `prisma/schema.prisma`.

### 3. Run Database Migration

The migration adds the `webhook_submissions` table required for webhook processing.

**Option A: Using Prisma Migrate (Development)**

```bash
npm run db:migrate
```

This will:
- Create the migration if it doesn't exist
- Apply the migration to your database
- Regenerate the Prisma Client

**Option B: Using Prisma Migrate Deploy (Production)**

```bash
npm run db:migrate:deploy
```

This applies pending migrations without creating new ones.

**Option C: Manual SQL (If needed)**

If you need to manually apply the migration:

```bash
psql $DATABASE_URL -f prisma/migrations/20251109120000_add_webhook_submission/migration.sql
```

### 4. Verify Migration

Check that the table was created:

```bash
npm run db:studio
```

Or using psql:

```sql
\dt webhook_submissions
\d webhook_submissions
```

### 5. (Optional) Seed Database

If you want to populate the database with sample data:

```bash
npm run db:seed
```

## Migration Details

The migration creates the `webhook_submissions` table with the following structure:

```sql
CREATE TABLE "webhook_submissions" (
    "id" TEXT PRIMARY KEY,
    "source" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "form_type" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "processing_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT UNIQUE (source, submission_id)
);
```

**Indexes created**:
- Unique index on `(source, submission_id)` for duplicate detection
- Index on `form_id` for filtering by form
- Index on `status` for filtering by status
- Index on `created_at` for time-based queries

## Troubleshooting

### Migration Already Applied

If you see "Migration already applied", the table already exists. You can skip this step.

### Connection Error

Verify your database is running:

```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Permission Error

Ensure your database user has permission to create tables:

```sql
GRANT ALL PRIVILEGES ON DATABASE rto_compliance_hub TO your_user;
```

### Reset Database (Development Only)

⚠️ **Warning**: This will delete all data!

```bash
npm run db:reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed scripts

## Testing the Setup

After migration, test the webhook endpoint:

```bash
# Start the server
npm run dev:server

# In another terminal, test the webhook
node server/test/test-webhook.js learner
```

Check the database to verify the submission was stored:

```sql
SELECT * FROM webhook_submissions ORDER BY created_at DESC LIMIT 5;
```

You should see the test submission with:
- `source = 'jotform'`
- `submission_id = 'learner-123456789'`
- `status = 'Completed'` (after processing)

## Production Deployment

For production deployment:

1. **Backup Database**: Always backup before migrations
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migration**: Use the deploy command
   ```bash
   npm run db:migrate:deploy
   ```

3. **Verify**: Check the migration was applied
   ```bash
   npm run db:studio
   ```

4. **Rollback Plan**: Keep the backup for rollback if needed

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JotForm Webhook Integration Guide](../JOTFORM_WEBHOOK_INTEGRATION.md)
