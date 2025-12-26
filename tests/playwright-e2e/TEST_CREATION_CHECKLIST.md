# ⚠️ OBLIGATORISK CHECKLISTA FÖR ALLA NYA TESTER

## ⚠️ LÄS MASTER-FILEN FÖRST!

**🚨 INNAN DU ANVÄNDER DENNA CHECKLISTA - LÄS [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) FÖRST!**

**🚨 [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) är MASTER-FILEN med alla testregler!**

**🚨 Denna checklista är en snabbreferens - se TEST_OVERVIEW.md för fullständig information.**

---

**🚨 KRITISKT: Denna checklista MÅSTE följas för ALLA nya tester!**

## ✅ OBLIGATORISKA REGLER (MÅSTE FÖLJAS)

### 1. Test Data Isolation

- [ ] **`testStartTime = Date.now()`** i början av varje test
- [ ] **`cleanupTestFiles(page, testStartTime)`** i slutet av varje test (i `finally` block om möjligt)
- [ ] **Använd `generateTestFileName()`** för alla filnamn (eller `ensureBpmnFileExists()` som gör det automatiskt)
- [ ] **ALDRIG** använd produktionsfilnamn direkt (t.ex. `'mortgage.bpmn'`)

### 2. Skydd mot Produktionsfiler

- [ ] **Mocka `bpmn-map.json`** så att produktionsfilen INTE skrivs över
  - Använd `setupBpmnMapMocking(page)` från `utils/bpmnMapTestHelper.ts`
- [ ] **Använd `test-` prefix** för alla testfiler (automatiskt via `generateTestFileName()`)
- [ ] **Verifiera att `stepUploadBpmnFile`** kastar fel om filnamn saknar `test-` prefix

### 3. Sekventiell Körning

- [ ] **`test.describe.configure({ mode: 'serial' })`** om tester kan påverka varandra
- [ ] **Kör med `--workers=1`** när tester körs manuellt

### 4. Imports och Setup

- [ ] **Importera `cleanupTestFiles`** från `utils/testCleanup`
- [ ] **Importera `generateTestFileName`** från `utils/testDataHelpers`
- [ ] **Importera `setupBpmnMapMocking`** från `utils/bpmnMapTestHelper` (om testet kan påverka bpmn-map.json)

## 📝 Mall för Nytt Test

```typescript
import { test, expect } from '@playwright/test';
import { 
  createTestContext, 
  stepLogin,
  // ... andra steg
} from './utils/testSteps';
import { generateTestFileName } from './utils/testDataHelpers';
import { cleanupTestFiles } from './utils/testCleanup';
import { setupBpmnMapMocking } from './utils/bpmnMapTestHelper'; // Om testet kan påverka bpmn-map.json
import { setupClaudeApiMocks } from './fixtures/claudeApiMocks'; // Om testet använder Claude API

test.describe('My Test Suite', () => {
  // Om tester kan påverka varandra:
  test.describe.configure({ mode: 'serial' });
  
  test.beforeEach(async ({ page }) => {
    // Setup: Mock Claude API om nödvändigt
    await setupClaudeApiMocks(page, { simulateSlowResponse: false });
    
    // Setup: Mocka bpmn-map.json om testet kan påverka den
    await setupBpmnMapMocking(page);
    
    const ctx = createTestContext(page);
    await stepLogin(ctx);
  });

  test('should do something', async ({ page }) => {
    // ✅ OBLIGATORISKT: Spara timestamp
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    try {
      // ✅ RÄTT: Använd generateTestFileName() för filnamn
      const testFileName = generateTestFileName('my-test-file');
      
      // ... test-kod här ...
      
    } finally {
      // ✅ OBLIGATORISKT: Rensa testdata efter testet (i finally för att säkerställa cleanup även vid fel)
      await cleanupTestFiles(page, testStartTime);
    }
  });
});
```

## ❌ VANLIGA MISSTAG (UNDVIK DESSA!)

### ❌ FEL: Glömmer cleanup
```typescript
test('my test', async ({ page }) => {
  // ... test-kod ...
  // ❌ FEL: Ingen cleanup!
});
```

### ❌ FEL: Använder produktionsfilnamn
```typescript
await stepUploadBpmnFile(ctx, 'mortgage.bpmn', content); // ❌ FEL!
```

### ❌ FEL: Glömmer testStartTime
```typescript
await cleanupTestFiles(page); // ❌ FEL! Kan rensa andras testdata
```

### ❌ FEL: Skriver över bpmn-map.json
```typescript
// ❌ FEL: Ingen mockning av bpmn-map.json
// Testet kan skriva över produktionsfilen!
```

## ✅ RÄTT SÄTT

### ✅ RÄTT: Komplett exempel
```typescript
test('should generate documentation', async ({ page }) => {
  const testStartTime = Date.now(); // ✅
  const ctx = createTestContext(page);

  try {
    const testFileName = generateTestFileName('my-test-file'); // ✅
    await stepUploadBpmnFile(ctx, testFileName, content);
    
    // ... test-kod ...
    
  } finally {
    await cleanupTestFiles(page, testStartTime); // ✅
  }
});
```

## 📚 Läs Mer

- **Huvudguide:** [`CREATING_NEW_TESTS.md`](./CREATING_NEW_TESTS.md)
- **README:** [`README.md`](./README.md#-viktigt-test-data-isolation---måste-följas-i-alla-nya-tester)
- **Utils README:** [`utils/README.md`](./utils/README.md)

## 🎯 Kom ihåg

1. **Alltid** läsa `CREATING_NEW_TESTS.md` innan du skapar ett nytt test
2. **Alltid** följa denna checklista
3. **Alltid** verifiera att cleanup körs även vid fel (använd `finally`)
4. **Alltid** använd `testStartTime` för att isolera testdata
5. **Alltid** mocka `bpmn-map.json` om testet kan påverka den

**Test data isolation är OBLIGATORISKT - inte valfritt!**

