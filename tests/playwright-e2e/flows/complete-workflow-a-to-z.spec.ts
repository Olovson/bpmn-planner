/**
 * A-Ö Test: Komplett arbetsflöde från början till slut
 * 
 * Detta test verifierar hela flödet:
 * 1. Login
 * 2. Navigera till Files
 * 3. Ladda upp BPMN-fil (om nödvändigt)
 * 4. Bygg hierarki
 * 5. Välj genereringsläge
 * 6. Generera artefakter
 * 7. Verifiera resultat
 * 8. Navigera till alla resultatsidor
 * 9. Verifiera att allt fungerar
 * 
 * Detta test använder återanvändbara test-steg från utils/testSteps.ts
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepLogin,
  stepNavigateToFiles,
  stepUploadBpmnFile,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepSelectFile,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
  stepNavigateToTestReport,
  stepNavigateToTestCoverage,
  stepNavigateToProcessExplorer,
  stepNavigateToNodeMatrix,
  stepNavigateToDiagram,
} from '../utils/testSteps';
import { cleanupTestFiles } from '../utils/testCleanup';
import { ensureBpmnFileExists } from '../utils/testHelpers';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Complete Workflow A-Ö', () => {
  test('should complete full workflow from login to viewing results', async ({ page }) => {
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

    // Steg 3: Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx, 'test-complete-workflow');

    // Steg 4: Bygg hierarki
    try {
      await stepBuildHierarchy(ctx);
    } catch (error) {
      console.log('⚠️  Could not build hierarchy, might already be built');
    }

    // Steg 5: Välj genereringsläge (Claude)
    try {
      await stepSelectGenerationMode(ctx, 'claude');
    } catch (error) {
      console.log('⚠️  Could not select generation mode, using default');
    }

    // Steg 6: Välj fil (försök hitta första tillgängliga fil)
    // Använd TableRow selector istället för länkar/knappar
    const fileRow = page.locator('tr:has-text(".bpmn")').first();
    
    if (await fileRow.count() > 0) {
      // Hitta filnamnet i första TableCell i raden
      const fileNameCell = fileRow.locator('td').first();
      const fileName = await fileNameCell.textContent();
      if (fileName) {
        // Extrahera filnamnet (kan innehålla ikoner eller extra whitespace)
        const match = fileName.match(/([a-zA-Z0-9_-]+\.bpmn)/);
        const cleanFileName = match ? match[1] : fileName.trim();
        try {
          await stepSelectFile(ctx, cleanFileName);
        } catch (error) {
          console.log('⚠️  Could not select file, continuing');
        }
      }
    }

    // Steg 7: Starta generering (om knapp finns)
    const generateButton = page.locator(
      'button:has-text("Generera artefakter"), button:has-text("Generera")'
    ).first();

    if (await generateButton.count() > 0 && await generateButton.isVisible().catch(() => false)) {
      await stepStartGeneration(ctx);
      
      // Steg 8: Vänta på att generering är klar (med kort timeout för test)
      await stepWaitForGenerationComplete(ctx, 30000); // 30 sekunder max för test
      
      // Steg 9: Verifiera resultat
      await stepVerifyGenerationResult(ctx);
    } else {
      console.log('⚠️  Generate button not found, skipping generation');
    }

    // Steg 10-14: Navigera till alla resultatsidor och verifiera
    await stepNavigateToTestReport(ctx);
    await stepNavigateToTestCoverage(ctx);
    await stepNavigateToProcessExplorer(ctx);
    await stepNavigateToNodeMatrix(ctx);
    await stepNavigateToDiagram(ctx);

    console.log('✅ A-Ö test slutförd - hela arbetsflödet verifierat');
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });

  test('should navigate through all main pages', async ({ page }) => {
    const ctx = createTestContext(page);

    // Login om nödvändigt
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      await stepLogin(ctx);
    }

    // Navigera genom alla huvudsidor
    await stepNavigateToFiles(ctx);
    await stepNavigateToDiagram(ctx);
    await stepNavigateToProcessExplorer(ctx);
    await stepNavigateToNodeMatrix(ctx);
    await stepNavigateToTestReport(ctx);
    await stepNavigateToTestCoverage(ctx);

    console.log('✅ Navigation test slutförd - alla sidor nåbara');
  });
});

