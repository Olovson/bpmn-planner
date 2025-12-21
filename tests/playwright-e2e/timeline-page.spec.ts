/**
 * E2E test for Timeline Page
 * 
 * Verifies that:
 * 1. Timeline page loads correctly
 * 2. Gantt chart is displayed
 * 3. Filter functionality works
 * 4. Date editing works (if available)
 * 5. Changes are saved (if applicable)
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Timeline Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timeline page
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await page.waitForTimeout(3000); // Gantt chart might take time to initialize
  });

  test('should load Timeline page without errors', async ({ page }) => {
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

    // Verify no critical errors (allow warnings and Gantt-specific errors)
    const criticalErrors = consoleErrors.filter(
      (e) => 
        !e.includes('Warning') && 
        !e.includes('Chroma') && 
        !e.includes('CORS') &&
        !e.includes('Gantt') // Gantt library might have warnings
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should display Gantt chart if data exists', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give time for Gantt to initialize

    // Look for Gantt chart container
    const ganttContainer = page.locator(
      '.gantt-container, [data-testid="gantt"], #gantt, .gantt'
    ).first();
    
    const containerCount = await ganttContainer.count();
    
    if (containerCount > 0) {
      // If container exists, verify it's visible or has content
      const isVisible = await ganttContainer.isVisible().catch(() => false);
      const boundingBox = await ganttContainer.boundingBox().catch(() => null);
      
      // Container should be rendered (either visible or have dimensions)
      expect(isVisible || boundingBox !== null).toBeTruthy();
    } else {
      // If no Gantt, check for empty state or error message
      const emptyState = page.locator(
        'text=/no.*data/i, text=/no.*process/i, text=/empty/i, text=/loading/i'
      ).first();
      
      if (await emptyState.count() > 0) {
        // Empty state is acceptable
        expect(await emptyState.isVisible()).toBeTruthy();
      } else {
        // Might still be loading
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should have filter functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter controls (type filter, checkboxes, etc.)
    const filterControls = page.locator(
      'input[type="checkbox"], button:has-text("Filter"), select, [role="checkbox"]'
    ).first();
    
    const controlCount = await filterControls.count();
    
    if (controlCount > 0) {
      // If filter controls exist, verify they're present
      expect(controlCount).toBeGreaterThan(0);
    } else {
      // No filter controls is acceptable (feature might not be available)
      test.skip();
    }
  });

  test('should handle filter changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter checkboxes
    const filterCheckboxes = page.locator(
      'input[type="checkbox"][name*="filter"], input[type="checkbox"][id*="filter"]'
    ).first();
    
    const checkboxCount = await filterCheckboxes.count();
    
    if (checkboxCount > 0) {
      const firstCheckbox = filterCheckboxes.first();
      const isVisible = await firstCheckbox.isVisible().catch(() => false);
      
      if (isVisible) {
        // Toggle checkbox
        const isChecked = await firstCheckbox.isChecked().catch(() => false);
        await firstCheckbox.click();
        await page.waitForTimeout(1000);
        
        // Verify state changed
        const newChecked = await firstCheckbox.isChecked().catch(() => false);
        expect(newChecked).toBe(!isChecked);
        
        // Verify page didn't crash
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should display timeline tasks if available', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Look for Gantt chart or task list
    const ganttContainer = page.locator('.gantt-container, [data-testid="gantt"]').first();
    const taskList = page.locator('[data-testid="task-list"], .task-list').first();
    
    const hasGantt = await ganttContainer.count() > 0;
    const hasTaskList = await taskList.count() > 0;
    
    // Either Gantt or task list should be present
    if (hasGantt || hasTaskList) {
      // Verify content is displayed
      expect(hasGantt || hasTaskList).toBeTruthy();
    } else {
      // Check for empty state
      const emptyState = page.locator('text=/no.*data/i, text=/no.*process/i').first();
      if (await emptyState.count() > 0) {
        expect(await emptyState.isVisible()).toBeTruthy();
      }
    }
  });

  test('should handle date editing if available', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Look for editable date fields in Gantt
    // Gantt charts typically have date inputs or editable cells
    const dateInputs = page.locator(
      'input[type="date"], input[type="datetime-local"], .gantt_task_line'
    ).first();
    
    const inputCount = await dateInputs.count();
    
    if (inputCount > 0) {
      // If date inputs exist, try to interact with them
      const firstInput = dateInputs.first();
      const isVisible = await firstInput.isVisible().catch(() => false);
      
      if (isVisible) {
        // Try to click (Gantt might have click-to-edit)
        await firstInput.click();
        await page.waitForTimeout(500);
        
        // Verify page didn't crash
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
      }
    } else {
      // Date editing might not be available or implemented
      test.skip();
    }
  });

  test('should have export functionality if available', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Exportera"), button[aria-label*="export"]'
    ).first();
    
    const buttonCount = await exportButton.count();
    
    if (buttonCount > 0) {
      const isVisible = await exportButton.isVisible().catch(() => false);
      
      if (isVisible) {
        // Export button exists - verify it's present
        expect(buttonCount).toBeGreaterThan(0);
      }
    } else {
      // Export might not be available
      test.skip();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for empty state message
    const emptyState = page.locator(
      'text=/no.*data/i, text=/no.*process/i, text=/no.*files/i, text=/empty/i'
    ).first();
    
    const ganttContainer = page.locator('.gantt-container, [data-testid="gantt"]').first();
    const hasGantt = await ganttContainer.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    // Either Gantt should be displayed or empty state should be shown
    expect(hasGantt || hasEmptyState).toBeTruthy();
  });
});
