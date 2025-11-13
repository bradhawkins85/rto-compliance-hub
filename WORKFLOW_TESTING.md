# GitHub Actions Workflow Test

This document describes how to test the GitHub Actions workflows locally before pushing.

## Testing Workflows Locally

You can use [act](https://github.com/nektos/act) to test GitHub Actions workflows locally.

### Install act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

### Test CI Workflow

```bash
# Test all jobs
act pull_request -W .github/workflows/ci.yml

# Test specific job
act pull_request -W .github/workflows/ci.yml -j lint
act pull_request -W .github/workflows/ci.yml -j build
act pull_request -W .github/workflows/ci.yml -j unit-tests

# With secrets
act pull_request -W .github/workflows/ci.yml --secret-file .secrets
```

### Test Deployment Workflows

```bash
# Test staging deployment
act push -W .github/workflows/deploy-staging.yml --secret-file .secrets

# Test production deployment
act push -W .github/workflows/deploy-production.yml --secret-file .secrets
```

### Secrets File Format

Create a `.secrets` file (don't commit this!):

```
CODECOV_TOKEN=your-codecov-token
STAGING_DATABASE_URL=postgresql://...
PRODUCTION_DATABASE_URL=postgresql://...
PRODUCTION_JWT_SECRET=your-secret
```

## Manual Workflow Testing

### 1. Lint & Type Check

```bash
npm run lint
npx tsc --noEmit
npx tsc -p server/tsconfig.json --noEmit
```

### 2. Build

```bash
npm run db:generate
npm run build
npm run build:server
```

### 3. Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires PostgreSQL)
npm run test:integration

# E2E tests
npm run playwright:install
npm run build
npm run test:e2e

# Coverage
npm run test:coverage
```

### 4. Security Checks

```bash
# Dependency audit
npm audit --audit-level=moderate

# Check for high/critical vulnerabilities
npm audit --audit-level=high
```

### 5. Docker Build

```bash
# Build image
docker build -t rto-compliance-hub:test .

# Test with docker-compose
docker-compose up --build
```

### 6. Deployment Scripts

```bash
# Environment validation
export DATABASE_URL="postgresql://..."
export JWT_SECRET="test-secret"
export JWT_REFRESH_SECRET="test-secret"
export NODE_ENV="test"
./scripts/validate-env.sh

# Database migration (requires DATABASE_URL)
./scripts/migrate.sh

# Smoke tests (requires running application)
./scripts/smoke-test.sh
```

## Workflow Debugging

### Enable Debug Logging

Add these secrets to your repository:
- `ACTIONS_STEP_DEBUG=true` - Enable step debug logging
- `ACTIONS_RUNNER_DEBUG=true` - Enable runner debug logging

### View Workflow Logs

1. Go to Actions tab
2. Select workflow run
3. Click on failed job
4. Expand failed step
5. Review logs

### Common Issues

**Issue: Workflow not triggering**
- Check branch name matches trigger conditions
- Verify paths filter if used
- Check if workflow file is in `.github/workflows/`

**Issue: Secrets not available**
- Verify secrets are set in repository settings
- Check secret names match exactly (case-sensitive)
- Ensure workflow has necessary permissions

**Issue: Job dependencies failing**
- Check `needs` declarations
- Verify all dependent jobs succeed
- Review job matrix if used

**Issue: Docker build fails in CI**
- Test build locally first
- Check .dockerignore is correct
- Verify all required files are included
- Check for platform-specific issues

## Workflow Best Practices

### Caching

All workflows use npm cache for faster runs:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

Docker builds also use GitHub Actions cache:
```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Parallel Execution

Jobs run in parallel unless dependencies specified:
```yaml
jobs:
  lint: ...
  build: ...
  test:
    needs: [build]  # Wait for build to complete
```

### Conditional Execution

Use `if` conditions for conditional steps:
```yaml
- name: Upload coverage
  if: always()  # Run even if previous steps fail
  
- name: Deploy
  if: github.ref == 'refs/heads/main'  # Only on main branch
```

### Artifact Management

Upload/download artifacts between jobs:
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-artifacts
    path: dist/
    retention-days: 7
```

### Security

- Never log secrets
- Use GitHub Secrets for sensitive data
- Limit permissions with `permissions:` block
- Review third-party actions before using
- Pin action versions with commit SHA

## Monitoring Workflows

### Metrics to Track

- Success rate
- Average duration
- Failed job frequency
- Artifact size
- Cache hit rate

### Alerts

Set up notifications for:
- Workflow failures
- Deployment failures
- Long-running jobs
- Exceeded quotas

### GitHub Status API

Check workflow status programmatically:
```bash
gh api repos/:owner/:repo/actions/runs \
  --jq '.workflow_runs[0] | {status, conclusion, created_at}'
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [act - Local Workflow Testing](https://github.com/nektos/act)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
