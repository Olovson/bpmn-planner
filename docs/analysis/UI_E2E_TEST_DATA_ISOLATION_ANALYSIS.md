# Analys: UI E2E Test Data Isolation

## 🔍 Frågor

1. **Ser vi faktiskt vad som händer på sidorna?**
2. **Säkerställer vi att våra tester inte påverkar faktisk data i appen?**

## ✅ Svar 1: Ser vi faktiskt vad som händer?

**JA!** Playwright kör en **riktig browser** (Chromium) och ser faktiskt sidorna:

### Hur det fungerar:

1. **Playwright startar en riktig browser:**
   - Använder Chromium (samma som Chrome)
   - Kör mot `http://localhost:8080` (dev server)
   - Ser faktiskt HTML, CSS, JavaScript som renderas

2. **Vi kan se vad som händer:**
   - Standard: Headless mode (ingen visuell browser, men sidorna renderas)
   - Med `--headed` flagga: Ser faktiskt browsern och vad som händer
   - Screenshots och videos kan sparas för debugging

3. **Vad Playwright ser:**
   - Faktisk DOM (HTML-element)
   - Faktiska CSS-stilar
   - Faktiska JavaScript-interaktioner
   - Faktiska API-anrop (kan mockas)
   - Faktiska Supabase-anrop

**Exempel:**
```typescript
// Detta klickar faktiskt på en knapp i browsern
await page.click('button:has-text("Generera")');

// Detta ser faktiskt om knappen är synlig
const isVisible = await button.isVisible();
```

## ⚠️ Svar 2: Påverkar testerna faktisk data?

**JA, TYVÄRR!** Testerna använder **Samma Supabase-databas** som appen:

### Problem:

1. **Samma databas:**
   - Tester använder `VITE_SUPABASE_URL` från `.env.local`
   - Default: `http://127.0.0.1:54321` (lokal Supabase)
   - **Samma databas som appen använder!**

2. **Faktiska data-operationer:**
   - Tester skapar faktiska filer i `bpmn_files` tabellen
   - Tester laddar upp faktiska filer till Supabase Storage
   - Tester genererar faktisk dokumentation och tester
   - Tester skapar faktiska generation jobs
   - Tester bygger faktisk hierarki

3. **Test-användare:**
   - Tester använder `seed-bot@local.test` (dedikerad test-användare)
   - Men data skapas i **samma databas** som produktionsdata

### Exempel på vad som händer:

```typescript
// Detta skapar faktiskt en fil i databasen!
await stepUploadBpmnFile(ctx, 'test-file.bpmn', content);

// Detta genererar faktiskt dokumentation som sparas i Supabase Storage!
await stepStartGeneration(ctx);

// Detta bygger faktiskt hierarki som sparas i databasen!
await stepBuildHierarchy(ctx);
```

## 🚨 Risker

### 1. Data Pollution
- Testdata blandas med produktionsdata
- Test-filer kan synas i appen
- Test-dokumentation kan synas i appen
- Test-scenarios kan synas i appen

### 2. Data Loss Risk
- Om tester körs mot produktionsdatabas kan de skriva över data
- Om tester körs samtidigt kan de konflikta med varandra
- Om tester misslyckas kan de lämna "orphaned" data

### 3. Test Isolation Problem
- Tester kan påverka varandra
- Tester kan misslyckas om data redan finns
- Tester kan misslyckas om data saknas

## ✅ Vad som fungerar bra

1. **Test-användare:**
   - Dedikerad `seed-bot@local.test` användare
   - Skapas automatiskt i `global-setup.ts`
   - Separerad från produktionsanvändare

2. **Mockade API-anrop:**
   - Claude API-anrop mockas (påverkar inte faktiska API:er)
   - E2E-scenarios mockas (påverkar inte faktiska scenarios)

3. **Lokal Supabase:**
   - Om du kör lokal Supabase (`http://127.0.0.1:54321`) är risken lägre
   - Men data påverkar fortfarande samma databas som appen använder

## 🔧 Lösningar

### Lösning 1: Separerad Test-databas (REKOMMENDERAT)

**Skapa en separat Supabase-instans för tester:**

```typescript
// tests/playwright-e2e/playwright.config.test.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:8080',
    // Använd test-databas URL
    env: {
      VITE_SUPABASE_URL: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54322', // Annan port
    },
  },
});
```

**Fördelar:**
- ✅ Komplett isolering från produktionsdata
- ✅ Kan rensa databasen mellan tester
- ✅ Inga risker för data pollution

**Nackdelar:**
- ⚠️ Kräver separat Supabase-instans
- ⚠️ Mer komplex setup

### Lösning 2: Test Data Cleanup

**Rensa testdata efter varje test:**

```typescript
test.afterEach(async ({ page }) => {
  // Rensa alla test-filer
  await cleanupTestFiles();
  // Rensa alla test-dokumentation
  await cleanupTestDocs();
});
```

**Fördelar:**
- ✅ Enklare att implementera
- ✅ Använder samma databas

**Nackdelar:**
- ⚠️ Kan misslyckas om cleanup misslyckas
- ⚠️ Kan lämna "orphaned" data om test crashar

### Lösning 3: Test Data Prefixing

**Prefixa all testdata med "test-" eller timestamp:**

```typescript
const testFileName = `test-${Date.now()}-${fileName}`;
await stepUploadBpmnFile(ctx, testFileName, content);
```

**Fördelar:**
- ✅ Enkelt att identifiera testdata
- ✅ Kan filtrera bort testdata i appen

**Nackdelar:**
- ⚠️ Testdata syns fortfarande i appen
- ⚠️ Kräver ändringar i appen för att filtrera

### Lösning 4: Transactions (Om Supabase stödjer det)

**Använd transactions som rollback:as:**

```typescript
test('my test', async ({ page }) => {
  await supabase.rpc('begin_transaction');
  try {
    // Test-kod här
  } finally {
    await supabase.rpc('rollback');
  }
});
```

**Fördelar:**
- ✅ Automatisk cleanup
- ✅ Inga "orphaned" data

**Nackdelar:**
- ⚠️ Supabase stödjer inte transactions på samma sätt som traditionella databaser
- ⚠️ Kan vara komplext att implementera

## 📊 Nuvarande Situation

### Vad vi gör nu:

1. ✅ Använder dedikerad test-användare (`seed-bot@local.test`)
2. ✅ Mockar Claude API-anrop
3. ⚠️ Använder **samma databas** som appen
4. ⚠️ Skapar **faktisk data** i databasen
5. ⚠️ Ingen automatisk cleanup

### Risk-nivå:

- **Lokal utveckling:** 🟡 MEDEL RISK
  - Om du kör lokal Supabase är risken lägre
  - Men testdata kan fortfarande synas i appen
  - Testdata kan påverka andra tester

- **Produktionsmiljö:** 🔴 HÖG RISK
  - Om `VITE_SUPABASE_URL` pekar på produktionsdatabas
  - Tester kan skriva över produktionsdata!
  - **ALDRIG kör tester mot produktionsdatabas!**

## 🎯 Rekommendationer

### Omedelbart:

1. **Verifiera Supabase URL:**
   - Kontrollera att `VITE_SUPABASE_URL` i `.env.local` pekar på lokal Supabase
   - **ALDRIG** sätt produktions-URL i `.env.local` när du kör tester

2. **Dokumentera risk:**
   - Lägg till varning i README om att tester påverkar databasen
   - Lägg till varning om att inte köra mot produktionsdatabas

### Kort sikt:

3. **Implementera test data cleanup:**
   - Rensa testdata efter varje test
   - Använd `test.afterEach` för cleanup

4. **Test data prefixing:**
   - Prefixa all testdata med "test-" eller timestamp
   - Filtrera bort testdata i appen (valfritt)

### Lång sikt:

5. **Separerad test-databas:**
   - Skapa separat Supabase-instans för tester
   - Konfigurera Playwright att använda test-databasen

## 📝 Checklista

- [ ] Verifiera att `VITE_SUPABASE_URL` pekar på lokal Supabase (inte produktion)
- [ ] Lägg till varning i README om data-isolation
- [ ] Implementera test data cleanup
- [ ] Överväg test data prefixing
- [ ] Överväg separerad test-databas (lång sikt)

## 🔗 Relaterade Filer

- `playwright.config.ts` - Playwright konfiguration
- `tests/playwright-e2e/global-setup.ts` - Global setup (skapar seed-användare)
- `tests/playwright-e2e/utils/testHelpers.ts` - Test helpers (skapar testdata)
- `.env.local` - Environment variables (Supabase URL)

