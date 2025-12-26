/**
 * Test Data Cleanup - Rensar testdata efter tester
 * 
 * ⚠️ VIKTIGT: Detta säkerställer att testdata inte påverkar produktionsdata
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

    // Ta bort varje test-fil
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
  } catch (error) {
    // Logga men faila inte testet
    console.warn('⚠️  Error during test file cleanup:', error);
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

