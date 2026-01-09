# Scripts Directory

This directory contains automation scripts for the RTO Compliance Hub project.

## Deployment Scripts

### migrate.sh

Database migration runner for deployments.

**Usage:**
```bash
DATABASE_URL="postgresql://..." ./scripts/migrate.sh
```

**What it does:**
- Validates DATABASE_URL environment variable is set
- Runs Prisma migrations using `prisma migrate deploy`
- Reports success or failure status

**Exit codes:**
- 0: Success
- 1: Failure (missing DATABASE_URL or migration failed)

### validate-env.sh

Environment variable validation for deployments.

**Usage:**
```bash
# Set required variables first
export DATABASE_URL="postgresql://..."
export JWT_SECRET="secret"
export JWT_REFRESH_SECRET="secret"
export NODE_ENV="production"

# Run validation
./scripts/validate-env.sh
```

**What it checks:**
- **Required variables** (will exit with error if missing):
  - DATABASE_URL
  - JWT_SECRET
  - JWT_REFRESH_SECRET
  - NODE_ENV

- **Recommended variables** (warns if missing):
  - APP_PORT
  - FRONTEND_URL
  - REDIS_URL

**Exit codes:**
- 0: All required variables present
- 1: One or more required variables missing

### smoke-test.sh

Post-deployment smoke tests to verify application health.

**Usage:**
```bash
# Default (localhost:3000)
./scripts/smoke-test.sh

# Custom URL
BASE_URL=https://staging.example.com ./scripts/smoke-test.sh

# Custom retry settings
BASE_URL=https://example.com MAX_RETRIES=60 RETRY_DELAY=5 ./scripts/smoke-test.sh
```

**What it tests:**
1. **Health Check Endpoint**
   - Waits for application to be ready (with retries)
   - Verifies healthy status response
   - Checks database connectivity

2. **API Root Endpoint**
   - Verifies API is accessible

3. **Authentication Endpoints**
   - Checks auth/login endpoint responds correctly

4. **Standards Endpoint**
   - Verifies API endpoints are accessible

**Environment variables:**
- `BASE_URL` - Application URL (default: http://localhost:3000)
- `MAX_RETRIES` - Maximum health check attempts (default: 30)
- `RETRY_DELAY` - Seconds between retries (default: 2)

**Exit codes:**
- 0: All smoke tests passed
- 1: One or more tests failed

**Example output:**
```
🧪 Running smoke tests against http://localhost:3000

Test 1: Health Check Endpoint
✅ Health check endpoint is responding
   Response: {"status":"healthy","database":"connected",...}
✅ Application reports healthy status
✅ Database is connected

Test 2: API Root Endpoint
⚠️  API root endpoint returned an error (this might be expected)

Test 3: Authentication Endpoints
✅ Auth login endpoint is accessible (returned expected error code: 400)

Test 4: Standards Endpoint
✅ Standards endpoint is accessible (status: 200)

✅ All smoke tests passed!

Summary:
  - Health check: ✅
  - Database connectivity: ✅
  - API endpoints: ✅
  - Authentication: ✅

🎉 Deployment verification successful!
```

## Issue Management Scripts

## create-issues.js

Automatically creates GitHub issues from the gap analysis documented in `ISSUES_TO_CREATE.md`.

### Prerequisites

- Node.js installed
- GitHub personal access token with `repo` scope

### Usage

#### Dry Run (Preview)

Test the script without creating actual issues:

```bash
DRY_RUN=true GITHUB_TOKEN=your_token node scripts/create-issues.js
```

#### Create Issues

Actually create the issues in GitHub:

```bash
GITHUB_TOKEN=your_token node scripts/create-issues.js
```

#### Using gh CLI

If you have the GitHub CLI installed and authenticated:

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/create-issues.js
```

### What It Does

1. Reads `ISSUES_TO_CREATE.md` and parses all 25 issues
2. Creates necessary labels in the repository if they don't exist
3. Creates each issue with:
   - Numbered title (e.g., "#1: Set up PostgreSQL database with Prisma ORM")
   - Full description with acceptance criteria
   - Appropriate labels (priority, type, area)
   - "gap-analysis" label for tracking

### Features

- **Dry run mode**: Preview what will be created without making changes
- **Label management**: Automatically creates required labels
- **Error handling**: Continues creating issues even if one fails
- **Rate limiting**: Waits 1 second between creations to respect API limits
- **Progress tracking**: Shows detailed progress and summary

### Labels Created

The script creates the following labels if they don't exist:

**Priority Labels**:
- `priority: critical` (red)
- `priority: high` (orange)
- `priority: medium` (yellow)
- `priority: lower` (green)
- `priority: production` (blue)

**Type Labels**:
- `infrastructure`
- `backend`
- `frontend`
- `security`
- `database`
- `api`
- `integration`
- `enhancement`
- `testing`
- `documentation`
- `gap-analysis`

### Troubleshooting

**Error: GITHUB_TOKEN environment variable is required**
- Make sure you've set the GITHUB_TOKEN environment variable
- Get a token from: https://github.com/settings/tokens
- Token needs `repo` scope

**Error: No issues found in document**
- Ensure `ISSUES_TO_CREATE.md` exists in the project root
- Check that the document follows the expected format

**Error creating issues**
- Verify your token has the correct permissions
- Check that you have access to the repository
- Ensure you're not hitting rate limits

## CI/CD Integration

These scripts are used in the GitHub Actions workflows:

- **CI Pipeline** (.github/workflows/ci.yml): Runs tests and linting
- **Staging Deployment** (.github/workflows/deploy-staging.yml): Uses migrate.sh, validate-env.sh, smoke-test.sh
- **Production Deployment** (.github/workflows/deploy-production.yml): Uses all deployment scripts

See [CI_CD_DOCUMENTATION.md](../CI_CD_DOCUMENTATION.md) for complete CI/CD pipeline documentation.

## Future Scripts

Additional scripts that could be added:

- `update-issues.js` - Update existing issues based on changes in the document
- `close-issues.js` - Batch close completed issues
- `generate-project-board.js` - Create a project board from issues
- `sync-documentation.js` - Keep documentation in sync with code changes
- `backup-database.sh` - Create database backups before deployments
- `restore-database.sh` - Restore database from backup
- `health-check.sh` - Standalone health check script
- `deployment-status.sh` - Check deployment status across environments
