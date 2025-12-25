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
- etc.

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
4. Hantera fel gracefully (använd try/catch eller returnera status)
5. Uppdatera denna README

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

