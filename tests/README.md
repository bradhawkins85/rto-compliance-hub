# Test Suite Documentation

This document provides comprehensive guidance on running and writing tests for the RTO Compliance Hub application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The test suite includes three types of tests:

1. **Unit Tests**: Test individual functions, components, and utilities in isolation
2. **Integration Tests**: Test API endpoints and database interactions
3. **End-to-End (E2E) Tests**: Test complete user journeys across the application

### Technologies Used

- **Vitest**: Fast unit testing framework with native ESM support
- **React Testing Library**: Testing React components with user-centric approach
- **Supertest**: HTTP assertion library for API testing
- **Playwright**: Cross-browser E2E testing framework
- **Vitest Coverage (V8)**: Code coverage reporting

## Test Structure

```
tests/
├── unit/                      # Unit tests
│   ├── components/           # React component tests
│   ├── services/             # Service layer tests
│   ├── utils/                # Utility function tests
│   └── validation/           # Validation schema tests
├── integration/              # Integration tests
│   ├── api/                  # API endpoint tests
│   ├── database/             # Database query tests
│   └── workflows/            # Business workflow tests
├── e2e/                      # End-to-end tests
│   └── journeys/             # User journey tests
├── fixtures/                 # Static test data
│   └── data.ts               # Test fixtures
├── factories/                # Test data generators
│   └── index.ts              # Factory functions
└── setup.ts                  # Test environment setup
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### Watch Mode

Run tests in watch mode for development:

```bash
npm run test:watch
```

### With UI

Open Vitest UI for interactive testing:

```bash
npm run test:ui
```

### Coverage Report

Generate and view test coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory and can be viewed in your browser at `coverage/index.html`.

### E2E Test Options

Run E2E tests with UI:

```bash
npm run test:e2e:ui
```

Run E2E tests in headed mode (see browser):

```bash
npm run test:e2e:headed
```

Debug E2E tests:

```bash
npm run test:e2e:debug
```

## Writing Tests

### Unit Tests

Unit tests should be placed in the `tests/unit/` directory, mirroring the source code structure.

#### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge Component', () => {
  it('should render compliant status', () => {
    render(<StatusBadge status="compliant" />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });
});
```

#### Utility Function Tests

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/helpers';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate('2024-01-15T00:00:00Z');
    expect(result).toContain('2024');
  });
});
```

### Integration Tests

Integration tests use Supertest to test API endpoints with a real database connection.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

describe('Auth API', () => {
  let app: Express;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    // Setup test app and database
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
  });
});
```

### E2E Tests

E2E tests use Playwright to test user journeys across browsers.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });
});
```

## Test Patterns and Best Practices

### Use Test Factories

Instead of hardcoding test data, use factories for flexibility:

```typescript
import { createUser, createPolicy } from '../factories';

const user = createUser({ email: 'custom@example.com' });
const policy = createPolicy({ title: 'Custom Policy' });
```

### Mock External Dependencies

Mock external services and APIs:

```typescript
import { vi } from 'vitest';

vi.mock('@server/services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
```

### Test User Behavior, Not Implementation

Focus on what users see and do:

```typescript
// ❌ Bad - testing implementation
expect(component.state.isLoading).toBe(false);

// ✅ Good - testing user experience
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

### Clean Up After Tests

Always clean up test data to prevent test pollution:

```typescript
afterEach(async () => {
  await prisma.testModel.deleteMany({
    where: { email: { contains: 'test-' } },
  });
});
```

## Test Coverage

### Coverage Thresholds

The project maintains the following coverage thresholds:

- **Branches**: ≥80%
- **Functions**: ≥80%
- **Lines**: ≥80%
- **Statements**: ≥80%

### Viewing Coverage

After running `npm run test:coverage`, open `coverage/index.html` in your browser to see:

- Overall coverage percentages
- File-by-file coverage breakdown
- Uncovered lines highlighted in source code
- Coverage trends over time

### Excluded from Coverage

The following are excluded from coverage requirements:

- Test files (`*.test.ts`, `*.spec.ts`)
- Configuration files (`*.config.ts`)
- Type definitions (`*.d.ts`)
- Mock data files
- Generated code (Prisma client)

## Continuous Integration

### GitHub Actions

Tests run automatically on every pull request and push to main branches:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test:coverage
      - name: Check coverage thresholds
        run: npm run test:coverage -- --reporter=json-summary
```

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests before commits:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit",
      "pre-push": "npm test"
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Tests Fail with Database Connection Error

Ensure your `DATABASE_URL` environment variable is set correctly in `.env.test`:

```bash
DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
```

#### E2E Tests Timeout

Increase the timeout in `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds
});
```

#### Coverage Thresholds Not Met

Run coverage with details to see which files need more tests:

```bash
npm run test:coverage -- --reporter=verbose
```

#### React Component Tests Fail

Ensure you're using `@testing-library/react` queries correctly:

```typescript
// ❌ Bad
expect(container.querySelector('.button')).toBeTruthy();

// ✅ Good
expect(screen.getByRole('button')).toBeInTheDocument();
```

### Debug Mode

#### Vitest Debug

```bash
# Run specific test in debug mode
node --inspect-brk ./node_modules/vitest/vitest.mjs run tests/unit/specific.test.ts
```

#### Playwright Debug

```bash
npm run test:e2e:debug
```

This opens the Playwright Inspector where you can step through tests.

### Getting Help

- Check the [Vitest documentation](https://vitest.dev/)
- Check the [Playwright documentation](https://playwright.dev/)
- Check the [Testing Library documentation](https://testing-library.com/)
- Review existing tests in the `tests/` directory for examples

## Best Practices Summary

1. **Write tests first** - Consider TDD for new features
2. **Test behavior, not implementation** - Focus on user experience
3. **Keep tests fast** - Mock external dependencies
4. **Use meaningful test descriptions** - Write clear `it()` statements
5. **One assertion per test** - Keep tests focused
6. **Clean up test data** - Prevent test pollution
7. **Use factories** - Generate realistic test data
8. **Run tests frequently** - Use watch mode during development
9. **Maintain high coverage** - Aim for ≥80% on all metrics
10. **Review coverage reports** - Identify untested code paths

## Contributing

When adding new features:

1. Write unit tests for new functions and components
2. Write integration tests for new API endpoints
3. Write E2E tests for new user flows
4. Ensure all tests pass: `npm test`
5. Check coverage: `npm run test:coverage`
6. Update this documentation if needed

---

**Last Updated**: November 2024  
**Maintained By**: Development Team
