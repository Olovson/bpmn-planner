# Test Rules Summary - OBLIGATORISKA REGLER FÖR ALLA TESTER

## ⚠️ KRITISKT: Dessa regler MÅSTE följas för ALLA tester!

### 1. Test Data Isolation (OBLIGATORISKT)

**Alla tester MÅSTE:**
- ✅ Spara `testStartTime = Date.now()` i början av varje test
- ✅ Anropa `cleanupTestFiles(page, testStartTime)` i slutet av varje test
- ✅ Använda `generateTestFileName()` för alla filnamn (eller `ensureBpmnFileExists()`)
- ✅ ALDRIG använda produktionsfilnamn direkt

**Exempel:**
```typescript
test('my test', async ({ page }) => {
  const testStartTime = Date.now(); // ✅ OBLIGATORISKT
  
  const testFileName = generateTestFileName('my-file'); // ✅ RÄTT
  // await stepUploadBpmnFile(ctx, 'mortgage.bpmn', content); // ❌ FEL!
  
  try {
    // ... test-kod ...
  } finally {
    await cleanupTestFiles(page, testStartTime); // ✅ OBLIGATORISKT
  }
});
```

### 2. Skydd mot Produktionsfiler (OBLIGATORISKT)

**Alla tester som kan påverka produktionsfiler MÅSTE:**
- ✅ Mocka `bpmn-map.json` så att produktionsfilen INTE skrivs över
  - Använd `setupBpmnMapMocking(page)` från `utils/bpmnMapTestHelper.ts`
- ✅ Använda `test-` prefix för alla testfiler (automatiskt via `generateTestFileName()`)
- ✅ Verifiera att `stepUploadBpmnFile` kastar fel om filnamn saknar `test-` prefix

**Exempel:**
```typescript
test.beforeEach(async ({ page }) => {
  // ✅ OBLIGATORISKT: Mocka bpmn-map.json om testet kan påverka den
  await setupBpmnMapMocking(page);
  
  // ... annan setup ...
});
```

### 3. Sekventiell Körning (När Nödvändigt)

**Tester som kan påverka varandra MÅSTE:**
- ✅ Använda `test.describe.configure({ mode: 'serial' })`
- ✅ Köras med `--workers=1` när tester körs manuellt

**Exempel:**
```typescript
test.describe('My Test Suite', () => {
  // ✅ Om tester kan påverka varandra
  test.describe.configure({ mode: 'serial' });
  
  // ... tester ...
});
```

## 📚 Var Hittar Jag Dessa Regler?

1. **Huvudguide:** `tests/playwright-e2e/CREATING_NEW_TESTS.md`
2. **Checklista:** `tests/playwright-e2e/TEST_CREATION_CHECKLIST.md`
3. **README:** `tests/playwright-e2e/README.md` (sektion "Test Data Isolation")
4. **Utils README:** `tests/playwright-e2e/utils/README.md`

## ✅ Verifiering

**Innan du committar ett nytt test, kontrollera:**

- [ ] `testStartTime = Date.now()` finns i början av testet
- [ ] `cleanupTestFiles(page, testStartTime)` finns i slutet (helst i `finally`)
- [ ] Alla filnamn använder `generateTestFileName()` eller `ensureBpmnFileExists()`
- [ ] `setupBpmnMapMocking(page)` används om testet kan påverka bpmn-map.json
- [ ] `test.describe.configure({ mode: 'serial' })` används om tester kan påverka varandra
- [ ] Inga produktionsfilnamn används direkt

## 🎯 Kom ihåg

**Alltid läsa `CREATING_NEW_TESTS.md` innan du skapar ett nytt test!**

**Test data isolation är OBLIGATORISKT - inte valfritt!**




