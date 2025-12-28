# Test File Cleanup och Skydd mot Produktionsfiler

## Problem

Tidigare kunde testerna:
1. **Skriva över `bpmn-map.json`** - När testfiler laddades upp, kunde systemet automatiskt uppdatera `bpmn-map.json` med testfilerna, vilket skrev över produktionsfilen.
2. **Lämna kvar testfiler** - Testfiler med `test-` prefix kunde lämnas kvar i databasen efter testerna.
3. **Köra parallellt** - Tester kunde köras parallellt, vilket kunde skapa konflikter och märkliga filer i fillistan.

## Lösning

### 1. Mockning av `bpmn-map.json` Skrivningar

I `tests/playwright-e2e/feature-goal-documentation.spec.ts`:

```typescript
// Mocka Supabase storage-anrop för bpmn-map.json
await page.route('**/storage/v1/object/bpmn-files/bpmn-map.json**', async (route) => {
  const method = route.request().method();
  // Tillåt läsning (GET), men blockera skrivning (PUT/POST)
  if (method === 'GET') {
    await route.continue();
  } else {
    // Blockera PUT/POST-anrop (skrivning)
    console.log('[TEST] Blocked bpmn-map.json write operation to protect production file');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mocked - write blocked in test' })
    });
  }
});
```

**Resultat:** Testerna kan INTE skriva över `bpmn-map.json` i produktionsmiljön.

### 2. Obligatorisk Cleanup av Testfiler

Varje test måste:
1. Spara `testStartTime = Date.now()` när testet startar
2. Anropa `await cleanupTestFiles(page, testStartTime)` efter testet

**Exempel:**
```typescript
test('my test', async ({ page }) => {
  const testStartTime = Date.now(); // OBLIGATORISKT
  
  // ... test-kod ...
  
  // OBLIGATORISKT: Rensa testfiler efter testet
  await cleanupTestFiles(page, testStartTime);
});
```

**Resultat:** Testfiler rensas automatiskt efter varje test, baserat på timestamp.

### 3. Sekventiell Körning

I `tests/playwright-e2e/feature-goal-documentation.spec.ts`:

```typescript
test.describe('Feature Goal Documentation', () => {
  // VIKTIGT: Kör testerna sekventiellt (inte parallellt)
  test.describe.configure({ mode: 'serial' });
  // ...
});
```

**Resultat:** Testerna körs en i taget, vilket förhindrar konflikter och märkliga filer i fillistan.

### 4. Testfiler med "test-" Prefix

Alla testfiler måste ha `test-` prefix för att:
1. Identifieras som testdata
2. Skyddas från att skriva över produktionsfiler (via `stepUploadBpmnFile` säkerhetskontroll)
3. Kunna rensas automatiskt

**Exempel:**
```typescript
const testFileName = generateTestFileName('mortgage-se-object.bpmn');
// Resultat: "test-1766758716281-5350-mortgage-se-object.bpmn"
```

## Verifiering

### Kontrollera att Mockning Fungerar

När testerna körs, bör du se:
```
[TEST] Blocked bpmn-map.json write operation to protect production file
```

Detta bekräftar att `bpmn-map.json` inte skrivs över.

### Kontrollera att Cleanup Fungerar

Efter testerna, navigera till `/files` och kontrollera att inga testfiler finns kvar (eller bara filer från pågående tester).

### Kontrollera Sekventiell Körning

Testerna bör köras med `--workers=1`:
```bash
npx playwright test tests/playwright-e2e/feature-goal-documentation.spec.ts --workers=1
```

## Gamla Testfiler

Om du ser gamla testfiler i fillistan (t.ex. `test-1766758316392-1962-mortgage-se-application.bpmn`), kan det bero på:

1. **Tidigare körningar innan cleanup implementerades** - Dessa kan rensas manuellt eller via `cleanupOldTestData()`.
2. **Cleanup misslyckades** - Kontrollera console-loggarna för felmeddelanden.

**Lösning:** Kör `cleanupOldTestData()` manuellt eller rensa gamla testfiler via UI.

## Framtida Förbättringar

1. **Automatisk cleanup av gamla testfiler** - Kör `cleanupOldTestData()` i `globalSetup` eller `beforeAll`.
2. **Bättre felhantering i cleanup** - Logga mer detaljerat om cleanup misslyckas.
3. **Verifiering efter cleanup** - Verifiera att testfiler faktiskt togs bort efter cleanup.




