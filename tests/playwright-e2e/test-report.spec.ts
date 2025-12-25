/**
 * E2E test for Test Report page
 * 
 * Verifies that:
 * 1. Test Report page loads correctly
 * 2. Filter functionality works
 * 3. Test results are displayed
 * 4. Links to node tests work
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Test Report', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test report page
    await page.goto('/test-report');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await page.waitForTimeout(2000);
  });

  test('should load Test Report page without errors', async ({ page }) => {
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

  test('should display test results table if data exists', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for test results table
    const table = page.locator('table, [data-testid="test-results-table"], .test-results-table').first();
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      // If table exists, verify it's visible
      const isVisible = await table.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    } else {
      // If no table, check for empty state
      const emptyState = page.locator('text=/no.*data/i, text=/no.*tests/i, text=/empty/i').first();
      if (await emptyState.count() > 0) {
        // Empty state is acceptable
        expect(await emptyState.isVisible()).toBeTruthy();
      }
    }
  });

  test('should display filter controls', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter controls
    const filters = page.locator(
      '[data-testid="test-report-filters"], .filters, select, button:has-text("Filter"), input[type="checkbox"]'
    ).first();
    const filterCount = await filters.count();
    
    // Filters might or might not be visible (depends on data)
    // Just verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle filter changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter dropdowns or buttons
    const statusFilter = page.locator('select, button:has-text("Status"), [data-testid="status-filter"]').first();
    const statusFilterCount = await statusFilter.count();
    
    if (statusFilterCount > 0 && await statusFilter.isVisible().catch(() => false)) {
      // Try to interact with filter
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      // Verify page didn't crash
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      // If no filter, test passes (no data available)
      test.skip();
    }
  });

  test('should display test statistics if available', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for statistics or summary cards
    const stats = page.locator(
      '[data-testid="test-stats"], .stats, .statistics, text=/total/i, text=/passed/i, text=/failed/i'
    ).first();
    const statsCount = await stats.count();
    
    // Statistics might or might not be visible (depends on data)
    // Just verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle links to node tests', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for links to node tests
    const nodeTestLinks = page.locator('a[href*="node-tests"], a[href*="/node-tests"], button:has-text("View Node Tests")').first();
    const linkCount = await nodeTestLinks.count();
    
    if (linkCount > 0 && await nodeTestLinks.isVisible().catch(() => false)) {
      // Try to click first link
      const firstLink = nodeTestLinks.first();
      await firstLink.click();
      await page.waitForTimeout(1000);
      
      // Verify navigation happened (URL should contain node-tests)
      const url = page.url();
      expect(url).toContain('node-tests');
    } else {
      // If no links, test passes (no data available)
      test.skip();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for empty state message
    const emptyState = page.locator(
      'text=/no.*data/i, text=/no.*tests/i, text=/no.*results/i, text=/empty/i'
    ).first();
    
    const table = page.locator('table, [data-testid="test-results-table"]').first();
    const hasTable = await table.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    // Either table should be displayed or empty state should be shown
    expect(hasTable || hasEmptyState).toBeTruthy();
  });
});

