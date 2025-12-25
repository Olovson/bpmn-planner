/**
 * Helper-funktioner för att säkerställa att test-miljön är korrekt uppsatt
 * 
 * Dessa funktioner skapar det som behövs för att testerna ska kunna köras,
 * istället för att hoppa över tester med test.skip().
 * 
 * ⚠️ VIKTIGT: Alla testdata prefixas med "test-" och timestamp för att isolera från produktionsdata.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { stepUploadBpmnFile, createTestContext } from './testSteps';
import type { TestContext } from './testSteps';
import { generateTestFileName } from './testDataHelpers';

export type { TestContext };
export { createTestContext };

/**
 * Säkerställ att minst en BPMN-fil finns i databasen
 * Om ingen finns, laddar upp en test-fil med prefixad filnamn
 * 
 * ⚠️ VIKTIGT: Filnamn prefixas automatiskt med "test-" och timestamp för isolering
 */
export async function ensureBpmnFileExists(ctx: TestContext, fileName?: string): Promise<string> {
  const { page } = ctx;
  
  // Generera unikt test-filnamn med prefix och timestamp
  const testFileName = fileName ? generateTestFileName(fileName) : generateTestFileName('test-default');
  
  // Kolla om filer finns (bara test-filer, inte produktionsfiler)
  const filesTable = page.locator('table').first();
  const hasFiles = await filesTable.count() > 0;
  
  // Kolla om det finns test-filer specifikt
  const testFileLink = page.locator('a, button, [role="button"]').filter({ 
    hasText: /^test-\d+-\d+-.+\.bpmn$/ 
  }).first();
  const hasTestFiles = await testFileLink.count() > 0;
  
  if (!hasFiles || !hasTestFiles) {
    // Ladda upp en test-fil med prefixat filnamn
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
      await stepUploadBpmnFile(ctx, testFileName, testBpmnContent);
      await page.waitForTimeout(2000);
    } catch (error) {
      throw new Error(`Failed to upload test file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return testFileName;
}

/**
 * Säkerställ att en knapp finns och är synlig, annars faila med tydligt felmeddelande
 */
export async function ensureButtonExists(
  page: Page,
  buttonSelector: string,
  buttonName: string
): Promise<void> {
  const button = page.locator(buttonSelector).first();
  const buttonCount = await button.count();
  
  if (buttonCount === 0) {
    throw new Error(`${buttonName} not found. Selector: ${buttonSelector}`);
  }
  
  const isVisible = await button.isVisible().catch(() => false);
  if (!isVisible) {
    throw new Error(`${buttonName} exists but is not visible. Selector: ${buttonSelector}`);
  }
  
  const isEnabled = await button.isEnabled().catch(() => false);
  if (!isEnabled) {
    throw new Error(`${buttonName} exists but is disabled. Selector: ${buttonSelector}`);
  }
}

/**
 * Säkerställ att en fil kan väljas för generering
 * 
 * ⚠️ VIKTIGT: Prioriterar test-filer (med "test-" prefix) för att undvika att påverka produktionsdata
 */
export async function ensureFileCanBeSelected(ctx: TestContext): Promise<string> {
  const { page } = ctx;
  
  // Först säkerställ att minst en test-fil finns
  await ensureBpmnFileExists(ctx);
  
  // Prioritera test-filer (med "test-" prefix)
  const testFileLink = page.locator('a, button, [role="button"]').filter({ 
    hasText: /^test-\d+-\d+-.+\.bpmn$/ 
  }).first();
  
  const testFileCount = await testFileLink.count();
  if (testFileCount > 0) {
    const fileName = await testFileLink.textContent();
    if (fileName) {
      return fileName.trim();
    }
  }
  
  // Fallback: hitta vilken fil som helst (men varnar)
  const fileLink = page.locator('a, button, [role="button"]').filter({ 
    hasText: /\.bpmn$/ 
  }).first();
  
  const fileCount = await fileLink.count();
  if (fileCount === 0) {
    throw new Error('No BPMN files found to select for generation');
  }
  
  const fileName = await fileLink.textContent();
  if (!fileName) {
    throw new Error('File link found but has no text content');
  }
  
  // Varna om vi använder en icke-test-fil
  if (!fileName.startsWith('test-')) {
    console.warn(`⚠️  WARNING: Using non-test file "${fileName}" in test. This may affect production data!`);
  }
  
  return fileName.trim();
}

/**
 * Säkerställ att upload area finns
 */
export async function ensureUploadAreaExists(page: Page): Promise<void> {
  const uploadArea = page.locator('text=/ladda upp filer/i, text=/upload.*file/i, text=/dra.*släpp/i').first();
  const hasUploadArea = await uploadArea.count() > 0;
  
  if (!hasUploadArea) {
    throw new Error('Upload area not found on files page. This indicates the page did not load correctly.');
  }
  
  // Verifiera att file input finns
  const fileInput = page.locator('input[type="file"]').first();
  const inputCount = await fileInput.count();
  
  if (inputCount === 0) {
    throw new Error('File input not found in upload area. This indicates the FileUploadArea component did not render correctly.');
  }
}

