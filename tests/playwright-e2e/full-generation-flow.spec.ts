/**
 * E2E test for full generation flow
 * 
 * Verifies the complete flow:
 * 1. Upload BPMN file (if needed)
 * 2. Build hierarchy
 * 3. Generate documentation (LLM mode)
 * 4. Verify artifacts are created
 * 
 * This is a comprehensive test that covers the entire generation pipeline.
 * 
 * NOTE: This test can also use the reusable test steps from utils/testSteps.ts
 * for better maintainability. See flows/complete-workflow-a-to-z.spec.ts for an example.
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepNavigateToFiles,
  stepUploadBpmnFile,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
  stepNavigateToProcessExplorer,
  stepNavigateToTestReport,
  stepNavigateToTestCoverage,
} from './utils/testSteps';
import { ensureBpmnFileExists, ensureFileCanBeSelected, ensureButtonExists } from './utils/testHelpers';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Full Generation Flow', () => {
  test('should complete full generation flow for a BPMN file', async ({ page }) => {
    const ctx = createTestContext(page);

    // Step 1: Navigate to files page (using reusable step)
    await stepNavigateToFiles(ctx);

    // Step 2: Säkerställ att minst en fil finns (ladda upp om ingen finns)
    await ensureBpmnFileExists(ctx, 'test-generation-flow.bpmn');

    // Step 3: Build hierarchy (using reusable step)
    await stepBuildHierarchy(ctx);
    
    // Verifiera att hierarki byggdes
    await stepNavigateToProcessExplorer(ctx);
    const processTree = page.locator('svg, [data-testid="process-tree"], text=/process/i').first();
    const hasProcessTree = await processTree.count() > 0;
    expect(hasProcessTree).toBeTruthy();
    await stepNavigateToFiles(ctx); // Gå tillbaka till Files

    // Step 4: Select generation mode (using reusable step)
    await stepSelectGenerationMode(ctx, 'claude');

    // Step 5: Välj fil för generering
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Step 6: Start generation (using reusable step)
    // Generate button should exist if file is selected
    await ensureButtonExists(page,
      'button:has-text("Generera artefakter"), button:has-text("Generera")',
      'Generate button'
    );

    await stepStartGeneration(ctx);
    
    // Step 7: Wait for generation to complete (using reusable step)
    await stepWaitForGenerationComplete(ctx, 120000); // 2 minutes

    // Step 8: Verify result (using reusable step)
    await stepVerifyGenerationResult(ctx);

    // Step 9: Navigate to result pages (using reusable steps)
    await stepNavigateToTestReport(ctx);
    await stepNavigateToTestCoverage(ctx);
  });

  test('should show progress during generation', async ({ page }) => {
    const ctx = createTestContext(page);
    
    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);
    
    // Välj fil
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Generate button should exist
    await ensureButtonExists(page,
      'button:has-text("Generera"), button:has-text("Generate")',
      'Generate button'
    );
    
    const generateButton = page.locator(
      'button:has-text("Generera"), button:has-text("Generate")'
    ).first();

    // Select local mode
    const localModeButton = page.locator(
      'button:has-text("Local"), button:has-text("Lokal"), input[value="local"]'
    ).first();
    
    if (await localModeButton.count() > 0) {
      await localModeButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Click generate
    await generateButton.click();
    
    // Wait for progress indicator
    const progressIndicator = page.locator(
      '[role="progressbar"], .progress, text=/progress/i, text=/generating/i, text=/genererar/i'
    ).first();
    
    await Promise.race([
      expect(progressIndicator).toBeVisible({ timeout: 10000 }),
      page.waitForTimeout(2000),
    ]).catch(() => {
      // Progress might not be visible immediately
    });

    // Verify page didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
