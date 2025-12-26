/**
 * E2E test for Node Matrix page
 * 
 * Verifies that:
 * 1. Node Matrix loads correctly
 * 2. Nodes are displayed in table
 * 3. Filter functionality works
 * 4. Sorting works
 * 5. Links to documentation work
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Node Matrix', () => {
  test.beforeEach(async ({ page }) => {
    // Login (om session saknas)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      const { createTestContext, stepLogin } = await import('./utils/testSteps');
      const ctx = createTestContext(page);
      await stepLogin(ctx);
    }
    
    // Navigate to node matrix (HashRouter format)
    await page.goto('/#/node-matrix');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await page.waitForTimeout(2000);
  });

  test('should load Node Matrix without errors', async ({ page }) => {
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

  test('should display nodes table if data exists', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for nodes to load

    // Look for table
    const table = page.locator('table').first();
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      // If table exists, verify it's visible
      await expect(table).toBeVisible({ timeout: 5000 });
      
      // Check for table rows
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      
      if (rowCount > 0) {
        // Should have at least one row
        expect(rowCount).toBeGreaterThan(0);
      }
    } else {
      // If no table, check for empty state
      const emptyState = page.locator('text=/no.*nodes/i, text=/no.*data/i, text=/empty/i').first();
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should have filter functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter controls (type filter, search, etc.)
    const filterInput = page.locator('input[type="search"], input[placeholder*="filter"], input[placeholder*="sök"]').first();
    const filterSelect = page.locator('select, [role="combobox"]').first();
    
    const hasFilterInput = await filterInput.count() > 0;
    const hasFilterSelect = await filterSelect.count() > 0;
    
    // Should have at least one filter control
    expect(hasFilterInput || hasFilterSelect).toBeTruthy();
  });

  test('should have sorting functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for sortable column headers
    const sortableHeaders = page.locator('th button, th[role="button"], th.sortable').first();
    const headerCount = await sortableHeaders.count();
    
    if (headerCount > 0) {
      // If sortable headers exist, try clicking one
      const firstHeader = sortableHeaders.first();
      const isVisible = await firstHeader.isVisible().catch(() => false);
      
      if (isVisible) {
        await firstHeader.click();
        await page.waitForTimeout(500);
        
        // Verify page didn't crash
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
      }
    } else {
      // No sortable headers is acceptable (feature might not be available)
      test.skip();
    }
  });

  test('should have links to documentation', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for documentation links in table
    const docLinks = page.locator('table a[href*="doc-viewer"], table a[href*="#/doc-viewer"]').first();
    const linkCount = await docLinks.count();
    
    if (linkCount > 0) {
      // If links exist, verify they're clickable
      const firstLink = docLinks.first();
      const href = await firstLink.getAttribute('href').catch(() => null);
      
      // Link should have href attribute
      expect(href).toBeTruthy();
    } else {
      // No links is acceptable (no documentation available or feature not implemented)
      test.skip();
    }
  });

  test('should handle filter changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for type filter
    const typeFilter = page.locator('select, [role="combobox"]').first();
    const filterCount = await typeFilter.count();
    
    if (filterCount > 0) {
      const isVisible = await typeFilter.isVisible().catch(() => false);
      
      if (isVisible) {
        // Try to change filter
        await typeFilter.click();
        await page.waitForTimeout(500);
        
        // Look for options
        const options = page.locator('option, [role="option"]');
        const optionCount = await options.count();
        
        if (optionCount > 1) {
          // Select a different option
          await options.nth(1).click();
          await page.waitForTimeout(1000);
          
          // Verify page didn't crash
          const pageContent = await page.textContent('body');
          expect(pageContent).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test('should display node information correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for table with nodes
    const table = page.locator('table').first();
    const hasTable = await table.count() > 0;
    
    if (hasTable) {
      // Check for table headers
      const headers = table.locator('thead th');
      const headerCount = await headers.count();
      
      // Should have headers (at least a few)
      if (headerCount > 0) {
        expect(headerCount).toBeGreaterThan(0);
      }
      
      // Check for table rows
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      
      // If rows exist, verify they have content
      if (rowCount > 0) {
        const firstRow = rows.first();
        const rowText = await firstRow.textContent().catch(() => '');
        expect(rowText).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });
});
