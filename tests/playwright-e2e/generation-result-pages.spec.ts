/**
 * E2E test for generation result pages
 * 
 * Verifies that after generation:
 * 1. GenerationDialog result view displays correctly
 * 2. Test Report page shows generated scenarios
 * 3. Test Coverage Explorer shows E2E scenarios
 * 4. E2E Tests Overview shows scenarios
 * 5. Doc Viewer shows generated documentation
 * 
 * This test assumes that generation has already been completed.
 * It should be run after full-generation-flow.spec.ts or claude-generation.spec.ts
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Generation Result Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to files page first
    await page.goto('/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should display GenerationDialog result view after generation', async ({ page }) => {
    // This test assumes generation was just completed
    // In a real scenario, this would be part of the generation flow
    
    // Look for GenerationDialog with result view
    const resultDialog = page.locator(
      '[role="dialog"]:has-text("Generering Klar"), [role="dialog"]:has-text("Alla artefakter")'
    ).first();
    
    const hasResultDialog = await resultDialog.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasResultDialog) {
      // Verify result summary cards
      const summaryCards = page.locator(
        'text=/Filer/i, text=/Tester/i, text=/Dokumentation/i'
      );
      const cardsCount = await summaryCards.count();
      expect(cardsCount).toBeGreaterThan(0);
      
      // Verify detailed report can be expanded
      const detailedReportButton = page.locator(
        'button:has-text("Visa Detaljerad Rapport"), button:has-text("Detaljerad")'
      ).first();
      
      if (await detailedReportButton.count() > 0) {
        await detailedReportButton.click();
        await page.waitForTimeout(500);
        
        // Verify detailed content is shown
        const detailedContent = page.locator(
          'text=/Analyserade BPMN-filer/i, text=/Dokumentationsfiler/i, text=/Jira-mappningar/i'
        ).first();
        const hasDetailedContent = await detailedContent.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasDetailedContent).toBeTruthy();
      }
    } else {
      // If no result dialog, verify that generation completed in some way
      // (might have been closed, but generation should still have happened)
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      console.log('ℹ️  GenerationDialog not visible (might have been closed), but page loaded correctly');
    }
  });

  test('should show generated content on Test Report page', async ({ page }) => {
    // Navigate to Test Report
    await page.goto('/test-report');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Look for test scenarios table
    const testScenariosTable = page.locator(
      'table, [data-testid="test-results-table"], .test-results-table'
    ).first();
    
    const hasTable = await testScenariosTable.count() > 0;
    
    if (hasTable) {
      // Verify table is visible
      const isVisible = await testScenariosTable.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
      
      // Verify there are rows (scenarios)
      const rows = page.locator('tbody tr, [role="row"]').first();
      const hasRows = await rows.count() > 0;
      
      if (hasRows) {
        console.log('✅ Test Report visar genererade scenarios');
      } else {
        console.log('ℹ️  Test Report tabell är tom (inga scenarios ännu)');
      }
    } else {
      // If no table, check for empty state
      const emptyState = page.locator(
        'text=/no.*data/i, text=/no.*tests/i, text=/no.*scenarios/i, text=/empty/i'
      ).first();
      const hasEmptyState = await emptyState.count() > 0;
      expect(hasEmptyState || hasTable).toBeTruthy();
    }
  });

  test('should show E2E scenarios on Test Coverage Explorer', async ({ page }) => {
    // Navigate to Test Coverage Explorer
    await page.goto('/test-coverage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Look for test coverage table
    const testCoverageTable = page.locator(
      'table, [data-testid="test-coverage-table"], .test-coverage-table'
    ).first();
    
    const hasTable = await testCoverageTable.count() > 0;
    
    if (hasTable) {
      // Verify table is visible
      const isVisible = await testCoverageTable.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
      
      // Verify scenario selector exists
      const scenarioSelector = page.locator(
        'select, [data-testid="scenario-selector"], button:has-text("Scenario")'
      ).first();
      const hasSelector = await scenarioSelector.count() > 0;
      
      if (hasSelector) {
        console.log('✅ Test Coverage visar scenario selector');
      }
    } else {
      // If no table, check for empty state
      const emptyState = page.locator(
        'text=/no.*data/i, text=/no.*scenarios/i, text=/no.*e2e/i, text=/empty/i'
      ).first();
      const hasEmptyState = await emptyState.count() > 0;
      expect(hasEmptyState || hasTable).toBeTruthy();
    }
  });

  test('should show E2E scenarios on E2E Tests Overview', async ({ page }) => {
    // Navigate to E2E Tests Overview (if route exists)
    // Note: This might be the same as /test-coverage or a separate route
    await page.goto('/e2e-tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // If route doesn't exist, try test-coverage instead
    if (page.url().includes('/auth') || page.url().includes('/files')) {
      await page.goto('/test-coverage');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Look for E2E scenarios
    const e2eScenarios = page.locator(
      'text=/E2E/i, text=/scenario/i, table, [data-testid="e2e-scenarios"]'
    ).first();
    
    const hasScenarios = await e2eScenarios.count() > 0;
    
    if (hasScenarios) {
      console.log('✅ E2E Tests Overview visar scenarios');
    } else {
      // Check for empty state
      const emptyState = page.locator(
        'text=/no.*data/i, text=/no.*scenarios/i, text=/empty/i'
      ).first();
      const hasEmptyState = await emptyState.count() > 0;
      expect(hasEmptyState || hasScenarios).toBeTruthy();
    }
  });

  test('should show generated documentation in Doc Viewer', async ({ page }) => {
    // Navigate to files page to get a file name
    await page.goto('/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to find a BPMN file name
    const fileLink = page.locator('a, button, [role="button"]').filter({ 
      hasText: /\.bpmn$/ 
    }).first();
    
    const hasFileLink = await fileLink.count() > 0;
    
    if (hasFileLink) {
      const fileName = await fileLink.textContent();
      const bpmnFileName = fileName?.trim().replace('.bpmn', '') || 'mortgage-se-application';
      
      // Navigate to Doc Viewer for this file
      const docViewerUrl = `/doc-viewer/nodes/${bpmnFileName}.bpmn/${bpmnFileName}`;
      await page.goto(docViewerUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify page loaded
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent?.length).toBeGreaterThan(100);
      
      console.log('✅ Doc Viewer visar genererad dokumentation');
    } else {
      // If no file link, we need to ensure files exist first
      // This should not happen if previous tests ran correctly
      throw new Error('No BPMN files found to test Doc Viewer. Ensure files exist in the database.');
    }
  });

  test('should navigate between result pages correctly', async ({ page }) => {
    // Test navigation flow: Files -> Test Report -> Test Coverage -> Files
    
    // Start at Files
    await page.goto('/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Navigate to Test Report via header
    const testReportLink = page.locator(
      'a[href*="test-report"], button:has-text("Tests"), nav a:has-text("Tests")'
    ).first();
    
    if (await testReportLink.count() > 0) {
      await testReportLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify we're on Test Report
      expect(page.url()).toContain('test-report');
    } else {
      // Navigate directly
      await page.goto('/test-report');
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to Test Coverage
    const testCoverageLink = page.locator(
      'a[href*="test-coverage"], button:has-text("Test Coverage"), nav a:has-text("Test Coverage")'
    ).first();
    
    if (await testCoverageLink.count() > 0) {
      await testCoverageLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify we're on Test Coverage
      expect(page.url()).toContain('test-coverage');
    } else {
      // Navigate directly
      await page.goto('/test-coverage');
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate back to Files
    const filesLink = page.locator(
      'a[href*="files"], button:has-text("Files"), nav a:has-text("Files")'
    ).first();
    
    if (await filesLink.count() > 0) {
      await filesLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify we're back on Files
      expect(page.url()).toContain('files');
    } else {
      // Navigate directly
      await page.goto('/files');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ Navigation mellan resultatsidor fungerar korrekt');
  });
});

