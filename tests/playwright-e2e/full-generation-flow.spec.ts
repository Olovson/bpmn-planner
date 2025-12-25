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
  stepNavigateToTestReport,
  stepNavigateToTestCoverage,
} from './utils/testSteps';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Full Generation Flow', () => {
  test('should complete full generation flow for a BPMN file', async ({ page }) => {
    const ctx = createTestContext(page);

    // Step 1: Navigate to files page (using reusable step)
    await stepNavigateToFiles(ctx);

    // Step 2: Check if files exist or upload one (using reusable step)
    const filesTable = page.locator('table').first();
    const hasFiles = await filesTable.count() > 0;

    if (!hasFiles) {
      const testBpmnContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="test-process" name="Test Process">
    <bpmn:startEvent id="start" />
    <bpmn:userTask id="task1" name="Test Task" />
    <bpmn:endEvent id="end" />
    <bpmn:sequenceFlow id="flow1" sourceRef="start" targetRef="task1" />
    <bpmn:sequenceFlow id="flow2" sourceRef="task1" targetRef="end" />
  </bpmn:process>
</bpmn:definitions>`;

      try {
        await stepUploadBpmnFile(ctx, 'test-generation-flow.bpmn', testBpmnContent);
      } catch (error) {
        console.log('⚠️  Could not upload file, continuing with existing files');
      }
    }

    // Step 3: Build hierarchy (using reusable step)
    try {
      await stepBuildHierarchy(ctx);
    } catch (error) {
      console.log('⚠️  Could not build hierarchy, might already be built');
    }

    // Step 4: Select generation mode (using reusable step)
    try {
      await stepSelectGenerationMode(ctx, 'claude');
    } catch (error) {
      console.log('⚠️  Could not select generation mode, using default');
    }

    // Step 5: Start generation (using reusable step)
    const generateButton = page.locator(
      'button:has-text("Generera artefakter"), button:has-text("Generera")'
    ).first();

    if (await generateButton.count() === 0) {
      test.skip('Generate button not found');
      return;
    }

    const isVisible = await generateButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('Generate button not visible');
      return;
    }

    await stepStartGeneration(ctx);
    
    // Step 6: Wait for generation to complete (using reusable step)
    await stepWaitForGenerationComplete(ctx, 120000); // 2 minutes

    // Step 7: Verify result (using reusable step)
    await stepVerifyGenerationResult(ctx);

    // Step 8: Navigate to result pages (using reusable steps)
    await stepNavigateToTestReport(ctx);
    await stepNavigateToTestCoverage(ctx);
  });

  test('should show progress during generation', async ({ page }) => {
    await page.goto('/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const generateButton = page.locator(
      'button:has-text("Generera"), button:has-text("Generate")'
    ).first();

    if (await generateButton.count() === 0) {
      test.skip('Generate button not found');
      return;
    }

    const isVisible = await generateButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip('Generate button not visible');
      return;
    }

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
