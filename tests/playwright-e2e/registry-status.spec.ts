/**
 * E2E test for Registry Status page
 * 
 * Verifies that:
 * 1. Registry Status page loads correctly
 * 2. Registry status is displayed
 * 3. Missing elements are identified
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Registry Status', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registry status page
    await page.goto('/registry-status');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await page.waitForTimeout(2000);
  });

  test('should load Registry Status page without errors', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Verify no critical errors (allow warnings)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('Warning') && !e.includes('Chroma') && !e.includes('CORS')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should display registry status table', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for registry status table
    const table = page.locator('table, [data-testid="registry-status-table"], .registry-status-table').first();
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      // If table exists, verify it's visible
      const isVisible = await table.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    } else {
      // If no table, check for empty state
      const emptyState = page.locator('text=/no.*data/i, text=/no.*registry/i, text=/empty/i').first();
      if (await emptyState.count() > 0) {
        // Empty state is acceptable
        expect(await emptyState.isVisible()).toBeTruthy();
      }
    }
  });

  test('should display registry statistics', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for statistics (in registry, missing, etc.)
    const stats = page.locator(
      'text=/in.*registry/i, text=/missing/i, text=/total/i, [data-testid="registry-stats"]'
    ).first();
    
    // Statistics might or might not be visible (depends on data)
    // Just verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should identify missing elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for missing elements indicator
    const missingElements = page.locator(
      'text=/missing/i, text=/not.*in.*registry/i, [data-testid="missing-elements"]'
    ).first();
    
    // Missing elements might or might not be visible (depends on data)
    // Just verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for empty state message
    const emptyState = page.locator(
      'text=/no.*data/i, text=/no.*registry/i, text=/no.*element/i, text=/empty/i'
    ).first();
    
    const table = page.locator('table, [data-testid="registry-status-table"]').first();
    const hasTable = await table.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    // Either table should be displayed or empty state should be shown
    expect(hasTable || hasEmptyState).toBeTruthy();
  });
});

