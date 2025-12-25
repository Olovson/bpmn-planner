# Guide: Skapa Nya UI E2E-tester

## ⚠️ KRITISKT: Test Data Isolation - MÅSTE FÖLJAS!

**🚨 ALLA nya tester MÅSTE följa dessa regler för att inte påverka produktionsdata!**

## Checklista för Nya Tester

### ✅ OBLIGATORISKT:

- [ ] Använder `testStartTime = Date.now()` i början av testet
- [ ] Använder `ensureBpmnFileExists()` eller `generateTestFileName()` för filnamn
- [ ] Använder `cleanupTestFiles(page, testStartTime)` i slutet av testet
- [ ] Verifierar att `VITE_SUPABASE_URL` pekar på lokal Supabase (inte produktion)

## Mall för Nytt Test

```typescript
/**
 * E2E test: [Beskrivning av vad testet gör]
 * 
 * Detta test verifierar:
 * 1. [Första verifieringen]
 * 2. [Andra verifieringen]
 * 3. [Tredje verifieringen]
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepNavigateToFiles,
  // ... andra steg du behöver
} from './utils/testSteps';
import { 
  ensureBpmnFileExists, 
  ensureFileCanBeSelected, 
  ensureButtonExists 
} from './utils/testHelpers';
import { cleanupTestFiles } from './utils/testCleanup';
import { generateTestFileName } from './utils/testDataHelpers';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('My New Test', () => {
  test('should do something', async ({ page }) => {
    // ✅ OBLIGATORISKT: Spara timestamp när testet startar
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Steg 1: Navigera till rätt sida
    await stepNavigateToFiles(ctx);

    // Steg 2: Säkerställ att testdata finns
    // ✅ RÄTT: Använd ensureBpmnFileExists() som prefixar automatiskt
    const testFileName = await ensureBpmnFileExists(ctx, 'my-test-file');
    
    // ELLER om du måste använda stepUploadBpmnFile direkt:
    // ✅ RÄTT: Generera prefixat filnamn först
    // const testFileName2 = generateTestFileName('my-test-file');
    // await stepUploadBpmnFile(ctx, testFileName2, content);
    
    // ❌ FEL: Använd INTE direkt filnamn utan prefix
    // await stepUploadBpmnFile(ctx, 'my-file.bpmn', content); // FEL!

    // Steg 3: Utför test-åtgärder
    // ... din test-kod här ...

    // ✅ OBLIGATORISKT: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});
```

## Viktiga Regler

### 1. Test Data Prefixing (OBLIGATORISKT)

**Alla test-filer MÅSTE prefixas med `test-{timestamp}-{random}-{name}.bpmn`**

**Rätt sätt:**
```typescript
// ✅ Använd ensureBpmnFileExists() - prefixar automatiskt
const testFileName = await ensureBpmnFileExists(ctx, 'my-test-file');

// ✅ ELLER generera prefixat filnamn manuellt
const testFileName = generateTestFileName('my-test-file');
await stepUploadBpmnFile(ctx, testFileName, content);
```

**Fel sätt:**
```typescript
// ❌ FEL: Använd INTE direkt filnamn utan prefix
await stepUploadBpmnFile(ctx, 'my-file.bpmn', content); // FEL!
await ensureBpmnFileExists(ctx, 'my-file.bpmn'); // FEL! (använd utan .bpmn)
```

### 2. Test Data Cleanup (OBLIGATORISKT)

**Alla tester MÅSTE rensa testdata efter sig**

**Rätt sätt:**
```typescript
test('my test', async ({ page }) => {
  const testStartTime = Date.now(); // ✅ OBLIGATORISKT
  const ctx = createTestContext(page);
  
  // ... test-kod här ...
  
  // ✅ OBLIGATORISKT: Rensa testdata efter testet
  await cleanupTestFiles(page, testStartTime);
});
```

**Fel sätt:**
```typescript
// ❌ FEL: Glöm INTE cleanup
test('my test', async ({ page }) => {
  const ctx = createTestContext(page);
  // ... test-kod ...
  // ❌ FEL: Ingen cleanup!
});
```

### 3. Använd testStartTime (OBLIGATORISKT)

**Använd ALLTID `testStartTime` för att bara rensa testets egna data**

**Rätt sätt:**
```typescript
const testStartTime = Date.now(); // ✅ Spara när testet startar
// ... test-kod ...
await cleanupTestFiles(page, testStartTime); // ✅ Rensa bara testets egna filer
```

**Fel sätt:**
```typescript
// ❌ FEL: Använd INTE cleanup utan testStartTime (kan rensa andras testdata)
await cleanupTestFiles(page); // FEL! (kan rensa andras testdata)
```

## Helper-funktioner

### Test Data Helpers

**`testDataHelpers.ts`:**
- `generateTestFileName(baseName?)` - Genererar unikt test-filnamn
- `isTestDataFile(fileName)` - Kontrollerar om fil är testdata
- `extractTimestampFromTestFileName(fileName)` - Extraherar timestamp

**Användning:**
```typescript
import { generateTestFileName } from './utils/testDataHelpers';

const testFileName = generateTestFileName('my-test-file');
// Resultat: "test-1704067200000-1234-my-test-file.bpmn"
```

### Test Cleanup

**`testCleanup.ts`:**
- `cleanupTestFiles(page, testStartTime?)` - Rensar test-filer efter testet
- `cleanupOldTestData(page, maxAgeMinutes?)` - Rensar gamla testdata

**Användning:**
```typescript
import { cleanupTestFiles } from './utils/testCleanup';

test('my test', async ({ page }) => {
  const testStartTime = Date.now();
  // ... test-kod ...
  await cleanupTestFiles(page, testStartTime); // ✅ OBLIGATORISKT
});
```

### Test Helpers

**`testHelpers.ts`:**
- `ensureBpmnFileExists(ctx, baseName?)` - Säkerställer att test-fil finns (prefixar automatiskt)
- `ensureFileCanBeSelected(ctx)` - Säkerställer att test-fil kan väljas (prioriterar test-filer)
- `ensureButtonExists(page, selector, name)` - Säkerställer att knapp finns
- `ensureUploadAreaExists(page)` - Säkerställer att upload area finns

**Användning:**
```typescript
import { ensureBpmnFileExists, ensureFileCanBeSelected } from './utils/testHelpers';

// ✅ RÄTT: Prefixar automatiskt
const testFileName = await ensureBpmnFileExists(ctx, 'my-test-file');

// ✅ RÄTT: Prioriterar test-filer
const fileName = await ensureFileCanBeSelected(ctx);
```

## Exempel: Komplett Test

```typescript
/**
 * E2E test: Dokumentationsgenerering från scratch
 */

import { test, expect } from '@playwright/test';
import { setupClaudeApiMocks } from './fixtures/claudeApiMocks';
import {
  createTestContext,
  stepNavigateToFiles,
  stepBuildHierarchy,
  stepSelectGenerationMode,
  stepSelectFile,
  stepStartGeneration,
  stepWaitForGenerationComplete,
  stepVerifyGenerationResult,
  stepNavigateToDocViewer,
} from './utils/testSteps';
import { 
  ensureBpmnFileExists, 
  ensureFileCanBeSelected, 
  ensureButtonExists 
} from './utils/testHelpers';
import { cleanupTestFiles } from './utils/testCleanup';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Documentation Generation from Scratch', () => {
  test('should generate documentation from scratch', async ({ page }) => {
    // ✅ OBLIGATORISKT: Spara timestamp
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Setup: Mock Claude API
    await setupClaudeApiMocks(page, { simulateSlowResponse: false });

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);

    // Steg 2: Säkerställ att test-fil finns (prefixas automatiskt)
    // ✅ RÄTT: Använd ensureBpmnFileExists() utan .bpmn extension
    const testFileName = await ensureBpmnFileExists(ctx, 'test-doc-generation');

    // Steg 3: Bygg hierarki
    await stepBuildHierarchy(ctx);

    // Steg 4: Välj genereringsläge
    await stepSelectGenerationMode(ctx, 'claude');

    // Steg 5: Välj fil (prioriterar test-filer)
    const fileName = await ensureFileCanBeSelected(ctx);
    await stepSelectFile(ctx, fileName);

    // Steg 6: Starta generering
    await ensureButtonExists(page,
      'button:has-text("Generera artefakter")',
      'Generate button'
    );
    await stepStartGeneration(ctx);
    await stepWaitForGenerationComplete(ctx, 30000);
    await stepVerifyGenerationResult(ctx);

    // Steg 7: Verifiera resultat
    const bpmnFileName = fileName.replace('.bpmn', '');
    await stepNavigateToDocViewer(ctx, fileName, bpmnFileName);
    const docContent = await page.textContent('body');
    expect(docContent).toBeTruthy();
    expect(docContent?.length).toBeGreaterThan(100);

    // ✅ OBLIGATORISKT: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});
```

## Varför detta är viktigt

**Utan test data isolation:**
- ❌ Testdata blandas med produktionsdata
- ❌ Testdata kan synas i appen
- ❌ Testdata kan påverka andra tester
- ❌ Risk för data loss om tester körs mot produktionsdatabas

**Med test data isolation:**
- ✅ Testdata isoleras från produktionsdata
- ✅ Testdata kan identifieras och rensas enkelt
- ✅ Automatisk cleanup efter varje test
- ✅ Inga risker för data pollution

## Ytterligare Resurser

- **Test Data Isolation Guide:** [`../README.md`](./README.md#-viktigt-test-data-isolation---måste-följas-i-alla-nya-tester)
- **Test Helpers:** [`utils/README.md`](./utils/README.md)
- **Implementeringsplan:** [`../../docs/analysis/TEST_DATA_ISOLATION_IMPLEMENTATION.md`](../../docs/analysis/TEST_DATA_ISOLATION_IMPLEMENTATION.md)

## Frågor?

Om du är osäker på hur du ska implementera test data isolation:
1. Kolla exempel i befintliga tester (t.ex. `documentation-generation-from-scratch.spec.ts`)
2. Läs [`utils/README.md`](./utils/README.md) för detaljerad dokumentation
3. Kontakta teamet om du behöver hjälp

**Kom ihåg: Test data isolation är OBLIGATORISKT för alla nya tester!**

