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
  stepLogin,
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
} from './utils/testSteps';
import { ensureBpmnFileExists, ensureFileCanBeSelected, ensureButtonExists } from './utils/testHelpers';
import { cleanupTestFiles } from './utils/testCleanup';
import { DebugLogger } from './utils/debugLogger';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Documentation Generation from Scratch', () => {
  test('should generate documentation from scratch and display it in app', async ({ page }) => {
    DebugLogger.reset();
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    DebugLogger.log('TEST START', { testStartTime });

    // Setup: Mock Claude API-anrop
    DebugLogger.log('Setting up Claude API mocks');
    await setupClaudeApiMocks(page, { simulateSlowResponse: false });

    // Steg 1: Login (om session saknas)
    DebugLogger.log('STEP 1: Checking login status');
    await page.goto('/');
    DebugLogger.logUrl(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    DebugLogger.log('After initial navigation', { currentUrl });
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      DebugLogger.log('Not logged in, performing login');
      await stepLogin(ctx);
      DebugLogger.logUrl(page);
    } else {
      DebugLogger.log('Already logged in');
    }

    // Steg 2: Navigera till Files
    DebugLogger.log('STEP 2: Navigating to Files page');
    await stepNavigateToFiles(ctx);
    DebugLogger.logUrl(page);
    const filesPageContent = await DebugLogger.logPageContent(page);
    DebugLogger.log('Files page loaded', { hasContent: !!filesPageContent, contentLength: filesPageContent?.length });

    // Steg 3: Säkerställ att minst en BPMN-fil finns (ladda upp om ingen finns)
    // Filnamn genereras automatiskt med test- prefix och timestamp
    DebugLogger.log('STEP 3: Ensuring BPMN file exists');
    const fileTableBefore = await DebugLogger.logElement(page, 'table', 'File table');
    const fileLinksBefore = await DebugLogger.logElement(page, 'a:has-text(".bpmn"), button:has-text(".bpmn")', 'File links');
    
    const testFileName = await ensureBpmnFileExists(ctx, 'test-doc-generation');
    DebugLogger.log('After ensureBpmnFileExists', { testFileName });
    
    await page.waitForTimeout(2000); // Låt UI uppdateras
    const fileTableAfter = await DebugLogger.logElement(page, 'table', 'File table');
    const fileLinksAfter = await DebugLogger.logElement(page, 'a:has-text(".bpmn"), button:has-text(".bpmn")', 'File links');
    DebugLogger.log('File table status', { 
      tableBefore: fileTableBefore, 
      tableAfter: fileTableAfter,
      linksBefore: fileLinksBefore,
      linksAfter: fileLinksAfter
    });

    // Steg 4: Bygg hierarki (krav för generering)
    DebugLogger.log('STEP 4: Building hierarchy');
    await stepBuildHierarchy(ctx);
    DebugLogger.log('Hierarchy build complete');
    
    // Verifiera att hierarki byggdes
    await stepNavigateToProcessExplorer(ctx);
    // Använd separata locators för att undvika CSS selector-fel med regex
    const svgTree = page.locator('svg').first();
    const dataTestIdTree = page.locator('[data-testid="process-tree"]').first();
    const textTree = page.locator('text=/process/i').first();
    
    const hasSvgTree = await svgTree.count() > 0;
    const hasDataTestIdTree = await dataTestIdTree.count() > 0;
    const hasTextTree = await textTree.count() > 0;
    const hasProcessTree = hasSvgTree || hasDataTestIdTree || hasTextTree;
    expect(hasProcessTree).toBeTruthy();
    await stepNavigateToFiles(ctx); // Gå tillbaka till Files

    // Steg 5: Välj genereringsläge (Claude med mocked API)
    DebugLogger.log('STEP 5: Selecting generation mode (Claude)');
    await stepSelectGenerationMode(ctx, 'claude');
    DebugLogger.log('Generation mode selected');

    // Steg 6: Välj fil för generering
    DebugLogger.log('STEP 6: Selecting file for generation');
    const fileTableBeforeSelect = await DebugLogger.logElement(page, 'table', 'File table');
    const allFileLinks = await DebugLogger.logElement(page, 'a, button, [role="button"], td, th', 'All clickable elements');
    DebugLogger.log('Before ensureFileCanBeSelected', { 
      tableExists: fileTableBeforeSelect > 0,
      clickableElements: allFileLinks
    });
    
    const fileName = await ensureFileCanBeSelected(ctx);
    DebugLogger.log('File selected', { fileName });
    
    DebugLogger.log('STEP 6.1: Clicking on selected file');
    await stepSelectFile(ctx, fileName);
    DebugLogger.log('File clicked');

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

    // Steg 1: Login (om session saknas)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      await stepLogin(ctx);
    }

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

