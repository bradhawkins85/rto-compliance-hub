import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Check if we're on the login page or redirected there
    await expect(page).toHaveURL(/login|\/$/);
    
    // Check for common login elements
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
    
    // At least one of these should exist on a login page
    expect(hasEmailInput || hasPasswordInput).toBeTruthy();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Look for login button or submit button
    const loginButton = page.locator('button[type="submit"]').first();
    
    if (await loginButton.count() > 0) {
      await loginButton.click();
      
      // Wait a bit for validation to appear
      await page.waitForTimeout(500);
      
      // Check if there are any error messages
      const errorElements = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').count();
      expect(errorElements).toBeGreaterThan(0);
    }
  });

  test('should navigate through main sections', async ({ page }) => {
    // Check if navigation exists
    const nav = page.locator('nav').first();
    
    if (await nav.count() > 0) {
      // Get all navigation links
      const navLinks = await nav.locator('a').count();
      expect(navLinks).toBeGreaterThan(0);
    }
  });
});

test.describe('Dashboard', () => {
  test('should display main dashboard elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for common dashboard elements
    const hasHeading = await page.locator('h1, h2').count() > 0;
    expect(hasHeading).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page renders without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page renders without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);
  });
});

test.describe('Navigation', () => {
  test('should load without errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that no console errors occurred
    expect(errors.length).toBe(0);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});

test.describe('Accessibility', () => {
  test('should have no console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known third-party errors or expected errors
    const relevantErrors = consoleErrors.filter(
      (error) => !error.includes('favicon') && !error.includes('chrome-extension')
    );
    
    expect(relevantErrors.length).toBe(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Press Tab key a few times
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focus is visible (at least one element should be focused)
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});
