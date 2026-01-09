# CI/CD Pipeline Documentation

## Overview

This repository implements a comprehensive CI/CD pipeline using GitHub Actions for automated testing, security scanning, and deployment to staging and production environments.

## Pipeline Architecture

### 1. Continuous Integration (CI)

**Trigger:** Every pull request and push to `main` or `develop` branches

**Workflow:** `.github/workflows/ci.yml`

**Jobs:**
- **Lint & Type Check**: ESLint and TypeScript compilation verification
- **Build**: Frontend and backend build verification
- **Unit Tests**: Fast, isolated tests
- **Integration Tests**: Tests with PostgreSQL and Redis
- **Test Coverage**: Code coverage reporting (uploaded to Codecov)
- **E2E Tests**: Playwright end-to-end tests
- **CodeQL Security**: Automated security scanning
- **Dependency Check**: npm audit for vulnerabilities
- **Docker Build**: Verify Docker image builds successfully

**Status:** All jobs must pass before PR can be merged

### 2. Staging Deployment (CD)

**Trigger:** Push to `develop` branch

**Workflow:** `.github/workflows/deploy-staging.yml`

**Environment:** `staging`

**Steps:**
1. Build and push Docker image to GitHub Container Registry
2. Validate environment configuration
3. Run database migrations
4. Deploy to staging environment
5. Run health checks
6. Execute smoke tests
7. Send deployment notification

**Rollback:** Automatic rollback on failure

### 3. Production Deployment (CD)

**Trigger:** Push to `main` branch (requires manual approval)

**Workflow:** `.github/workflows/deploy-production.yml`

**Environment:** `production` (protected environment)

**Strategy:** Blue-Green Deployment

**Steps:**
1. Build and push Docker image to GitHub Container Registry
2. Validate environment configuration
3. Create database backup
4. Run database migrations
5. Deploy to "green" environment
6. Run health checks on green
7. Execute comprehensive smoke tests
8. Switch traffic progressively (10% → 50% → 100%)
9. Monitor for 5 minutes
10. Keep "blue" environment for 24 hours as backup
11. Send deployment notification

**Rollback:** Automatic rollback on failure with notification

## Prerequisites

### GitHub Secrets

Configure the following secrets in your repository settings:

#### Staging Environment
- `STAGING_DATABASE_URL` - PostgreSQL connection string
- `STAGING_JWT_SECRET` - JWT signing secret
- `STAGING_JWT_REFRESH_SECRET` - JWT refresh token secret

#### Production Environment
- `PRODUCTION_DATABASE_URL` - PostgreSQL connection string
- `PRODUCTION_JWT_SECRET` - JWT signing secret
- `PRODUCTION_JWT_REFRESH_SECRET` - JWT refresh token secret

#### Optional
- `CODECOV_TOKEN` - For coverage reporting

### GitHub Environment Protection

1. Go to Repository Settings → Environments
2. Create `staging` environment
3. Create `production` environment with required reviewers
4. Configure environment secrets for each

## Local Development

### Running with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Testing Scripts Locally

```bash
# Validate environment variables
./scripts/validate-env.sh

# Run database migrations
./scripts/migrate.sh

# Run smoke tests (requires running server)
BASE_URL=http://localhost:3000 ./scripts/smoke-test.sh
```

## Deployment Process

### Staging Deployment

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/my-feature`
4. Create PR targeting `develop`
5. Wait for CI checks to pass ✅
6. Get PR approval and merge
7. Automatic deployment to staging 🚀
8. Verify deployment at staging URL

### Production Deployment

1. Create PR from `develop` to `main`
2. Wait for CI checks to pass ✅
3. Get PR approval and merge
4. GitHub Actions workflow starts
5. **Manual approval required** - Review and approve deployment
6. Automatic blue-green deployment 🚀
7. Monitor deployment via GitHub Actions
8. Verify deployment at production URL

## Monitoring Deployments

### GitHub Actions UI

1. Go to repository → Actions tab
2. Select workflow run
3. View job logs and status
4. Download artifacts (coverage reports, test results)

### Deployment Status

Check the deployment status in:
- GitHub Actions run summary
- Environment deployment history
- Health check endpoint: `/health`

### Health Check

```bash
# Check application health
curl https://your-app-url.com/health

# Example response:
{
  "status": "healthy",
  "timestamp": "2024-11-13T09:38:20.750Z",
  "uptime": 12345.67,
  "database": "connected",
  "version": "1.0.0"
}
```

## Rollback Procedures

### Automatic Rollback

Both staging and production deployments include automatic rollback if:
- Health checks fail
- Smoke tests fail
- Deployment errors occur

### Manual Rollback (Production)

If issues are detected after deployment:

```bash
# Kubernetes example
kubectl rollout undo deployment/app -n production

# Or switch back to blue environment
kubectl patch service app -p '{"spec":{"selector":{"version":"blue"}}}' -n production
```

## Troubleshooting

### CI Pipeline Failures

**Lint Errors:**
```bash
# Run locally
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Type Errors:**
```bash
# Check frontend
npx tsc --noEmit

# Check backend
npx tsc -p server/tsconfig.json --noEmit
```

**Test Failures:**
```bash
# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

**Build Failures:**
```bash
# Build frontend
npm run build

# Build backend
npm run build:server
```

### Deployment Failures

**Check Logs:**
1. GitHub Actions → Failed workflow → Job logs
2. Application logs in deployment platform
3. Database migration logs

**Common Issues:**
- Database connection timeout → Check DATABASE_URL
- Missing secrets → Verify environment secrets
- Migration failure → Check migration files
- Health check timeout → Increase timeout or check application startup

### Docker Build Issues

```bash
# Build locally
docker build -t rto-compliance-hub:test .

# Test locally
docker-compose up --build

# Check container health
docker ps
docker logs <container-id>
```

## Security

### Dependency Scanning

- Automatic npm audit on every PR
- Blocks merge on critical vulnerabilities
- Weekly Dependabot updates

### CodeQL Analysis

- Runs on every PR and push
- Scans for security vulnerabilities
- Results in Security tab

### Secret Management

- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use environment-specific secrets

## Performance

### Build Optimization

- Multi-stage Docker builds
- Build cache using GitHub Actions cache
- Minimal production image size
- Only production dependencies in final image

### Deployment Speed

- Parallel CI jobs (typical: 5-8 minutes)
- Cached dependencies
- Incremental builds
- Fast health checks

## Best Practices

### Branch Strategy

```
main (production)
  └─ develop (staging)
      └─ feature/* (development)
```

### Commit Messages

Follow conventional commits:
```
feat: add user authentication
fix: resolve database connection issue
docs: update CI/CD documentation
chore: update dependencies
```

### PR Guidelines

1. Keep PRs small and focused
2. Ensure all CI checks pass
3. Add tests for new features
4. Update documentation
5. Get at least one approval

### Testing Strategy

1. **Unit tests**: Test individual functions/components
2. **Integration tests**: Test API endpoints with database
3. **E2E tests**: Test complete user flows
4. **Smoke tests**: Verify deployment health

## Maintenance

### Regular Tasks

- Review and update dependencies monthly
- Rotate secrets quarterly
- Review deployment logs weekly
- Update documentation as needed
- Monitor CI/CD metrics

### Monitoring Metrics

Track these metrics:
- CI success rate
- Average CI duration
- Deployment frequency
- Deployment success rate
- Time to detect issues
- Time to recover

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Database Migrations](https://www.prisma.io/docs/guides/migrate)

## Support

For issues or questions:
1. Check this documentation
2. Review GitHub Actions logs
3. Contact the DevOps team
4. Create an issue in the repository
