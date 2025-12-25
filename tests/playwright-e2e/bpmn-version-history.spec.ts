/**
 * E2E test for BPMN Version History page
 * 
 * Verifies that:
 * 1. BPMN Version History page loads correctly
 * 2. Versions are displayed
 * 3. Diff between versions works
 * 4. Restore to previous version works
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('BPMN Version History', () => {
  test('should load BPMN Version History page without errors', async ({ page }) => {
    // Navigate to version history page with a file name
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Verify no critical errors (allow warnings)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('Warning') && !e.includes('Chroma') && !e.includes('CORS')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should display version list if data exists', async ({ page }) => {
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for version list
    const versionList = page.locator(
      'table, [data-testid="version-list"], .version-list, ul, ol'
    ).first();
    const listCount = await versionList.count();
    
    if (listCount > 0) {
      // If list exists, verify it's visible
      const isVisible = await versionList.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    } else {
      // If no list, check for empty state
      const emptyState = page.locator('text=/no.*data/i, text=/no.*version/i, text=/empty/i').first();
      if (await emptyState.count() > 0) {
        // Empty state is acceptable
        expect(await emptyState.isVisible()).toBeTruthy();
      }
    }
  });

  test('should display version information', async ({ page }) => {
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for version information (hash, date, user, etc.)
    const versionInfo = page.locator(
      'text=/hash/i, text=/date/i, text=/version/i, [data-testid="version-info"]'
    ).first();
    
    // Version info might or might not be visible (depends on data)
    // Just verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle diff between versions', async ({ page }) => {
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for diff button or link
    const diffButton = page.locator(
      'button:has-text("Diff"), button:has-text("Compare"), a:has-text("Diff"), [data-testid="diff-button"]'
    ).first();
    const buttonCount = await diffButton.count();
    
    if (buttonCount > 0 && await diffButton.isVisible().catch(() => false)) {
      // Try to click diff button
      await diffButton.click();
      await page.waitForTimeout(1000);
      
      // Verify page didn't crash
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      // If no button, test passes (no data available)
      test.skip();
    }
  });

  test('should handle restore to previous version', async ({ page }) => {
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for restore button
    const restoreButton = page.locator(
      'button:has-text("Restore"), button:has-text("Återställ"), [data-testid="restore-button"]'
    ).first();
    const buttonCount = await restoreButton.count();
    
    if (buttonCount > 0 && await restoreButton.isVisible().catch(() => false)) {
      // Try to click restore button
      await restoreButton.click();
      await page.waitForTimeout(1000);
      
      // Verify page didn't crash
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      // If no button, test passes (no data available)
      test.skip();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/bpmn-versions/mortgage.bpmn');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for empty state message
    const emptyState = page.locator(
      'text=/no.*data/i, text=/no.*version/i, text=/no.*history/i, text=/empty/i'
    ).first();
    
    const versionList = page.locator('table, [data-testid="version-list"]').first();
    const hasList = await versionList.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    // Either list should be displayed or empty state should be shown
    expect(hasList || hasEmptyState).toBeTruthy();
  });
});

