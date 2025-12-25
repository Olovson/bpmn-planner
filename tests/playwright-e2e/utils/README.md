# Test Utils - Återanvändbara Test-Komponenter

## Översikt

Detta katalog innehåller återanvändbara test-komponenter som kan användas för att bygga A-Ö tester eller isolerade tester.

## Struktur

### `testSteps.ts`

Återanvändbara test-steg som kan kombineras till kompletta flöden.

**Exempel på steg:**
- `stepLogin()` - Loggar in användaren
- `stepNavigateToFiles()` - Navigerar till Files-sidan
- `stepUploadBpmnFile()` - Laddar upp en BPMN-fil
- `stepBuildHierarchy()` - Bygger hierarki
- `stepSelectGenerationMode()` - Väljer genereringsläge
- `stepStartGeneration()` - Startar generering
- `stepWaitForGenerationComplete()` - Väntar på att generering är klar
- `stepVerifyGenerationResult()` - Verifierar genereringsresultat
- `stepNavigateToTestReport()` - Navigerar till Test Report
- `stepNavigateToTestCoverage()` - Navigerar till Test Coverage
- `stepNavigateToDocViewer()` - Navigerar till Doc Viewer
- `stepNavigateToProcessExplorer()` - Navigerar till Process Explorer
- etc.

### `testHelpers.ts` ⭐ **NYTT**

Helper-funktioner för att säkerställa att test-miljön är korrekt uppsatt. Dessa funktioner ersätter onödiga `test.skip()` anrop och säkerställer att testerna faktiskt testar appens funktionalitet.

**Funktioner:**
- `ensureBpmnFileExists(ctx, fileName?)` - Säkerställer att minst en BPMN-fil finns (laddar upp om ingen finns)
- `ensureButtonExists(page, selector, name)` - Säkerställer att en knapp finns och är synlig (kastar Error om den saknas)
- `ensureFileCanBeSelected(ctx)` - Säkerställer att en fil kan väljas för generering
- `ensureUploadAreaExists(page)` - Säkerställer att upload area finns
- `createTestContext(page)` - Skapar test context från page

**Användning:**
```typescript
import { ensureBpmnFileExists, ensureButtonExists, createTestContext } from './utils/testHelpers';

test('my test', async ({ page }) => {
  const ctx = createTestContext(page);
  
  // Säkerställ att filer finns (laddar upp om de saknas)
  await ensureBpmnFileExists(ctx, 'my-file.bpmn');
  
  // Säkerställ att knapp finns (failar om den saknas)
  await ensureButtonExists(page, 'button:has-text("Generate")', 'Generate button');
  
  // ... resten av testet
});
```

**Fördelar:**
- ✅ Tester skapar automatiskt det som behövs
- ✅ Tester failar med tydliga felmeddelanden om något saknas
- ✅ Färre `test.skip()` anrop
- ✅ Bättre test coverage

## Användning

### Exempel 1: Använd individuella steg

```typescript
import { test } from '@playwright/test';
import { createTestContext, stepLogin, stepNavigateToFiles } from './utils/testSteps';

test('my custom test', async ({ page }) => {
  const ctx = createTestContext(page);
  
  await stepLogin(ctx);
  await stepNavigateToFiles(ctx);
  
  // ... skriv egen logik här
});
```

### Exempel 2: Bygg A-Ö test från steg

```typescript
import { test } from '@playwright/test';
import {
  createTestContext,
  stepNavigateToFiles,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
} from './utils/testSteps';

test('complete generation workflow', async ({ page }) => {
  const ctx = createTestContext(page);
  
  await stepNavigateToFiles(ctx);
  await stepBuildHierarchy(ctx);
  await stepSelectGenerationMode(ctx, 'claude');
  await stepStartGeneration(ctx);
  await stepWaitForGenerationComplete(ctx);
  await stepVerifyGenerationResult(ctx);
});
```

### Exempel 3: Kombinera steg med egen logik

```typescript
import { test } from '@playwright/test';
import { createTestContext, stepNavigateToFiles, stepBuildHierarchy } from './utils/testSteps';

test('custom workflow', async ({ page }) => {
  const ctx = createTestContext(page);
  
  await stepNavigateToFiles(ctx);
  await stepBuildHierarchy(ctx);
  
  // Egen logik här
  const customButton = page.locator('button:has-text("Custom")');
  await customButton.click();
  
  // ... mer egen logik
});
```

## Fördelar

1. **Återanvändbarhet** - Samma steg kan användas i flera tester
2. **Underhållbarhet** - Ändringar i ett steg påverkar alla tester som använder det
3. **Testbarhet** - Varje steg kan testas isolerat
4. **Flexibilitet** - Kan kombineras till A-Ö tester eller användas individuellt
5. **Läsbarhet** - Tester blir mer läsbara och lättare att förstå

## Lägga till nya steg

När du lägger till nya test-steg:

1. Skapa funktionen i `testSteps.ts`
2. Använd `TestContext` som parameter
3. Dokumentera vad steget gör
4. **VIKTIGT:** Verifiera att operationen faktiskt slutfördes (inte bara att den startade)
5. Hantera fel gracefully (kasta Error med tydligt felmeddelande, inte bara logga)
6. Uppdatera denna README

**Exempel på bra verifiering:**
```typescript
export async function stepBuildHierarchy(ctx: TestContext) {
  const { page } = ctx;
  
  const buildHierarchyButton = page.locator('button:has-text("Bygg hierarki")').first();
  await buildHierarchyButton.click();
  
  // Verifiera att hierarki faktiskt byggdes
  const successMessage = await page.waitForSelector(
    'text=/success/i, text=/klar/i, text=/complete/i',
    { timeout: 30000 }
  ).catch(() => null);
  
  if (!successMessage) {
    throw new Error('Hierarchy building did not complete successfully - no success message found');
  }
}
```

**Exempel:**

```typescript
/**
 * Steg X: Beskrivning av vad steget gör
 */
export async function stepMyNewStep(ctx: TestContext, param1: string) {
  const { page } = ctx;
  
  // Implementering här
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');
  
  // Verifiering
  const element = page.locator('text=Expected');
  await expect(element).toBeVisible();
}
```

