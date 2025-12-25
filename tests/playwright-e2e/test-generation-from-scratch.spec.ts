/**
 * E2E test: Testgenerering från scratch
 * 
 * Detta test verifierar hela flödet för testgenerering:
 * 1. Identifiera/ladda upp BPMN-filer
 * 2. Bygg hierarki
 * 3. Generera dokumentation (förutsättning för testgenerering)
 * 4. Generera tester (med mocked Claude API)
 * 5. Verifiera att tester syns i appen (Test Report, Test Coverage)
 * 
 * Detta test använder mockade Claude API-anrop för att göra testerna snabba och pålitliga.
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
  stepNavigateToProcessExplorer,
  stepNavigateToTestReport,
  stepNavigateToTestCoverage,
} from './utils/testSteps';
import { ensureBpmnFileExists, ensureFileCanBeSelected, ensureButtonExists } from './utils/testHelpers';
import { cleanupTestFiles } from './utils/testCleanup';
import { cleanupTestFiles } from './utils/testCleanup';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Test Generation from Scratch', () => {
  test('should generate tests from scratch and display them in app', async ({ page }) => {
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Setup: Mock Claude API-anrop
    await setupClaudeApiMocks(page, { simulateSlowResponse: false });

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);

    // Steg 2: Säkerställ att minst en BPMN-fil finns (ladda upp om ingen finns)
    // Filnamn genereras automatiskt med test- prefix och timestamp
    const testFileName = await ensureBpmnFileExists(ctx, 'test-generation');

    // Steg 3: Bygg hierarki (krav för generering)
    await stepBuildHierarchy(ctx);
    
    // Verifiera att hierarki byggdes (kolla Process Explorer)
    await stepNavigateToProcessExplorer(ctx);
    const processTree = page.locator('svg, [data-testid="process-tree"], text=/process/i').first();
    const hasProcessTree = await processTree.count() > 0;
    expect(hasProcessTree).toBeTruthy();
    await stepNavigateToFiles(ctx); // Gå tillbaka till Files

    // Steg 4: Välj genereringsläge (Claude med mocked API)
    await stepSelectGenerationMode(ctx, 'claude');

    // Steg 5: Välj fil för dokumentationsgenerering (krav för testgenerering)
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Steg 5a: Generera dokumentation FÖRST (krav för testgenerering)
    await ensureButtonExists(page,
      'button:has-text("Generera artefakter"), button:has-text("Generera")',
      'Generate button'
    );
    
    await stepStartGeneration(ctx);
    await stepWaitForGenerationComplete(ctx, 30000);
    await stepVerifyGenerationResult(ctx);
    
    // Verifiera att dokumentation faktiskt genererades (kolla Doc Viewer)
    const bpmnFileName = fileName.trim().replace('.bpmn', '');
    await stepNavigateToDocViewer(ctx, fileName, bpmnFileName);
    const docContent = await page.textContent('body');
    expect(docContent).toBeTruthy();
    expect(docContent?.length).toBeGreaterThan(100);
    await stepNavigateToFiles(ctx); // Gå tillbaka till Files
    
    // Välj fil igen för testgenerering
    await stepSelectFile(ctx, fileName);

    // Steg 6: Starta testgenerering (nu när dokumentation finns)
    // Generate tests button should exist if file is selected
    await ensureButtonExists(page,
      'button:has-text("Generera testinformation"), button:has-text("Generera tester"), button:has-text("test")',
      'Generate tests button'
    );
    
    const generateTestsButton = page.locator(
      'button:has-text("Generera testinformation"), button:has-text("Generera tester"), button:has-text("test")'
    ).first();

    {
      await generateTestsButton.click();
      
      // Vänta på att testgenerering är klar (med mocked API ska detta gå snabbt)
      const successMessage = await page.waitForSelector(
        'text=/success/i, text=/klar/i, text=/completed/i, text=/generated/i, text=/testgenerering klar/i',
        { timeout: 30000 }
      ).catch(() => null);
      
      if (!successMessage) {
        // Kolla om det finns ett felmeddelande om saknad dokumentation
        const errorMessage = page.locator(
          'text=/dokumentation saknas/i, text=/missing documentation/i, [role="alert"]'
        ).first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasError) {
          throw new Error('Test generation failed: Documentation is missing. This should not happen since we generated documentation first.');
        }
        
        throw new Error('Test generation did not complete successfully - no success message found');
      }

      // Steg 7: Verifiera att tester faktiskt genererades i Test Report
      await stepNavigateToTestReport(ctx);
      
      // Verifiera att test scenarios faktiskt visas
      const testScenarios = page.locator(
        'table, [data-testid="test-results-table"], text=/scenario/i'
      ).first();
      
      const hasScenarios = await testScenarios.count() > 0;
      expect(hasScenarios).toBeTruthy();
      
      // Verifiera att det finns minst en scenario-rad
      const scenarioRows = page.locator('table tbody tr, [data-testid="test-results-table"] tbody tr').first();
      const hasRows = await scenarioRows.count() > 0;
      expect(hasRows).toBeTruthy();

      // Steg 8: Verifiera att tester syns i Test Coverage
      await stepNavigateToTestCoverage(ctx);
      
      // Verifiera att E2E scenarios faktiskt visas
      const e2eScenarios = page.locator(
        'table, [data-testid="test-coverage-table"], text=/e2e/i, text=/scenario/i'
      ).first();
      
      const hasE2eScenarios = await e2eScenarios.count() > 0;
      expect(hasE2eScenarios).toBeTruthy();
    }
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });

  test('should handle test generation errors gracefully', async ({ page }) => {
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

    // Generate tests button should exist
    await ensureButtonExists(page,
      'button:has-text("Generera testinformation"), button:has-text("Generera tester")',
      'Generate tests button'
    );
    
    const generateTestsButton = page.locator(
      'button:has-text("Generera testinformation"), button:has-text("Generera tester")'
    ).first();

    {
      await stepSelectGenerationMode(ctx, 'claude');
      await generateTestsButton.click();
      
      // Vänta på felmeddelande
      await page.waitForTimeout(3000);
      
      // Verifiera att fel hanteras
      const errorMessage = page.locator(
        'text=/error/i, text=/fel/i, text=/misslyckades/i, [role="alert"]'
      ).first();
      
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Fel ska hanteras gracefully
      expect(hasError || !(await generateTestsButton.isVisible().catch(() => false))).toBeTruthy();
    }
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});

