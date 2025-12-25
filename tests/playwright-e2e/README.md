# Playwright E2E-tester

## 📋 Snabböversikt

- **Totalt antal test-filer:** 36
- **A-Ö tester (kompletta flöden):** 3
- **Sid-specifika tester:** 22
- **Scenario-tester:** 5
- **Generering från scratch (med mocked API):** 2
- **Hierarki och Map-validering:** 2
- **GitHub Sync och StyleGuide:** 2 ⭐ **NYTT**
- **Återanvändbara test-steg:** 15+

> 📖 **Detaljerad översikt:** Se [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) för komplett lista över alla tester och vad de validerar.

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
   - Kompletta end-to-end flöden från början till slut
   - Använder återanvändbara test-steg
   - Exempel: `complete-workflow-a-to-z.spec.ts`, `generation-workflow.spec.ts`

### Användning

**Kör A-Ö tester:**
```bash
# Kör komplett arbetsflöde
npx playwright test flows/complete-workflow-a-to-z.spec.ts

# Kör genereringsflöde
npx playwright test flows/generation-workflow.spec.ts

# Kör filhanteringsflöde
npx playwright test flows/file-management-workflow.spec.ts
```

**Använd individuella test-steg:**
```typescript
import { stepLogin, stepNavigateToFiles, createTestContext } from '../utils/testSteps';

test('my custom test', async ({ page }) => {
  const ctx = createTestContext(page);
  await stepLogin(ctx);
  await stepNavigateToFiles(ctx);
  // ... använd fler steg eller skriv egen logik
});
```

**Kör isolerade tester:**
```bash
# Kör bara en specifik sida
npx playwright test bpmn-file-manager.spec.ts

# Kör bara dialogs
npx playwright test bpmn-file-manager-dialogs.spec.ts
```

## Testfiler

### Kritiska UI-tester (Fas 1)

- **`index-diagram.spec.ts`** - Testar Index (diagram)-sidan (BPMN-diagramvisning, elementval, RightPanel, navigation)
- **`bpmn-file-manager.spec.ts`** - Testar BpmnFileManager-sidan (filhantering, hierarki-byggnad, generering)
- **`bpmn-file-manager-dialogs.spec.ts`** - Testar alla dialogs/popups på files-sidan (DeleteFileDialog, DeleteAllFilesDialog, ResetRegistryDialog, HierarchyReportDialog, MapValidationDialog, MapSuggestionsDialog, SyncReport, GenerationDialog, TransitionOverlay)
- **`process-explorer.spec.ts`** - Testar Process Explorer-sidan (trädvisualisering, nod-interaktion)
- **`doc-viewer.spec.ts`** - Testar Doc Viewer-sidan (dokumentationsvisning, länkar, version selection)
- **`full-generation-flow.spec.ts`** - Testar komplett genereringsflöde (upload → hierarki → generering)
- **`hierarchy-building-from-scratch.spec.ts`** - ⭐ **NYTT** - Testar hierarki-byggnad från scratch (isolerat test)
- **`bpmn-map-validation-workflow.spec.ts`** - ⭐ **NYTT** - Testar BPMN Map-validering och uppdatering (komplett flöde)

### Viktiga funktioner (Fas 2)

- **`node-matrix.spec.ts`** - Testar Node Matrix-sidan (listvy, filter, sortering)
- **`timeline-page.spec.ts`** - Testar Timeline-sidan (Gantt-chart, filter, datum-redigering)
- **`test-report.spec.ts`** - Testar Test Report-sidan (testrapporter, filter, länkar till nod-tester)
- **`test-scripts.spec.ts`** - Testar Test Scripts-sidan (test scripts, externa länkar)
- **`node-tests.spec.ts`** - Testar Node Tests-sidan (planerade scenarion, körda tester, provider-filter)
- **`configuration.spec.ts`** - Testar Configuration-sidan (projektkonfiguration, redigering)
- **`styleguide.spec.ts`** - ⭐ **NYTT** - Testar Style Guide-sidan (UI-komponenter, design system)

### Test Coverage & Quality

- **`test-coverage-explorer.spec.ts`** - Testar Test Coverage Explorer-sidan
- **`e2e-quality-validation.spec.ts`** - Testar E2E Quality Validation-sidan
- **`e2e-tests-overview.spec.ts`** - Testar E2E Tests Overview-sidan

### BPMN Management

- **`bpmn-diff.spec.ts`** - Testar BPMN Diff-sidan (diff-analys, selektiv regenerering)
- **`bpmn-folder-diff.spec.ts`** - Testar BPMN Folder Diff-sidan (mapp-diff)
- **`bpmn-version-history.spec.ts`** - Testar BPMN Version History-sidan (versionshistorik, diff, återställning)
- **`file-upload-versioning.spec.ts`** - Testar fil-upload och versioning
- **`registry-status.spec.ts`** - Testar Registry Status-sidan (registry-status, saknade element)
- **`hierarchy-building-from-scratch.spec.ts`** - ⭐ **NYTT** - Testar hierarki-byggnad från scratch (isolerat test: identifiera filer → bygg hierarki → verifiera i Process Explorer)
- **`bpmn-map-validation-workflow.spec.ts`** - ⭐ **NYTT** - Testar BPMN Map-validering och uppdatering (komplett flöde: validera → se resultat → acceptera/avvisa → spara/exporta)
- **`github-sync-workflow.spec.ts`** - ⭐ **NYTT** - Testar GitHub Sync workflow (synka från GitHub → visa sync-rapport → verifiera filändringar)

### A-Ö Flöden (Complete Workflows)

- **`flows/complete-workflow-a-to-z.spec.ts`** - Komplett arbetsflöde från login till resultatsidor (använder återanvändbara test-steg)
- **`flows/generation-workflow.spec.ts`** - Genereringsflöde från files till resultatsidor (använder återanvändbara test-steg)
- **`flows/file-management-workflow.spec.ts`** - Filhanteringsflöde från upload till olika vyer (använder återanvändbara test-steg)

### Generering

- **`claude-generation.spec.ts`** - Testar Claude-generering för application-processen (inkluderar verifiering av resultatsidor, använder faktiska API-anrop)
- **`full-generation-flow.spec.ts`** - Testar komplett genereringsflöde (inkluderar verifiering av resultatsidor, använder faktiska API-anrop)
- **`generation-result-pages.spec.ts`** - Testar att resultatsidor visas korrekt efter generering (GenerationDialog result view, Test Report, Test Coverage, E2E Tests Overview, Doc Viewer)
- **`documentation-generation-from-scratch.spec.ts`** - ⭐ **NYTT** - Testar dokumentationsgenerering från scratch med mocked Claude API (identifiera BPMN-filer → hierarki → generering → visas i appen)
- **`test-generation-from-scratch.spec.ts`** - ⭐ **NYTT** - Testar testgenerering från scratch med mocked Claude API (identifiera BPMN-filer → hierarki → generera tester → visas i appen)

### Utils (Återanvändbara Komponenter)

- **`utils/testSteps.ts`** - Återanvändbara test-steg som kan kombineras till A-Ö tester
- **`utils/uiInteractionHelpers.ts`** - Helper-funktioner för UI-interaktioner
- **`utils/processTestUtils.ts`** - Helper-funktioner för process-tester

### Fixtures (Mock-data och API-mocks)

- **`fixtures/claudeApiMocks.ts`** - ⭐ **NYTT** - Mock-responser för Claude API-anrop (används för snabba, pålitliga tester utan externa API-anrop)
- **`fixtures/mortgageE2eMocks.ts`** - Mock-responser för E2E-scenarios
- **`fixtures/mortgageCreditDecisionMocks.ts`** - Mock-responser för credit decision

## 🚀 Kör Tester

### Kör alla tester
```bash
npx playwright test
```

### Kör A-Ö tester (kompletta flöden)
```bash
# Komplett arbetsflöde från login till resultatsidor
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

### Kör Claude-generering test
```bash
# Kör testet (headless)
npm run test:claude:generation

# Kör testet med visuell browser (headed)
npm run test:claude:generation:headed
```

## 📋 Förutsättningar

1. **Appen måste köra** - Testet startar automatiskt appen via `webServer` i `playwright.config.ts`
2. **Supabase måste vara igång** - BPMN-filer måste finnas i storage
3. **Claude API-nyckel** (för Claude-tester) - `VITE_ANTHROPIC_API_KEY` måste vara satt i `.env.local`
4. **LLM måste vara aktiverat** (för LLM-tester) - `VITE_USE_LLM=true` (sätts automatiskt av npm-scriptet)

## 🐛 Debugging

Om ett test misslyckas:

1. **Kör med visuell browser** - `npx playwright test --headed` för att se vad som händer
2. **Kolla console-loggarna** - Playwright loggar detaljerad information
3. **Verifiera förutsättningar** - Se ovan
4. **Kör isolerat** - Kör bara det specifika testet för att isolera problemet
5. **Kolla test-dokumentation** - Varje test-fil har JSDoc-kommentarer som förklarar vad den gör

## 📚 Ytterligare Dokumentation

- **Detaljerad översikt:** [`TEST_OVERVIEW.md`](./TEST_OVERVIEW.md) - Komplett lista över alla tester
- **Saknade tester analys:** [`../docs/analysis/MISSING_E2E_TESTS_ANALYSIS.md`](../../docs/analysis/MISSING_E2E_TESTS_ANALYSIS.md) - Analys av vad som saknas
- **Återanvändbara komponenter:** [`utils/README.md`](./utils/README.md) - Guide för test-steg
- **Playwright dokumentation:** https://playwright.dev

## 🎯 Mockade API-anrop

För snabba och pålitliga tester använder vi mockade Claude API-anrop:

- **`fixtures/claudeApiMocks.ts`** - Mockar Claude API-anrop
- **`documentation-generation-from-scratch.spec.ts`** - Använder mocked API för dokumentationsgenerering
- **`test-generation-from-scratch.spec.ts`** - Använder mocked API för testgenerering

**Fördelar:**
- ✅ Snabba tester (ingen väntan på externa API:er)
- ✅ Pålitliga tester (inga rate limits eller API-fel)
- ✅ Testar app-logik utan externa beroenden
- ✅ Kan testa error cases enkelt

