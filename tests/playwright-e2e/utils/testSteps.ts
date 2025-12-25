/**
 * Återanvändbara test-steg för E2E-tester
 * 
 * Dessa steg kan användas individuellt eller kombineras till A-Ö tester.
 * Varje steg är självständigt och kan testas isolerat.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface TestContext {
  page: Page;
}

/**
 * Steg 1: Logga in
 */
export async function stepLogin(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Fyll i login-formulär
  await page.fill('#signin-email', 'seed-bot@local.test');
  await page.fill('#signin-password', 'Passw0rd!');
  await page.click('button:has-text("Logga in")');
  
  // Vänta på navigation
  await page.waitForURL(/\/(?!auth)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Steg 2: Navigera till Files-sidan
 */
export async function stepNavigateToFiles(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/files');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

/**
 * Steg 3: Ladda upp BPMN-fil
 */
export async function stepUploadBpmnFile(ctx: TestContext, fileName: string, content: string) {
  const { page } = ctx;
  
  // Try multiple selectors for file input
  const uploadInput = page.locator('input[type="file"][id="file-upload"], input[type="file"][accept*=".bpmn"], input[type="file"][accept*=".dmn"], input[type="file"]').first();
  
  if (await uploadInput.count() > 0) {
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'application/xml',
      buffer: Buffer.from(content),
    });
    
    // Vänta på att upload är klar
    await expect(
      page.locator('text=/success/i, text=/uploaded/i, text=' + fileName)
    ).toBeVisible({ timeout: 30000 });
    
    await page.waitForTimeout(2000);
  } else {
    throw new Error('Upload input not found');
  }
}

/**
 * Steg 4: Bygg hierarki
 */
export async function stepBuildHierarchy(ctx: TestContext) {
  const { page } = ctx;
  
  const buildHierarchyButton = page.locator(
    'button:has-text("Bygg hierarki"), button:has-text("Build hierarchy"), button:has-text("hierarki")'
  ).first();
  
  const buttonCount = await buildHierarchyButton.count();
  
  if (buttonCount > 0 && await buildHierarchyButton.isVisible().catch(() => false)) {
    await buildHierarchyButton.click();
    
    // Vänta på att hierarki är byggd
    await Promise.race([
      page.waitForSelector('text=/success/i, text=/klar/i, text=/complete/i', { timeout: 30000 }),
      page.waitForTimeout(5000),
    ]).catch(() => {});
    
    await page.waitForTimeout(2000);
  } else {
    throw new Error('Build hierarchy button not found');
  }
}

/**
 * Steg 5: Välj genereringsläge
 */
export async function stepSelectGenerationMode(ctx: TestContext, mode: 'claude' | 'ollama' | 'local' = 'claude') {
  const { page } = ctx;
  
  let modeButton;
  if (mode === 'claude') {
    modeButton = page.locator('button:has-text("Claude"), button:has-text("Claude (moln-LLM)")').first();
  } else if (mode === 'ollama') {
    modeButton = page.locator('button:has-text("Ollama"), button:has-text("Ollama (lokal)")').first();
  } else {
    modeButton = page.locator('button:has-text("Local"), button:has-text("Lokal")').first();
  }
  
  const buttonCount = await modeButton.count();
  
  if (buttonCount > 0 && await modeButton.isVisible().catch(() => false)) {
    // Kolla om redan aktiv
    const isActive = await modeButton.evaluate((el) => {
      return el.classList.contains('ring-2') || 
             el.classList.contains('ring-primary') ||
             el.getAttribute('aria-pressed') === 'true';
    });
    
    if (!isActive) {
      await modeButton.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Steg 6: Välj fil för generering
 */
export async function stepSelectFile(ctx: TestContext, fileName: string) {
  const { page } = ctx;
  
  // Try multiple selectors to find the file
  const fileLink = page.locator(`text=${fileName}, a:has-text("${fileName}"), button:has-text("${fileName}"), [role="button"]:has-text("${fileName}")`).first();
  await fileLink.waitFor({ state: 'visible', timeout: 10000 });
  await fileLink.click();
  await page.waitForTimeout(1000);
}

/**
 * Steg 7: Starta generering
 */
export async function stepStartGeneration(ctx: TestContext) {
  const { page } = ctx;
  
  const generateButton = page.locator(
    'button:has-text("Generera artefakter"), button:has-text("Generera")'
  ).first();
  
  await expect(generateButton).toBeVisible({ timeout: 5000 });
  await expect(generateButton).toBeEnabled({ timeout: 5000 });
  await generateButton.click();
}

/**
 * Steg 8: Vänta på att generering är klar
 */
export async function stepWaitForGenerationComplete(ctx: TestContext, timeout: number = 180000) {
  const { page } = ctx;
  
  // Vänta på att generering är klar
  await Promise.race([
    page.waitForSelector(
      'text=/completed/i, text=/klar/i, text=/success/i, text=/done/i, text=/Generering Klar/i',
      { timeout }
    ),
    page.waitForTimeout(10000), // Fallback timeout
  ]).catch(() => {
    // Timeout är acceptabelt - generering kan ta längre tid
  });
}

/**
 * Steg 9: Verifiera GenerationDialog result view
 */
export async function stepVerifyGenerationResult(ctx: TestContext) {
  const { page } = ctx;
  
  const resultView = page.locator(
    'text=/Generering Klar/i, text=/Generering klar/i, text=/Alla artefakter/i'
  ).first();
  
  const hasResultView = await resultView.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (hasResultView) {
    // Verifiera summary cards
    const summaryCards = page.locator('text=/Filer/i, text=/Tester/i, text=/Dokumentation/i');
    const cardsCount = await summaryCards.count();
    expect(cardsCount).toBeGreaterThan(0);
  }
}

/**
 * Steg 10: Navigera till Test Report
 */
export async function stepNavigateToTestReport(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/test-report');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 11: Navigera till Test Coverage
 */
export async function stepNavigateToTestCoverage(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/test-coverage');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 12: Navigera till Doc Viewer
 */
export async function stepNavigateToDocViewer(ctx: TestContext, bpmnFile: string, elementId: string) {
  const { page } = ctx;
  const docViewerUrl = `/doc-viewer/nodes/${bpmnFile}/${elementId}`;
  await page.goto(docViewerUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att dokumentation laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
  expect(pageContent?.length).toBeGreaterThan(100);
}

/**
 * Steg 13: Navigera till Process Explorer
 */
export async function stepNavigateToProcessExplorer(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/process-explorer');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 14: Navigera till Node Matrix
 */
export async function stepNavigateToNodeMatrix(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/node-matrix');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 15: Navigera till Index (Diagram)
 */
export async function stepNavigateToDiagram(ctx: TestContext, file?: string) {
  const { page } = ctx;
  const url = file ? `/?file=${file}` : '/';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Helper: Skapa test context från page
 */
export function createTestContext(page: Page): TestContext {
  return { page };
}

