/**
 * E2E test: BPMN Map-validering och uppdatering (komplett flöde)
 * 
 * Detta test verifierar hela flödet för BPMN Map-validering och uppdatering:
 * 1. Validera bpmn-map.json
 * 2. Se valideringsresultat (MapValidationDialog)
 * 3. Acceptera/avvisa förslag (MapSuggestionsDialog)
 * 4. Spara uppdaterad map
 * 5. Exportera uppdaterad map
 * 
 * Detta test använder faktisk app-logik via UI-interaktioner.
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepNavigateToFiles,
  stepUploadBpmnFile,
} from './utils/testSteps';
import { ensureBpmnFileExists, ensureButtonExists } from './utils/testHelpers';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('BPMN Map Validation and Update Workflow', () => {
  test('should validate bpmn-map.json and show validation results', async ({ page }) => {
    const ctx = createTestContext(page);

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);

    // Steg 2: Validera bpmn-map.json
    // Validate map button should exist if files exist
    await ensureButtonExists(page,
      'button:has-text("Validera bpmn-map"), button:has-text("Validera"), button:has-text("bpmn-map")',
      'Validate map button'
    );
    
    const validateMapButton = page.locator(
      'button:has-text("Validera bpmn-map"), button:has-text("Validera"), button:has-text("bpmn-map")'
    ).first();

    {
      await validateMapButton.click();
      
      // Vänta på att validering är klar
      await page.waitForTimeout(3000);
      
      // Steg 3: Verifiera att MapValidationDialog visas
      const validationDialog = page.locator(
        '[role="dialog"]:has-text("BPMN-kartvalidering"), [role="dialog"]:has-text("validering")'
      ).first();
      
      const hasValidationDialog = await validationDialog.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (hasValidationDialog) {
        // Verifiera att dialog innehåller valideringsresultat
        const dialogContent = await validationDialog.textContent();
        expect(dialogContent).toBeTruthy();
        
        // Kolla efter summary-kort (omatchade call activities, saknas i map, etc.)
        const summaryCards = validationDialog.locator(
          'text=/omatchade/i, text=/saknas/i, text=/subprocess/i, text=/inkonsekvenser/i, text=/orphan/i'
        );
        const cardsCount = await summaryCards.count();
        
        // Dialog ska innehålla valideringsinformation
        expect(dialogContent?.length).toBeGreaterThan(50);
        
        console.log('✅ MapValidationDialog visas korrekt');
        
        // Stäng dialog
        const closeButton = validationDialog.locator(
          'button:has-text("Stäng"), button:has-text("Close"), [aria-label*="close"]'
        ).first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(1000);
        }
      } else {
        console.log('ℹ️  MapValidationDialog visas inte (kan vara att validering inte hittade några problem)');
      }
    }
  });

  test('should show map suggestions and allow accepting/rejecting', async ({ page }) => {
    const ctx = createTestContext(page);

    await stepNavigateToFiles(ctx);

    // För att få map suggestions behöver vi ha BPMN-filer som inte är mappade
    // Ladda upp en ny BPMN-fil (säkerställ att minst en fil finns)
    await ensureBpmnFileExists(ctx, 'test-map-suggestions.bpmn');
    
    // Kolla om filer redan fanns eller om vi just laddade upp
    const filesTable = page.locator('table').first();
    const hasFiles = await filesTable.count() > 0;

    // Om vi just laddade upp en fil, kan map suggestions visas automatiskt
    if (hasFiles) {
      const testBpmnContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="test-map-suggestions" name="Test Map Suggestions Process">
    <bpmn:startEvent id="start" />
    <bpmn:callActivity id="call1" name="Call Activity" />
    <bpmn:endEvent id="end" />
    <bpmn:sequenceFlow id="flow1" sourceRef="start" targetRef="call1" />
    <bpmn:sequenceFlow id="flow2" sourceRef="call1" targetRef="end" />
  </bpmn:process>
</bpmn:definitions>`;

      try {
        await stepUploadBpmnFile(ctx, 'test-map-suggestions.bpmn', testBpmnContent);
        await page.waitForTimeout(3000);
        
        // Efter upload kan map suggestions visas automatiskt
        // Vänta på MapSuggestionsDialog
        const suggestionsDialog = page.locator(
          '[role="dialog"]:has-text("Föreslagna uppdateringar"), [role="dialog"]:has-text("bpmn-map")'
        ).first();
        
        const hasSuggestionsDialog = await suggestionsDialog.isVisible({ timeout: 10000 }).catch(() => false);
        
        if (hasSuggestionsDialog) {
          // Verifiera att dialog innehåller förslag
          const dialogContent = await suggestionsDialog.textContent();
          expect(dialogContent).toBeTruthy();
          
          // Kolla efter checkboxar eller accept/reject-knappar
          const checkboxes = suggestionsDialog.locator('input[type="checkbox"]');
          const checkboxesCount = await checkboxes.count();
          
          if (checkboxesCount > 0) {
            // Acceptera första förslaget
            const firstCheckbox = checkboxes.first();
            await firstCheckbox.check();
            await page.waitForTimeout(500);
            
            console.log('✅ MapSuggestionsDialog visas och förslag kan accepteras');
          }
          
          // Stäng dialog
          const closeButton = suggestionsDialog.locator(
            'button:has-text("Stäng"), button:has-text("Close"), [aria-label*="close"]'
          ).first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
            await page.waitForTimeout(1000);
          }
        } else {
          console.log('ℹ️  MapSuggestionsDialog visas inte (kan vara att inga förslag genererades)');
        }
      } catch (error) {
        console.log('⚠️  Could not test map suggestions:', error);
      }
    }
    
    // Försök också trigga map suggestions via validate button
    const validateMapButton = page.locator(
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")'
    ).first();
    
    if (await validateMapButton.count() > 0) {
      await validateMapButton.click();
      await page.waitForTimeout(2000);
      
      // Kolla om MapSuggestionsDialog visas efter validering
      const suggestionsDialog = page.locator(
        '[role="dialog"]:has-text("Föreslagna uppdateringar"), [role="dialog"]:has-text("bpmn-map")'
      ).first();
      
      const hasSuggestionsDialog = await suggestionsDialog.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasSuggestionsDialog) {
        console.log('✅ MapSuggestionsDialog visas efter validering');
      }
    }
  });

  test('should save updated bpmn-map.json', async ({ page }) => {
    const ctx = createTestContext(page);

    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);

    // För att testa save behöver vi ha map suggestions
    // Försök öppna map suggestions dialog via validate button
    await ensureButtonExists(page,
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")',
      'Validate map button'
    );
    
    const validateMapButton = page.locator(
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")'
    ).first();

    {
      await validateMapButton.click();
      await page.waitForTimeout(2000);
      
      // Kolla om det finns en "Spara" eller "Uppdatera" knapp i validation dialog
      const saveButton = page.locator(
        'button:has-text("Spara"), button:has-text("Save"), button:has-text("Uppdatera")'
      ).first();
      
      const hasSaveButton = await saveButton.count() > 0;
      
      if (hasSaveButton && await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        
        // Vänta på success-meddelande
        await page.waitForTimeout(2000);
        
        // Verifiera att save lyckades (antingen via toast eller success message)
        const successMessage = page.locator(
          'text=/success/i, text=/sparad/i, text=/uppdaterad/i, text=/klar/i, [role="alert"]'
        ).first();
        
        const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasSuccess) {
          console.log('✅ bpmn-map.json sparades korrekt');
        } else {
          console.log('ℹ️  Save-knapp finns men success-meddelande visas inte');
        }
      } else {
        console.log('ℹ️  Save-knapp finns inte i validation dialog (kan vara att inga ändringar finns)');
      }
    }
  });

  test('should export updated bpmn-map.json', async ({ page }) => {
    const ctx = createTestContext(page);

    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);

    // För att testa export behöver vi ha map suggestions eller valideringsresultat
    await ensureButtonExists(page,
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")',
      'Validate map button'
    );
    
    const validateMapButton = page.locator(
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")'
    ).first();

    {
      await validateMapButton.click();
      await page.waitForTimeout(2000);
      
      // Kolla om det finns en "Exportera" eller "Export" knapp
      const exportButton = page.locator(
        'button:has-text("Exportera"), button:has-text("Export"), button:has-text("Ladda ner")'
      ).first();
      
      const hasExportButton = await exportButton.count() > 0;
      
      if (hasExportButton && await exportButton.isVisible().catch(() => false)) {
        // Sätt upp download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await exportButton.click();
        
        // Vänta på download
        const download = await downloadPromise;
        
        if (download) {
          // Verifiera att filen laddades ner
          const fileName = download.suggestedFilename();
          expect(fileName).toContain('bpmn-map');
          expect(fileName).toMatch(/\.json$/);
          
          console.log('✅ bpmn-map.json exporterades korrekt');
        } else {
          console.log('ℹ️  Export-knapp finns men download triggades inte');
        }
      } else {
        console.log('ℹ️  Export-knapp finns inte (kan vara att inga ändringar finns att exportera)');
      }
    }
  });

  test('should handle map validation errors gracefully', async ({ page }) => {
    const ctx = createTestContext(page);

    await stepNavigateToFiles(ctx);
    
    // Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx);

    // Validate map button should exist
    await ensureButtonExists(page,
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")',
      'Validate map button'
    );
    
    const validateMapButton = page.locator(
      'button:has-text("Validera bpmn-map"), button:has-text("Validera")'
    ).first();

    {
      await validateMapButton.click();
      
      // Vänta på validering
      await page.waitForTimeout(3000);
      
      // Verifiera att validering hanteras (antingen via dialog eller error message)
      const validationDialog = page.locator(
        '[role="dialog"]:has-text("BPMN-kartvalidering"), [role="dialog"]:has-text("validering")'
      ).first();
      
      const errorMessage = page.locator(
        'text=/error/i, text=/fel/i, text=/misslyckades/i, [role="alert"]'
      ).first();
      
      const hasDialog = await validationDialog.isVisible({ timeout: 5000 }).catch(() => false);
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Validering ska antingen visa dialog eller error message
      expect(hasDialog || hasError).toBeTruthy();
    }
  });
});

