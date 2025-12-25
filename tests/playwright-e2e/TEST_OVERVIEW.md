# UI E2E-tester - Komplett Översikt

## 📊 Statistik

- **Totalt antal test-filer:** 36
- **A-Ö tester (kompletta flöden):** 3
- **Sid-specifika tester:** 22
- **Scenario-tester:** 5
- **Generering från scratch (med mocked API):** 2
- **Hierarki och Map-validering:** 2
- **GitHub Sync och StyleGuide:** 2 ⭐ **NYTT**
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
- ✅ **`test-generation-from-scratch.spec.ts`** - ⭐ **NYTT** - Testgenerering från scratch med mocked Claude API (identifiera BPMN-filer → hierarki → generera tester → visas i appen)

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

## 📝 Dokumentation

### Huvuddokumentation
- ✅ **`README.md`** - Komplett översikt över alla tester
- ✅ **`TEST_OVERVIEW.md`** - Denna fil - detaljerad översikt
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
- **`documentation-generation-from-scratch.spec.ts`** - Använder mocked API
- **`test-generation-from-scratch.spec.ts`** - Använder mocked API

**Fördelar:**
- ✅ Snabba tester (ingen väntan på externa API:er)
- ✅ Pålitliga tester (inga rate limits eller API-fel)
- ✅ Testar app-logik utan externa beroenden
- ✅ Kan testa error cases enkelt

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

