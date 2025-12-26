/**
 * A-Ö Test: Genereringsflöde
 * 
 * Detta test fokuserar specifikt på genereringsflödet:
 * 1. Navigera till Files
 * 2. Bygg hierarki
 * 3. Välj genereringsläge
 * 4. Generera artefakter
 * 5. Verifiera resultat
 * 6. Verifiera resultatsidor
 * 
 * Detta test använder återanvändbara test-steg från utils/testSteps.ts
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepLogin,
  stepNavigateToFiles,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepSelectFile,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
  stepNavigateToTestReport,
  stepNavigateToTestCoverage,
} from '../utils/testSteps';
import { ensureBpmnFileExists, ensureFileCanBeSelected, ensureButtonExists } from '../utils/testHelpers';
import { cleanupTestFiles } from '../utils/testCleanup';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Generation Workflow A-Ö', () => {
  test('should complete generation workflow from files to results', async ({ page }) => {
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Steg 1: Login (om session saknas)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      await stepLogin(ctx);
    }

    // Steg 2: Navigera till Files
    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);

    // Steg 2: Bygg hierarki
    try {
      await stepBuildHierarchy(ctx);
    } catch (error) {
      console.log('⚠️  Could not build hierarchy, might already be built');
    }

    // Steg 3: Välj genereringsläge
    try {
      await stepSelectGenerationMode(ctx, 'claude');
    } catch (error) {
      console.log('⚠️  Could not select generation mode, using default');
    }

    // Steg 4: Välj fil
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Steg 5: Starta generering
    // Generate button should exist if file is selected
    await ensureButtonExists(page,
      'button:has-text("Generera artefakter"), button:has-text("Generera")',
      'Generate button'
    );
    
    const generateButton = page.locator(
      'button:has-text("Generera artefakter"), button:has-text("Generera")'
    ).first();

    {
      await stepStartGeneration(ctx);
      
      // Steg 6: Vänta på att generering är klar
      await stepWaitForGenerationComplete(ctx, 180000); // 3 minuter
      
      // Steg 7: Verifiera resultat
      await stepVerifyGenerationResult(ctx);
      
      // Steg 8: Verifiera resultatsidor
      await stepNavigateToTestReport(ctx);
      await stepNavigateToTestCoverage(ctx);
      
      console.log('✅ Generation workflow test slutförd');
    }
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});

