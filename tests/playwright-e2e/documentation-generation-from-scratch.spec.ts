/**
 * E2E test: Dokumentationsgenerering från scratch
 * 
 * Detta test verifierar hela flödet från identifiering av BPMN-filer till att
 * dokumentationen syns i appen, med mockade Claude API-anrop.
 * 
 * Flöde:
 * 1. Identifiera/ladda upp BPMN-filer
 * 2. Bygg hierarki
 * 3. Generera dokumentation (med mocked Claude API)
 * 4. Verifiera att dokumentation syns i appen
 * 5. Verifiera att dokumentation kan visas i Doc Viewer
 */

import { test, expect } from '@playwright/test';
import { setupClaudeApiMocks } from './fixtures/claudeApiMocks';
import {
  createTestContext,
  stepNavigateToFiles,
  stepUploadBpmnFile,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepSelectFile,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
  stepNavigateToDocViewer,
} from './utils/testSteps';
import { ensureBpmnFileExists, ensureFileCanBeSelected, ensureButtonExists } from './utils/testHelpers';
import { cleanupTestFiles } from './utils/testCleanup';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Documentation Generation from Scratch', () => {
  test('should generate documentation from scratch and display it in app', async ({ page }) => {
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Setup: Mock Claude API-anrop
    await setupClaudeApiMocks(page, { simulateSlowResponse: false });

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);

    // Steg 2: Säkerställ att minst en BPMN-fil finns (ladda upp om ingen finns)
    // Filnamn genereras automatiskt med test- prefix och timestamp
    const testFileName = await ensureBpmnFileExists(ctx, 'test-doc-generation');

    // Steg 3: Bygg hierarki (krav för generering)
    await stepBuildHierarchy(ctx);
    
    // Verifiera att hierarki byggdes
    await stepNavigateToProcessExplorer(ctx);
    const processTree = page.locator('svg, [data-testid="process-tree"], text=/process/i').first();
    const hasProcessTree = await processTree.count() > 0;
    expect(hasProcessTree).toBeTruthy();
    await stepNavigateToFiles(ctx); // Gå tillbaka till Files

    // Steg 4: Välj genereringsläge (Claude med mocked API)
    await stepSelectGenerationMode(ctx, 'claude');

    // Steg 5: Välj fil för generering
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Steg 6: Starta dokumentationsgenerering
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
      
      // Steg 7: Vänta på att generering är klar (med mocked API ska detta gå snabbt)
      await stepWaitForGenerationComplete(ctx, 30000); // 30 sekunder max
      
      // Steg 8: Verifiera resultat
      await stepVerifyGenerationResult(ctx);
      
      // Steg 9: Verifiera att dokumentation syns i GenerationDialog
      const resultDialog = page.locator(
        '[role="dialog"]:has-text("Generering Klar"), [role="dialog"]:has-text("Alla artefakter")'
      ).first();
      
      const hasResultDialog = await resultDialog.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResultDialog).toBeTruthy();
      
      // Steg 10: Navigera till Doc Viewer och verifiera att dokumentation faktiskt genererades
      const selectedFileName = fileName || 'test-doc-generation.bpmn';
      const bpmnFileName = selectedFileName.replace('.bpmn', '');
      
      await stepNavigateToDocViewer(ctx, selectedFileName, bpmnFileName);
      
      // Verifiera att dokumentation faktiskt laddades (kritiskt - faila om den saknas)
      const docContent = await page.textContent('body');
      expect(docContent).toBeTruthy();
      expect(docContent?.length).toBeGreaterThan(100);
      
      // Verifiera att dokumentation innehåller faktiskt innehåll (inte bara tom HTML)
      const hasActualContent = docContent && (
        docContent.includes('process') ||
        docContent.includes('task') ||
        docContent.includes('element') ||
        docContent.length > 500
      );
      expect(hasActualContent).toBeTruthy();
    }
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });

  test('should handle Claude API errors gracefully', async ({ page }) => {
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Setup: Mock Claude API med fel
    await setupClaudeApiMocks(page, { simulateError: true });

    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);
    
    // Välj fil
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Generate button should exist
    await ensureButtonExists(page,
      'button:has-text("Generera artefakter"), button:has-text("Generera")',
      'Generate button'
    );
    
    const generateButton = page.locator(
      'button:has-text("Generera artefakter"), button:has-text("Generera")'
    ).first();

    {
      await stepSelectGenerationMode(ctx, 'claude');
      await stepStartGeneration(ctx);
      
      // Vänta på felmeddelande
      await page.waitForTimeout(3000);
      
      // Verifiera att fel hanteras (antingen via error message eller dialog)
      const errorMessage = page.locator(
        'text=/error/i, text=/fel/i, text=/misslyckades/i, [role="alert"]'
      ).first();
      
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Fel ska hanteras gracefully (antingen via error message eller dialog stängs)
      expect(hasError || !(await generateButton.isVisible().catch(() => false))).toBeTruthy();
    }
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});

