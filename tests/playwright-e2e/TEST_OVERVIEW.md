# UI E2E-tester - Komplett Översikt

## 📊 Statistik

- **Totalt antal test-filer:** 37
- **A-Ö tester (kompletta flöden):** 3
- **Sid-specifika tester:** 23
- **Scenario-tester:** 5
- **Generering från scratch (med mocked API):** 2
- **Hierarki och Map-validering:** 2
- **GitHub Sync och StyleGuide:** 2
- **Feature Goal-dokumentation:** 1 ⭐ **NYTT**
- **Återanvändbara test-steg:** 15+

## 🎯 Vad Testerna Validerar

### Primära Användarflöden (A-Ö)

1. **Komplett arbetsflöde** (`flows/complete-workflow-a-to-z.spec.ts`)
   - Login → Files → Upload → Hierarchy → Generation → Results
   - Validerar hela flödet från början till slut

2. **Genereringsflöde** (`flows/generation-workflow.spec.ts`)
   - Files → Hierarchy → Generation → Results
   - Validerar att generering fungerar och resultat visas

3. **Filhanteringsflöde** (`flows/file-management-workflow.spec.ts`)
   - Files → Upload → Hierarchy → Navigation
   - Validerar filhantering och navigation

### Kritiska Sidor och Funktioner

#### Filhantering
- ✅ **`bpmn-file-manager.spec.ts`** - Huvudsidan för filhantering
- ✅ **`bpmn-file-manager-dialogs.spec.ts`** - Alla dialogs/popups (9 st)
- ✅ **`file-upload-versioning.spec.ts`** - Fil-upload och versioning

#### Visualisering
- ✅ **`index-diagram.spec.ts`** - BPMN-diagramvisning
- ✅ **`process-explorer.spec.ts`** - Trädvisualisering
- ✅ **`node-matrix.spec.ts`** - Listvy med filter/sortering
- ✅ **`feature-goal-documentation.spec.ts`** - ⭐ **NYTT** - Feature Goal-dokumentation (validerar att call activities hittar dokumentation korrekt, både single och multiple file upload)
  - **Fokus:** Specifik Feature Goal-dokumentation för call activities och att den kan hittas i node-matrix
  - **Testar:** Parent + subprocess filer → hierarki → generering → retrieval i node-matrix ("Visa docs"-knapp)
  - **Skillnad från `documentation-generation-from-scratch.spec.ts`:** Testar retrieval och korrekt versioning, inte bara generering
- ✅ **`timeline-page.spec.ts`** - Gantt-chart

#### Dokumentation
- ✅ **`doc-viewer.spec.ts`** - Dokumentationsvisning

#### Test Management
- ✅ **`test-report.spec.ts`** - Testrapporter
- ✅ **`test-scripts.spec.ts`** - Test scripts
- ✅ **`node-tests.spec.ts`** - Nodspecifika tester
- ✅ **`test-coverage-explorer.spec.ts`** - Test coverage
- ✅ **`e2e-tests-overview.spec.ts`** - E2E tests översikt
- ✅ **`e2e-quality-validation.spec.ts`** - E2E kvalitetsvalidering

#### Generering
- ✅ **`claude-generation.spec.ts`** - Claude-generering (använder faktiska API-anrop)
- ✅ **`full-generation-flow.spec.ts`** - Komplett genereringsflöde (använder faktiska API-anrop)
- ✅ **`generation-result-pages.spec.ts`** - Resultatsidor efter generering
- ✅ **`documentation-generation-from-scratch.spec.ts`** - ⭐ **NYTT** - Dokumentationsgenerering från scratch med mocked Claude API (identifiera BPMN-filer → hierarki → generering → visas i appen)
  - **Fokus:** Generell dokumentationsgenerering och att resultatet visas i GenerationDialog
  - **Testar:** En fil → hierarki → generering → resultat-dialog
- ✅ **`test-info-generation.spec.ts`** - ⭐ **UPPDATERAT** - Testinfo-generering med förutsättningar (filer och dokumentation redan uppladdade/genererade → generera testinfo → validera popup och test-coverage sida)

#### Konfiguration & Style Guide
- ✅ **`configuration.spec.ts`** - Projektkonfiguration
- ✅ **`styleguide.spec.ts`** - ⭐ **NYTT** - Style Guide (UI-komponenter, design system)

#### BPMN Management
- ✅ **`bpmn-diff.spec.ts`** - Diff-analys
- ✅ **`bpmn-folder-diff.spec.ts`** - Mapp-diff
- ✅ **`bpmn-version-history.spec.ts`** - Versionshistorik
- ✅ **`registry-status.spec.ts`** - Registry status
- ✅ **`hierarchy-building-from-scratch.spec.ts`** - Hierarki-byggnad från scratch (isolerat test)
- ✅ **`bpmn-map-validation-workflow.spec.ts`** - BPMN Map-validering och uppdatering (komplett flöde)
- ✅ **`github-sync-workflow.spec.ts`** - ⭐ **NYTT** - GitHub Sync workflow (synka från GitHub → visa sync-rapport)

#### Scenarios (Happy Path)
- ✅ **`scenarios/happy-path/mortgage-application-happy.spec.ts`**
- ✅ **`scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts`**
- ✅ **`scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts`**
- ✅ **`scenarios/happy-path/mortgage-bostadsratt-two-applicants-happy.spec.ts`**
- ✅ **`scenarios/happy-path/mortgage-credit-decision-happy.spec.ts`**

## 🏗️ Teststruktur

### Tvånivå-arkitektur

1. **Återanvändbara test-steg** (`utils/testSteps.ts`)
   - 15+ återanvändbara steg
   - Kan användas individuellt eller kombineras
   - Exempel: `stepLogin()`, `stepNavigateToFiles()`, `stepBuildHierarchy()`

2. **A-Ö tester** (`flows/*.spec.ts`)
   - Kompletta end-to-end flöden
   - Använder återanvändbara test-steg
   - Validerar hela arbetsflöden

3. **Sid-specifika tester** (`*.spec.ts`)
   - Testar specifika sidor/funktioner
   - Kan använda återanvändbara steg
   - Validerar specifik funktionalitet

## ✅ Testrealism och Verifiering

Testerna är designade för att vara så realistiska som möjligt och faktiskt testa att appen fungerar:

### Verifieringar som görs

1. **Hierarki-byggnad verifieras** - Tester verifierar att hierarki faktiskt byggdes (kollar Process Explorer)
2. **Dokumentation verifieras** - Tester verifierar att dokumentation faktiskt genererades (kollar Doc Viewer med faktiskt innehåll)
3. **Tester verifieras** - Tester verifierar att tester faktiskt genererades (kollar Test Report och Test Coverage med faktiska rader)
4. **Testgenerering kräver dokumentation** - Testgenerering-testet genererar dokumentation först (som krävs av appen)

### Borttagning av onödiga test.skip()

- ✅ Tester skapar automatiskt det som behövs (filer laddas upp om de saknas)
- ✅ Tester failar med tydliga felmeddelanden om något saknas (vilket indikerar ett problem med appen)
- ✅ Färre `test.skip()` anrop (endast för legitima fall, t.ex. GitHub sync om det inte är konfigurerat)

**Se:** [`docs/analysis/TEST_SKIP_REMOVAL.md`](../../docs/analysis/TEST_SKIP_REMOVAL.md) och [`docs/analysis/TEST_REALISM_SUMMARY.md`](../../docs/analysis/TEST_REALISM_SUMMARY.md) för detaljerad information.

## ⚠️ MASTER TEST FIL - ALLA TESTREGLER HÄR!

**🚨 DETTA ÄR DEN PRIMÄRA/MASTER-FILEN FÖR ALLA TEST-REGLER!**

**🚨 INNAN DU SKAPAR ETT NYTT TEST - LÄS HELA DENNA FIL!**

**🚨 ALLA testregler finns här - detta är den ENDA filen du behöver läsa för att förstå hur tester ska skapas!**

---

## ⚠️ VIKTIGT: Test Data Isolation - MÅSTE FÖLJAS I ALLA NYA TESTER!

**🚨 KRITISKT: Testerna påverkar faktisk data i databasen!**

### ⚠️ OBLIGATORISKT för alla nya tester:

**1. Använd ALLTID prefixade test-filnamn:**
```typescript
import { ensureBpmnFileExists } from './utils/testHelpers';
import { generateTestFileName } from './utils/testDataHelpers';

test('my test', async ({ page }) => {
  const testStartTime = Date.now();
  const ctx = createTestContext(page);
  
  // ✅ RÄTT: Använd ensureBpmnFileExists() som prefixar automatiskt
  const testFileName = await ensureBpmnFileExists(ctx, 'my-test-file');
  
  // ❌ FEL: Använd INTE direkt filnamn utan prefix
  // await stepUploadBpmnFile(ctx, 'my-file.bpmn', content); // FEL!
  
  // ✅ RÄTT: Om du måste använda stepUploadBpmnFile direkt, generera prefixat filnamn
  const testFileName2 = generateTestFileName('my-test-file');
  await stepUploadBpmnFile(ctx, testFileName2, content);
});
```

**2. Rensa ALLTID testdata efter testet (BPMN-filer OCH dokumentationsfiler):**
```typescript
import { cleanupTestFiles } from './utils/testCleanup';

test('my test', async ({ page }) => {
  const testStartTime = Date.now();
  const ctx = createTestContext(page);
  
  // ... test-kod här ...
  
  // ✅ OBLIGATORISKT: Rensa testdata efter testet
  // Detta rensar BÅDE BPMN-filer från databasen OCH dokumentationsfiler från Storage
  await cleanupTestFiles(page, testStartTime);
});
```

**Viktigt:** `cleanupTestFiles()` rensar automatiskt:
- ✅ BPMN-filer från databasen (via UI)
- ✅ Dokumentationsfiler från Storage (docs/claude/...)
- ✅ Testfiler från Storage (tests/...)
- ✅ Debug-filer från Storage (llm-debug/...)

**3. Använd testStartTime för att bara rensa testets egna data:**
```typescript
test('my test', async ({ page }) => {
  const testStartTime = Date.now(); // ✅ Spara timestamp när testet startar
  const ctx = createTestContext(page);
  
  // ... test-kod här ...
  
  // ✅ Cleanup med testStartTime säkerställer att vi bara rensar testets egna filer
  await cleanupTestFiles(page, testStartTime);
});
```

**4. Mocka bpmn-map.json (OBLIGATORISKT om testet kan påverka den):**
```typescript
import { setupBpmnMapMocking } from './utils/bpmnMapTestHelper';

test.beforeEach(async ({ page }) => {
  // ✅ OBLIGATORISKT: Mocka bpmn-map.json om testet kan påverka den
  await setupBpmnMapMocking(page);
  
  // ... annan setup ...
});
```

**Varför?** Testerna kan skriva över produktionsfilen `bpmn-map.json` när filer laddas upp. Mockningen säkerställer att testerna skapar en test-version i minnet utan att påverka produktionsfilen.

**5. Sekventiell körning (När nödvändigt):**
```typescript
test.describe('My Test Suite', () => {
  // ✅ Om tester kan påverka varandra
  test.describe.configure({ mode: 'serial' });
  
  // ... tester ...
});
```

### Säkerhetsåtgärder (automatiska):

1. **Testdata prefixas automatiskt:**
   - Alla test-filer prefixas med `test-{timestamp}-{random}-{name}.bpmn`
   - Exempel: `test-1704067200000-1234-test-doc-generation.bpmn`
   - Testdata kan identifieras och rensas enkelt

2. **Automatisk cleanup:**
   - Testdata rensas automatiskt efter varje test (om du använder `cleanupTestFiles()`)
   - `cleanupTestFiles()` rensar BÅDE BPMN-filer från databasen OCH dokumentationsfiler från Storage
   - Gamla testdata kan rensas manuellt med `cleanupOldTestData()`

3. **ALDRIG kör tester mot produktionsdatabas!**
   - ⚠️ **KRITISKT:** Kontrollera att `VITE_SUPABASE_URL` i `.env.local` pekar på lokal Supabase
   - Default: `http://127.0.0.1:54321` (lokal Supabase)
   - **ALDRIG** sätt produktions-URL i `.env.local` när du kör tester!

4. **Testdata kan synas i appen:**
   - Testdata börjar med "test-" och kan filtreras bort
   - Cleanup körs automatiskt, men kan misslyckas om testet crashar

### Checklista för nya tester:

- [ ] ✅ Har läst hela denna TEST_OVERVIEW.md (master-filen)
- [ ] ✅ Använder `testStartTime = Date.now()` i början av testet
- [ ] ✅ Använder `ensureBpmnFileExists()` eller `generateTestFileName()` för filnamn
- [ ] ✅ Använder `cleanupTestFiles(page, testStartTime)` i slutet av testet (helst i `finally`)
- [ ] ✅ Använder `setupBpmnMapMocking(page)` om testet kan påverka bpmn-map.json
- [ ] ✅ Använder `test.describe.configure({ mode: 'serial' })` om tester kan påverka varandra
- [ ] ✅ Verifierar att `VITE_SUPABASE_URL` pekar på lokal Supabase (inte produktion)

**Se:** [`docs/analysis/TEST_DATA_ISOLATION_IMPLEMENTATION.md`](../../docs/analysis/TEST_DATA_ISOLATION_IMPLEMENTATION.md) för detaljerad information.

---

## 📝 Dokumentation

### Huvuddokumentation
- ✅ **`README.md`** - Översiktlig introduktion till testerna
- ✅ **`TEST_OVERVIEW.md`** - Denna fil - **MASTER-FIL med alla testregler och översikt**
- ✅ **`CREATING_NEW_TESTS.md`** - Detaljerad guide för att skapa nya tester
- ✅ **`TEST_CREATION_CHECKLIST.md`** - Snabbreferens-checklista
- ✅ **`utils/README.md`** - Guide för återanvändbara komponenter

### Test-dokumentation i koden
- ✅ Varje test-fil har JSDoc-kommentarer
- ✅ Varje test-steg är dokumenterat
- ✅ Exempel på användning finns i README-filer

## 🚀 Kör Tester

### Kör alla tester
```bash
npx playwright test
```

### Kör A-Ö tester
```bash
# Komplett arbetsflöde
npx playwright test flows/complete-workflow-a-to-z.spec.ts

# Genereringsflöde
npx playwright test flows/generation-workflow.spec.ts

# Filhanteringsflöde
npx playwright test flows/file-management-workflow.spec.ts
```

### Kör specifika tester
```bash
# Bara filhantering
npx playwright test bpmn-file-manager.spec.ts

# Bara dialogs
npx playwright test bpmn-file-manager-dialogs.spec.ts

# Bara en sida
npx playwright test test-report.spec.ts
```

### Kör med visuell browser
```bash
npx playwright test --headed
```

## ✅ Coverage

### Täckning per kategori

#### ✅ Fullständigt täckta områden
- Filhantering (upload, delete, versioning)
- Hierarki-byggnad
- Generering (Claude, Ollama) - både med faktiska och mocked API-anrop
- **Dokumentationsgenerering från scratch** - ⭐ **NYTT** - Med mocked API
- **Testgenerering från scratch** - ⭐ **NYTT** - Med mocked API
- Resultatsidor (Test Report, Test Coverage, Doc Viewer)
- Dialogs/popups (9 st)
- Navigation mellan sidor
- Visualisering (diagram, träd, listvy, timeline)

#### ⚠️ Delvis täckta områden
- BPMN diff (grundläggande tester finns)
- Scenarios (happy path finns, men kan utökas)
- Error handling (några error-tester finns, kan förbättras)

#### 📝 Förbättringsmöjligheter
- Fler edge cases för generering
- Fler scenario-variationer
- Mer omfattande diff-tester
- Mer detaljerade konfigurationstester
- Mer omfattande error handling-tester

## 🎯 Mockade API-anrop

För snabba och pålitliga tester använder vi mockade Claude API-anrop:

- **`fixtures/claudeApiMocks.ts`** - Mockar Claude API-anrop
- **`documentation-generation-from-scratch.spec.ts`** - Använder mocked API för generell dokumentationsgenerering
- **`feature-goal-documentation.spec.ts`** - Använder mocked API för Feature Goal-dokumentation
- **`test-info-generation.spec.ts`** - Använder mocked API för testinfo-generering, validerar GenerationDialog och test-coverage sida

**Fördelar:**
- ✅ Snabba tester (ingen väntan på externa API:er)
- ✅ Pålitliga tester (inga rate limits eller API-fel)
- ✅ Testar app-logik utan externa beroenden
- ✅ Kan testa error cases enkelt

### 📋 Skillnad mellan dokumentationsgenerering-tester

Vi har två tester som båda testar dokumentationsgenerering, men med olika fokus:

#### `documentation-generation-from-scratch.spec.ts`
**Syfte:** Testar generell dokumentationsgenerering och att resultatet visas.

**Vad det testar:**
- ✅ Laddar upp en BPMN-fil (eller använder befintlig)
- ✅ Bygger hierarki
- ✅ Genererar dokumentation (mockad Claude API)
- ✅ Validerar att resultatet visas i GenerationDialog
- ✅ Fokuserar på att genereringen fungerar och att dialogen visas

**Fokus:** Generering och visning av resultat.

#### `feature-goal-documentation.spec.ts`
**Syfte:** Testar specifikt Feature Goal-dokumentation för call activities och att den kan hittas i node-matrix.

**Vad det testar:**
- ✅ Laddar upp parent + subprocess filer (krävs för call activities)
- ✅ Bygger hierarki
- ✅ Genererar dokumentation (mockad Claude API)
- ✅ Mockar bpmn-map.json (viktigt för call activity-mappning)
- ✅ Validerar att Feature Goal-dokumentation sparas under subprocess-filens version hash
- ✅ Validerar att node-matrix kan hitta dokumentationen ("Visa docs"-knapp)
- ✅ Testar både single och multiple file upload-scenarion

**Fokus:** Lagring och retrieval av Feature Goal-dokumentation.

**Varför båda behövs:**
- `documentation-generation-from-scratch.spec.ts` validerar att genereringen fungerar och att resultatet visas
- `feature-goal-documentation.spec.ts` validerar specifik Feature Goal-logik och att dokumentationen kan hittas efter generering

## 🔧 Underhåll

### När du lägger till ny funktionalitet

1. **Skapa test-steg** (om det är återanvändbart)
   - Lägg till i `utils/testSteps.ts`
   - Dokumentera i `utils/README.md`

2. **Skapa sid-specifik test** (om det är en ny sida)
   - Skapa `new-page.spec.ts`
   - Uppdatera `README.md` med ny test

3. **Uppdatera A-Ö tester** (om det påverkar huvudflöden)
   - Uppdatera `flows/complete-workflow-a-to-z.spec.ts`
   - Uppdatera relevanta flöden

4. **Uppdatera dokumentation**
   - Uppdatera `README.md`
   - Uppdatera `TEST_OVERVIEW.md` (denna fil)

### När du refaktorerar

1. **Uppdatera test-steg** om UI ändras
2. **Uppdatera tester** om funktionalitet ändras
3. **Verifiera att alla tester fortfarande fungerar**

## 📚 Ytterligare Resurser

- **Playwright dokumentation:** https://playwright.dev
- **Test-struktur guide:** `utils/README.md`
- **Huvuddokumentation:** `README.md`

