/**
 * Helper-funktioner för att säkerställa att test-miljön är korrekt uppsatt
 * 
 * Dessa funktioner skapar det som behövs för att testerna ska kunna köras,
 * istället för att hoppa över tester med test.skip().
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { stepUploadBpmnFile, createTestContext } from './testSteps';

export interface TestContext {
  page: Page;
}

/**
 * Säkerställ att minst en BPMN-fil finns i databasen
 * Om ingen finns, laddar upp en test-fil
 */
export async function ensureBpmnFileExists(ctx: TestContext, fileName: string = 'test-default.bpmn'): Promise<void> {
  const { page } = ctx;
  
  // Kolla om filer finns
  const filesTable = page.locator('table').first();
  const hasFiles = await filesTable.count() > 0;
  
  if (!hasFiles) {
    // Ladda upp en test-fil
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
      await stepUploadBpmnFile(ctx, fileName, testBpmnContent);
      await page.waitForTimeout(2000);
    } catch (error) {
      throw new Error(`Failed to upload test file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
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
 */
export async function ensureFileCanBeSelected(ctx: TestContext): Promise<string> {
  const { page } = ctx;
  
  // Först säkerställ att minst en fil finns
  await ensureBpmnFileExists(ctx);
  
  // Hitta en fil att välja
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

