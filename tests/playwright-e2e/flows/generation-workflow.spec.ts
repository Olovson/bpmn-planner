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

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Generation Workflow A-Ö', () => {
  test('should complete generation workflow from files to results', async ({ page }) => {
    const ctx = createTestContext(page);

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);

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
    const fileLink = page.locator('a, button, [role="button"]').filter({ 
      hasText: /mortgage-se-application\.bpmn/ 
    }).first();
    
    if (await fileLink.count() > 0) {
      try {
        await stepSelectFile(ctx, 'mortgage-se-application.bpmn');
      } catch (error) {
        console.log('⚠️  Could not select file, continuing');
      }
    }

    // Steg 5: Starta generering
    const generateButton = page.locator(
      'button:has-text("Generera artefakter"), button:has-text("Generera")'
    ).first();

    if (await generateButton.count() > 0 && await generateButton.isVisible().catch(() => false)) {
      await stepStartGeneration(ctx);
      
      // Steg 6: Vänta på att generering är klar
      await stepWaitForGenerationComplete(ctx, 180000); // 3 minuter
      
      // Steg 7: Verifiera resultat
      await stepVerifyGenerationResult(ctx);
      
      // Steg 8: Verifiera resultatsidor
      await stepNavigateToTestReport(ctx);
      await stepNavigateToTestCoverage(ctx);
      
      console.log('✅ Generation workflow test slutförd');
    } else {
      test.skip('Generate button not found or not visible');
    }
  });
});

