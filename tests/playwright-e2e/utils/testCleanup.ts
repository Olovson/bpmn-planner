/**
 * Test Data Cleanup - Rensar testdata efter tester
 * 
 * ⚠️ VIKTIGT: Detta säkerställer att testdata inte påverkar produktionsdata
 * 
 * Rensar både BPMN-filer från databasen OCH dokumentationsfiler från Storage.
 */

import type { Page } from '@playwright/test';
import { isTestDataFile, extractTimestampFromTestFileName } from './testDataHelpers';

/**
 * Rensar alla test-filer som skapats under testet
 * 
 * @param page Playwright page instance
 * @param testStartTime Timestamp när testet startade (för att bara rensa testets egna filer)
 */
export async function cleanupTestFiles(
  page: Page,
  testStartTime?: number
): Promise<void> {
  try {
    // Navigera till files-sidan
    await page.goto('/#/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Hitta alla test-filer (med "test-" prefix)
    const testFileLinks = page.locator('a, button, [role="button"]').filter({ 
      hasText: /^test-\d+-\d+-.+\.bpmn$/ 
    });

    const testFileCount = await testFileLinks.count();
    
    if (testFileCount === 0) {
      return; // Inga test-filer att rensa
    }

    // Om testStartTime är satt, filtrera bara filer som skapades efter testet startade
    const filesToDelete: string[] = [];
    
    for (let i = 0; i < testFileCount; i++) {
      const fileLink = testFileLinks.nth(i);
      const fileName = await fileLink.textContent();
      
      if (fileName && isTestDataFile(fileName.trim())) {
        // Om testStartTime är satt, kontrollera att filen skapades efter testet startade
        if (testStartTime) {
          const fileTimestamp = extractTimestampFromTestFileName(fileName.trim());
          if (fileTimestamp && fileTimestamp >= testStartTime) {
            filesToDelete.push(fileName.trim());
          }
        } else {
          // Annars, rensa alla test-filer
          filesToDelete.push(fileName.trim());
        }
      }
    }

    // Ta bort varje test-fil från databasen (via UI)
    for (const fileName of filesToDelete) {
      try {
        // Hitta delete-knappen för denna fil
        const fileRow = page.locator(`tr:has-text("${fileName}")`).first();
        const deleteButton = fileRow.locator(
          'button:has-text("Ta bort"), button:has-text("Delete"), button[aria-label*="delete" i]'
        ).first();
        
        const deleteButtonCount = await deleteButton.count();
        if (deleteButtonCount > 0 && await deleteButton.isVisible().catch(() => false)) {
          // Klicka på delete-knappen
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Bekräfta borttagning (om dialog visas)
          const confirmButton = page.locator(
            'button:has-text("Bekräfta"), button:has-text("Confirm"), button:has-text("Ta bort")'
          ).first();
          
          const confirmButtonCount = await confirmButton.count();
          if (confirmButtonCount > 0 && await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (error) {
        // Logga men fortsätt med nästa fil
        console.warn(`⚠️  Could not delete test file "${fileName}":`, error);
      }
    }

    // Rensa dokumentationsfiler från Storage (använder Supabase client i browser context)
    if (filesToDelete.length > 0) {
      try {
        console.log(`🧹 Cleaning up documentation files from Storage for ${filesToDelete.length} test files...`);
        await cleanupTestDocumentationFromStorage(page, filesToDelete);
      } catch (error) {
        // Logga men faila inte testet
        console.warn('⚠️  Error during test documentation cleanup from Storage:', error);
      }
    }
  } catch (error) {
    // Logga men faila inte testet
    console.warn('⚠️  Error during test file cleanup:', error);
  }
}

/**
 * Rensar dokumentationsfiler från Supabase Storage för testfiler
 * 
 * Använder Supabase client i browser context för att rensa:
 * - docs/claude/{testFileName}/... (versioned paths)
 * - docs/claude/feature-goals/... (feature goals med testfilnamn)
 * - docs/claude/nodes/... (node docs med testfilnamn)
 * - tests/... (test files)
 * - llm-debug/... (debug files med testfilnamn)
 * 
 * @param page Playwright page instance
 * @param testFileNames Array av testfilnamn att rensa dokumentation för
 */
async function cleanupTestDocumentationFromStorage(
  page: Page,
  testFileNames: string[]
): Promise<void> {
  try {
    // Använd page.evaluate() för att köra kod i browser context där Supabase client finns
    const result = await page.evaluate(async (fileNames: string[]) => {
      // Använd Supabase client från appen (samma approach som bpmnMapTestHelper)
      const { supabase } = await import('/src/integrations/supabase/client');
      
      // Lista alla filer rekursivt i docs/claude, tests, och llm-debug
      async function listAllFiles(prefix: string): Promise<string[]> {
        const files: string[] = [];
        
        async function listRecursive(path: string) {
          try {
            const { data, error } = await supabase.storage
              .from('bpmn-files')
              .list(path, { limit: 1000, offset: 0 });
            
            if (error) {
              if (error.message?.includes('not found') || error.statusCode === 404) {
                return;
              }
              console.warn(`[cleanupTestDocumentationFromStorage] Error listing ${path}:`, error);
              return;
            }
            
            if (!data || data.length === 0) {
              return;
            }
            
            for (const item of data) {
              const fullPath = path ? `${path}/${item.name}` : item.name;
              const hasExtension = item.name.includes('.') && !item.name.endsWith('/');
              const hasSize = item.metadata?.size && item.metadata.size > 0;
              const isBpmnFile = item.name.endsWith('.bpmn');
              
              if (isBpmnFile) {
                // Försök lista innehållet - om det fungerar är det en mapp
                const { data: subData, error: subError } = await supabase.storage
                  .from('bpmn-files')
                  .list(fullPath, { limit: 1 });
                
                if (!subError && subData && subData.length > 0) {
                  await listRecursive(fullPath);
                } else if (hasSize) {
                  files.push(fullPath);
                } else {
                  await listRecursive(fullPath);
                }
              } else if (hasExtension || hasSize) {
                files.push(fullPath);
              } else {
                await listRecursive(fullPath);
              }
            }
          } catch (error) {
            console.warn(`[cleanupTestDocumentationFromStorage] Error in listRecursive for ${path}:`, error);
          }
        }
        
        await listRecursive(prefix);
        return files;
      }
      
      // KRITISKT: Whitelist av produktionsfiler som INTE får raderas
      const PRODUCTION_FILES = [
        'mortgage-se-application.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-credit-evaluation.bpmn',
        'mortgage-se-object-control.bpmn',
        'mortgage-se-object-information.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
        'mortgage-se-appeal.bpmn',
        'mortgage.bpmn',
      ];
      
      function isProductionFile(fileName: string): boolean {
        const normalized = fileName.toLowerCase();
        return PRODUCTION_FILES.some(prod => 
          normalized === prod.toLowerCase() || 
          normalized.includes(prod.toLowerCase().replace('.bpmn', ''))
        );
      }
      
      // Kontrollera om en fil är en testfil
      function isTestFile(filePath: string, testFileNames: string[]): boolean {
        const fileName = filePath.split('/').pop() || '';
        
        // KRITISKT: INTE radera produktionsfiler
        if (isProductionFile(fileName)) {
          console.warn(`[cleanupTestDocumentationFromStorage] SKIPPING production file: ${fileName}`);
          return false;
        }
        
        const testPattern = /test-\d+-\d+-/;
        const pathParts = filePath.split('/');
        
        // Kolla om path innehåller något av testfilnamnen
        for (const testFileName of testFileNames) {
          const baseName = testFileName.replace('.bpmn', '');
          if (filePath.includes(testFileName) || filePath.includes(baseName)) {
            return true;
          }
        }
        
        // Kolla om path matchar test-pattern
        return testPattern.test(filePath) || testPattern.test(fileName) || 
               pathParts.some(part => testPattern.test(part));
      }
      
      // Lista alla filer i relevanta mappar
      const docsFiles = await listAllFiles('docs/claude');
      const testFiles = await listAllFiles('tests');
      const debugFiles = await listAllFiles('llm-debug');
      
      // Filtrera testfiler
      const allFiles = [...docsFiles, ...testFiles, ...debugFiles];
      const testFilesToDelete = allFiles.filter(file => isTestFile(file, fileNames));
      
      if (testFilesToDelete.length === 0) {
        return { deleted: 0, errors: 0 };
      }
      
      // Ta bort filerna i batchar
      let deleted = 0;
      let errors = 0;
      const batchSize = 100;
      
      for (let i = 0; i < testFilesToDelete.length; i += batchSize) {
        const batch = testFilesToDelete.slice(i, i + batchSize);
        const { error } = await supabase.storage
          .from('bpmn-files')
          .remove(batch);
        
        if (error) {
          console.warn(`[cleanupTestDocumentationFromStorage] Error deleting batch:`, error);
          errors += batch.length;
        } else {
          deleted += batch.length;
        }
      }
      
      return { deleted, errors };
    }, testFileNames);
    
    if (result.deleted > 0) {
      console.log(`✅ Cleaned up ${result.deleted} documentation files from Storage`);
    }
    if (result.errors > 0) {
      console.warn(`⚠️  Errors cleaning up ${result.errors} documentation files from Storage`);
    }
  } catch (error) {
    console.warn('[cleanupTestDocumentationFromStorage] Error:', error);
  }
}

/**
 * Rensar alla testdata som är äldre än X minuter
 * 
 * @param page Playwright page instance
 * @param maxAgeMinutes Max ålder i minuter för testdata
 */
export async function cleanupOldTestData(
  page: Page,
  maxAgeMinutes: number = 60
): Promise<void> {
  try {
    await page.goto('/#/files');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const testFileLinks = page.locator('a, button, [role="button"]').filter({ 
      hasText: /^test-\d+-\d+-.+\.bpmn$/ 
    });

    const testFileCount = await testFileLinks.count();
    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    for (let i = 0; i < testFileCount; i++) {
      const fileLink = testFileLinks.nth(i);
      const fileName = await fileLink.textContent();
      
      if (fileName && isTestDataFile(fileName.trim())) {
        const fileTimestamp = extractTimestampFromTestFileName(fileName.trim());
        if (fileTimestamp && (now - fileTimestamp) > maxAgeMs) {
          // Filen är för gammal, ta bort den
          try {
            const fileRow = page.locator(`tr:has-text("${fileName.trim()}")`).first();
            const deleteButton = fileRow.locator(
              'button:has-text("Ta bort"), button:has-text("Delete")'
            ).first();
            
            if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await deleteButton.click();
              await page.waitForTimeout(500);
              
              const confirmButton = page.locator(
                'button:has-text("Bekräfta"), button:has-text("Confirm")'
              ).first();
              
              if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
                await page.waitForTimeout(1000);
              }
            }
          } catch (error) {
            console.warn(`⚠️  Could not delete old test file "${fileName}":`, error);
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Error during old test data cleanup:', error);
  }
}

