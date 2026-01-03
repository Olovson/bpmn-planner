# Playwright E2E-tester

## 📋 Snabböversikt

- **Totalt antal test-filer:** 37
- **A-Ö tester (kompletta flöden):** 3
- **Sid-specifika tester:** 23
- **Scenario-tester:** 5
- **Generering från scratch (med mocked API):** 2
- **Hierarki och Map-validering:** 2
- **GitHub Sync och StyleGuide:** 2
- **Feature Goal-dokumentation:** 1 ⭐ **NYTT**
- **Återanvändbara test-steg:** 15+

> 📖 **⚠️ MASTER TEST FIL:** Se [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) för **alla testregler** och komplett översikt över alla tester!

## Översikt

Detta katalog innehåller Playwright E2E-tester för BPMN Planner-applikationen. Testerna täcker kritiska användarflöden och UI-komponenter.

**Vad testerna validerar:**
- ✅ Alla huvudsidor och vyer
- ✅ Kompletta arbetsflöden (A-Ö)
- ✅ Genereringsflöden
- ✅ Filhantering
- ✅ Dialogs och popups
- ✅ Resultatsidor
- ✅ Navigation
- ✅ Visualisering (diagram, träd, listvy, timeline)

## Teststruktur och Integration

**Viktigt:** Tester för resultatsidor är integrerade i genereringsflödena. När filer genereras verifieras automatiskt att:
- GenerationDialog result view visas korrekt
- Test Report visar genererade scenarios
- Test Coverage Explorer visar E2E scenarios
- Doc Viewer visar genererad dokumentation

Detta säkerställer att resultatsidor testas automatiskt som en del av genereringsflödena, inte bara isolerat.

## Teststruktur: A-Ö Tester och Återanvändbara Komponenter

### Arkitektur

Vi har en tvånivå-struktur:

1. **Återanvändbara test-steg** (`utils/testSteps.ts`)
   - Varje steg är självständigt och kan testas isolerat
   - Kan kombineras till A-Ö tester
   - Exempel: `stepLogin()`, `stepNavigateToFiles()`, `stepBuildHierarchy()`, etc.

2. **A-Ö tester** (`flows/*.spec.ts`)
   - Kompletta end-to-end flöden
   - Använder återanvändbara test-steg
   - Validerar hela arbetsflöden

3. **Sid-specifika tester** (`*.spec.ts`)
   - Testar specifika sidor/funktioner
   - Kan använda återanvändbara steg
   - Validerar specifik funktionalitet

## ⚠️ VIKTIGT: Test Data Isolation

**🚨 KRITISKT: Testerna påverkar faktisk data i databasen!**

**Se [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) för alla testregler och detaljerad information om test data isolation.**

### Snabböversikt - OBLIGATORISKT för alla nya tester:

1. ✅ Använd `testStartTime = Date.now()` i början
2. ✅ Använd `cleanupTestFiles(page, testStartTime)` i slutet (rensar BPMN-filer OCH dokumentationsfiler från Storage)
3. ✅ Använd `generateTestFileName()` eller `ensureBpmnFileExists()` för filnamn
4. ✅ Använd `setupBpmnMapMocking(page)` om testet kan påverka bpmn-map.json
5. ✅ Använd `test.describe.configure({ mode: 'serial' })` om tester kan påverka varandra
6. ✅ Verifiera att `VITE_SUPABASE_URL` pekar på lokal Supabase (inte produktion)

**Se [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) för alla detaljerade testregler och exempel!**

## 📋 Förutsättningar

1. **Appen måste köra** - Testet startar automatiskt appen via `webServer` i `playwright.config.ts`
2. **Supabase måste vara igång** - BPMN-filer måste finnas i storage
3. **Claude API-nyckel** (för Claude-tester) - `VITE_ANTHROPIC_API_KEY` måste vara satt i `.env.local`
4. **LLM måste vara aktiverat** (för LLM-tester) - `VITE_USE_LLM=true` (sätts automatiskt av npm-scriptet)

## 🚀 Kör Tester

### Kör alla tester
```bash
npx playwright test
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

## 🐛 Debugging

Om ett test misslyckas:

1. **Kör med visuell browser** - `npx playwright test --headed` för att se vad som händer
2. **Kolla console-loggarna** - Playwright loggar detaljerad information
3. **Verifiera förutsättningar** - Se ovan
4. **Kör isolerat** - Kör bara det specifika testet för att isolera problemet
5. **Kolla test-dokumentation** - Varje test-fil har JSDoc-kommentarer som förklarar vad den gör

## 📚 Ytterligare Dokumentation

**⚠️ VIKTIGT: [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) är MASTER-FILEN med alla testregler!**

- **⭐ MASTER TEST FIL:** [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) - **Alla testregler och komplett översikt över alla tester**
- **⭐ Skapa nya tester:** [`CREATING_NEW_TESTS.md`](./CREATING_NEW_TESTS.md) - Detaljerad guide
- **⭐ Snabbchecklista:** [`TEST_CREATION_CHECKLIST.md`](./TEST_CREATION_CHECKLIST.md) - Snabbreferens för nya tester
- **Återanvändbara komponenter:** [`utils/README.md`](./utils/README.md) - Guide för test-steg
- **Saknade tester analys:** [`../docs/analysis/MISSING_E2E_TESTS_ANALYSIS.md`](../../docs/analysis/MISSING_E2E_TESTS_ANALYSIS.md) - Analys av vad som saknas
- **Playwright dokumentation:** https://playwright.dev

## 🎯 Mockade API-anrop

För snabba och pålitliga tester använder vi mockade Claude API-anrop:

- **`fixtures/claudeApiMocks.ts`** - Mockar Claude API-anrop
- **`documentation-generation-from-scratch.spec.ts`** - Använder mocked API för dokumentationsgenerering
- **`test-info-generation.spec.ts`** - Använder mocked API för testinfo-generering
  - Validerar GenerationDialog med testinfo-kort och detaljerad rapport
  - Validerar att testinfo faktiskt visas på test-coverage sida (E2E scenario-knappar och tabell-data)
  - Använder produktionsfunktioner via `window.__TEST_HELPERS__` för prerequisites check (ingen duplicerad logik)
- **`feature-goal-documentation.spec.ts`** - Använder mocked API för Feature Goal-dokumentation

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
