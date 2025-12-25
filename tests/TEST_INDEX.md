# Test Index - Komplett Översikt över Alla Tester

**Syfte:** Centraliserad index över alla tester i projektet, organiserade efter funktionalitet för enkel sökning och referens.

> 📋 **För mer detaljerad information, se:**
> - [`tests/README.md`](./README.md) - Allmän testdokumentation
> - [`docs/testing/TESTING.md`](../docs/testing/TESTING.md) - Testing guide
> - [`docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md`](../docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md) - Gap-analys
> - ⭐ **[`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md)** - **Komplett guide för att validera nya BPMN-filer från A till Ö**

---

## ⚠️ Viktig Distinktion: Två Typer av Tester

### 1. Tester som **validerar appens funktionalitet** (utvecklartester)
Dessa tester körs av utvecklare för att säkerställa att appens kod fungerar korrekt:
- **Unit Tests** (`tests/unit/`) - Testar isolerade funktioner
- **Integration Tests** (`tests/integration/`) - Testar flöden mellan komponenter
- **E2E Tests** (`tests/e2e/`) - Testar UI-komponenter i isolerad miljö
- **Playwright E2E Tests** (`tests/playwright-e2e/`) - Testar fullständiga användarflöden

**Syfte:** Validera att appens kod, logik och funktionalitet fungerar som förväntat.

### 2. Tester som **appen genererar och använder** (användartester)
Dessa tester genereras av appen från BPMN-filer och sparas i Supabase Storage:
- **E2E-scenarios** - Genereras från BPMN-processgraf och Feature Goals med Claude, sparas i Supabase Storage (`e2e-scenarios/{bpmnFile}-scenarios.json`)
- **Feature Goal-test scenarios** - Extraheras från E2E-scenarios och sparas i `node_planned_scenarios`
- **Test Coverage-data** - Visas i Test Coverage Explorer

**Viktigt:** Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte för att generera given/when/then. Detta sparar tid och pengar (färre LLM-anrop).

**Syfte:** Används av användare för att testa sina BPMN-processer, inte för att validera appens kod.

**Viktigt:** När vi pratar om "tester" i utvecklingssammanhang menar vi vanligtvis kategori 1 (utvecklartester). Kategori 2 är "artefakter" som appen genererar för användarna.

---

## 🎯 Snabb Sökning efter Funktionalitet

> **Notera:** Alla tester nedan är **utvecklartester** (kategori 1) som validerar appens funktionalitet. För information om tester som appen genererar (kategori 2), se sektionen "Tester som appen genererar" längre ner.

### BPMN Parsing & Metadata
- **Unit:** `bpmnHierarchy.integration.test.ts` - Hierarki-byggnad
- **Integration:** `bpmnParser.real.test.ts` - Real BPMN parsing
- **Integration:** `bpmnRealParse.mortgage.test.ts` - Mortgage-specifik parsing
- **Integration:** `diagnose-missing-process-nodes.test.ts` - Diagnostik av saknade noder

### Diff & Versioning
- **Integration:** `local-folder-diff.test.ts` - **Lokal diff-analys (read-only)**
- **Integration:** `version-hash-handling.test.ts` - Version hash-hantering
- **Unit:** `bpmnVersioning.test.ts` - Versioning-logik

### Dokumentationsgenerering
- **Integration:** `application-documentation-generation.test.ts` - Application-dokumentation
- **Integration:** `household-documentation-generation.test.ts` - Household-dokumentation
- **Integration:** `signing-documentation-analysis.test.ts` - Signing-analys
- **Integration:** `mortgage-documentation-analysis.test.ts` - Mortgage-analys
- **Integration:** `hierarchy-llm-generation.test.ts` - Hierarkisk LLM-generering
- **Integration:** `full-flow-generation-upload-read.test.ts` - Fullständigt genereringsflöde
- **Integration:** `generate-all-files-with-root.test.ts` - Generera alla filer med root

### LLM Integration
- **Integration:** `claude-api-simple.test.ts` - Enkel Claude API-test
- **Integration:** `claude-api-direct-http.test.ts` - Direkt HTTP-test
- **Integration:** `claude-basic.test.ts` - Grundläggande Claude-test
- **Integration:** `claude-complex.test.ts` - Komplex Claude-test
- **Integration:** `claude-application.test.ts` - Application med Claude
- **Integration:** `claude-application-object-info.test.ts` - Application object info
- **Integration:** `claude-object-information.test.ts` - Object information
- **Integration:** `llm.real.smoke.test.ts` - Riktig LLM smoke test
- **Integration:** `llm.health.local.test.ts` - LLM health check (lokal)
- **Unit:** `llmClientAbstraction.test.ts` - LLM client abstraction
- **Unit:** `llmDocumentationShared.test.ts` - Delad LLM-dokumentation
- **Unit:** `llmProviderIntegration.test.ts` - LLM provider integration
- **Unit:** `llmProviderResolver.test.ts` - LLM provider resolver
- **Unit:** `llmHealth.test.ts` - LLM health check
- **Unit:** `llmFallback.cloudToLocal.test.ts` - LLM fallback (cloud → local)
- **Unit:** `llmDisabledInTests.test.ts` - LLM disabled i tester

### Feature Goals, Epics & Business Rules
- **Integration:** `featureGoal.llm.e2e.test.ts` - Feature Goal LLM E2E
- **Integration:** `epic.llm.e2e.test.ts` - Epic LLM E2E
- **Integration:** `businessRule.llm.e2e.test.ts` - Business Rule LLM E2E
- **Integration:** `validate-feature-goals-generation.test.ts` - Validera Feature Goal-generering
  - **Konfigurerbar katalog:** Använd `BPMN_TEST_DIR=/path/to/bpmn/files` för att läsa från lokal katalog istället för fixtures
  - **Exempel:** `BPMN_TEST_DIR=/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se npm test -- validate-feature-goals-generation.test.ts`
- **Integration:** `feature-goal-missing-subprocess.test.ts` - Feature Goal med saknad subprocess
- **Unit:** `featureGoalLlmMapper.test.ts` - Feature Goal LLM mapper
- **Unit:** `featureGoalLlmMapper.structured.test.ts` - Feature Goal LLM mapper (strukturerad)
- **Unit:** `epicLlmMapper.structured.test.ts` - Epic LLM mapper (strukturerad)
- **Unit:** `businessRuleLlmMapper.structured.test.ts` - Business Rule LLM mapper (strukturerad)
- **Unit:** `renderFeatureGoalDocStructure.test.ts` - Feature Goal dokumentationsstruktur
- **Unit:** `renderEpicDocStructure.test.ts` - Epic dokumentationsstruktur
- **Unit:** `renderBusinessRuleDocStructure.test.ts` - Business Rule dokumentationsstruktur

### Process Graph & Tree
- **Integration:** `bpmnProcessGraph.mortgage.integration.test.ts` - Process graph (mortgage)
- **Integration:** `buildProcessTreeFromGraph.mortgage.integration.test.ts` - Build tree från graph (mortgage)
- **Unit:** `processGraphBuilder.comprehensive.test.ts` - Process graph builder (omfattande)
- **Unit:** `processGraphBuilder.cycles.test.ts` - Process graph builder (cykler)
- **Unit:** `processGraphBuilder.mortgage.test.ts` - Process graph builder (mortgage)
- **Unit:** `buildProcessTreeFromGraph.comprehensive.test.ts` - Build tree (omfattande)
- **Unit:** `buildProcessTreeFromGraph.cyclesAndMissing.test.ts` - Build tree (cykler & saknade)
- **Unit:** `buildProcessTreeFromGraph.mortgage.test.ts` - Build tree (mortgage)
- **Integration:** `mortgage.tree-hierarchy.test.ts` - Mortgage tree-hierarki
- **Integration:** `mortgage.tree.snapshot.test.ts` - Mortgage tree snapshot
- **Integration:** `print-bpmn-tree.test.ts` - Print BPMN tree

### Genereringsordning & Hierarki
- **Integration:** `generation-order-scenarios.test.ts` - Genereringsordning scenarion
- **Integration:** `aggregation-order.test.ts` - Aggregeringsordning
- **Integration:** `node-generation-order-analysis.test.ts` - Node-genereringsordning analys
- **Integration:** `node-generation-order-depth-example.test.ts` - Node-genereringsordning (depth example)
- **Integration:** `mortgage.order-debug.test.ts` - Mortgage order debug
- **Integration:** `mortgage.order-validation.test.ts` - Mortgage order validation
- **Integration:** `processModel.sequenceOrder.mortgage.test.ts` - Sequence order (mortgage)

### BPMN Map & Storage
- **Integration:** `bpmn-map-auto-generation.test.ts` - BPMN map auto-generering
- **Integration:** `bpmnMapStorage.test.ts` - BPMN map storage
- **Integration:** `docviewer-feature-goal-paths.test.ts` - DocViewer feature goal paths
- **Unit:** `docviewerFeatureGoalPath.test.ts` - DocViewer feature goal path
- **Unit:** `featureGoalPathGeneration.test.ts` - Feature goal path-generering

### Snapshot & Artifacts
- **Integration:** `mortgage.artifacts.snapshot.test.ts` - Mortgage artifacts snapshot
- **Integration:** `force-regenerate-storage-checks.test.ts` - Force regenerate storage checks
- **Unit:** `artifactAvailability.test.ts` - Artifact availability
- **Unit:** `fileArtifactCoverageHierarchy.test.ts` - File artifact coverage hierarki

### Dokumentationsrendering & Templates
- **Unit:** `documentationRendering.regression.test.ts` - Dokumentationsrendering (regression)
- **Unit:** `documentationTemplates.schema.test.ts` - Dokumentationsmallar schema
- **Unit:** `dorDodTemplates.test.ts` - DoR/DoD templates
- **Unit:** `wrapDocumentFallbackBanner.test.ts` - Wrap document fallback banner

### Per-Node Overrides
- **Integration:** `per-node-overrides.test.ts` - Per-node overrides
- **Integration:** `improve-feature-goals-batch.test.ts` - Förbättra feature goals batch

### Batch Generation
- **Integration:** `mortgage-se-batch-generation.test.ts` - Mortgage SE batch-generering
- **Integration:** `mortgage-se-batch-generation-hierarchy.test.ts` - Mortgage SE batch-generering (hierarki)

### Intermediate Events
- **Integration:** `intermediate-events-analysis.test.ts` - Intermediate events analys
- **Integration:** `intermediate-events-solution.test.ts` - Intermediate events lösning
- **Unit:** `sequenceOrderHelpers.intermediate-events.test.ts` - Sequence order helpers (intermediate events)

### Sequence Flow & Order
- **Unit:** `sequenceFlowExtractor.test.ts` - Sequence flow extractor

### Node Filtering & Matrix
- **Integration:** `node-filter-force-regenerate.test.ts` - Node filter force regenerate
- **Unit:** `nodeMatrixFiltering.test.ts` - Node matrix filtering

### Application-specifika
- **Integration:** `application-documentation-analysis.test.ts` - Application dokumentationsanalys
- **Integration:** `application-hierarchy-documentation.test.ts` - Application hierarki-dokumentation
- **Integration:** `household-generation-analysis.test.ts` - Household genereringsanalys

### Parameter Combinations
- **Integration:** `parameter-combinations.test.ts` - Parameter combinations

### Root File Selection
- **Unit:** `pickRootBpmnFile.test.ts` - Pick root BPMN file

### Timeline & Scheduling
- **Unit:** `timelineScheduling.test.ts` - Timeline scheduling
- **Unit:** `projectPlan.test.ts` - Project plan

### Prompt Versioning
- **Unit:** `promptVersioning.test.ts` - Prompt versioning

### Schema Verification
- **Unit:** `schemaVerification.test.ts` - Schema verification

### Test Report
- **Unit:** `testReportFiltering.test.ts` - Test report filtering

### Test Information Generation (Under utveckling)
> **Status:** Testfiler skapade men väntar på implementation av funktionalitet. Se [`docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md`](../docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md) för implementeringsplan.

**Unit-tester:**
- **`tests/unit/testGeneration/userStoryExtractor.test.ts`** - Extrahera user stories från dokumentation
- **`tests/unit/testGeneration/userStoryToTestScenario.test.ts`** - Konvertera user stories till test scenarios
- **`tests/unit/testGeneration/bpmnProcessFlowTestGenerator.test.ts`** - Generera scenarios från BPMN-processflöde
- **`tests/unit/e2eScenarioGenerator.test.ts`** - E2E-scenario-generering med Claude
  - ✅ `generateE2eScenarioWithLlm` - Fullt implementerad med mocks (inkl. pathMetadata)
  - ⚠️ `generateE2eScenariosForProcess` - Placeholder-tester (TODO: Implementera integrationstester)
- **`tests/unit/e2eScenarioStorage.test.ts`** - E2E-scenario storage (spara/ladda) - ✅ Implementerad
- **`tests/unit/e2eScenarioValidator.test.ts`** - E2E-scenario validering (struktur och innehåll) - ✅ Implementerad
- **`tests/unit/testGeneration/testScenarioSaver.test.ts`** - Spara scenarios till databasen

**Integrationstester:**
- **`tests/integration/testGeneration/integration.test.ts`** - Fullständigt dataflöde (extrahera → konvertera → spara)

**Teststrategi:**
- Fokuserar på struktur och dataflöde (inte faktisk LLM-generering)
- Använder mock-data istället för faktisk dokumentation
- Verifierar UI-kompatibilitet (format matchar UI-förväntningar)
- Se [`docs/analysis/TEST_GENERATION_UI_VALIDATION.md`](../docs/analysis/TEST_GENERATION_UI_VALIDATION.md) för detaljerad validering

**Status:**
- ✅ Testfiler skapade
- ✅ E2E scenario-generering implementerad (inkl. pathMetadata, innehållsvalidering)
- ✅ Feature Goal-test generering implementerad
- ✅ Felhantering och varningar implementerade (`e2eGenerationErrors`, `featureGoalTestErrors`, `warnings`)
- ⚠️ Vissa integrationstester är fortfarande placeholders

### Debug & Utilities
- **Unit:** `debugUtils.test.ts` - Debug utilities
- **Unit:** `createGraphSummaryDepth.test.ts` - Create graph summary depth

### Navigation & UI (Unit)
- **Unit:** `useAppNavigation.mock.test.ts` - App navigation (mock)
- **Unit:** `bpmnViewerClickHandling.test.ts` - BPMN viewer click handling
- **Unit:** `processExplorerZoom.test.ts` - Process explorer zoom

### Generate All
- **Unit:** `generateAllFromBpmnWithGraph.test.ts` - Generate all från BPMN med graph

---

## 🎭 Playwright E2E Tests

### UI-sidor
- **`bpmn-file-manager.spec.ts`** - BPMN File Manager-sidan (filhantering, hierarki, generering)
  - **Refaktorerad:** Filuppladdning extraherad till `useFileUpload` hook och `FileUploadArea` komponent
  - **Status:** Tester fungerar med refaktorerad kod
- **`process-explorer.spec.ts`** - Process Explorer-sidan (trädvisualisering, nod-interaktion)
- **`doc-viewer.spec.ts`** - Doc Viewer-sidan (dokumentationsvisning, länkar, version selection)
- **`node-matrix.spec.ts`** - Node Matrix-sidan (listvy, filter, sortering)
- **`timeline-page.spec.ts`** - Timeline-sidan (Gantt-chart, filter, datum-redigering)
- **`test-coverage-explorer.spec.ts`** - Test Coverage Explorer-sidan (E2E scenarios, scenario selector, TestCoverageTable)
- **`e2e-tests-overview.spec.ts`** - E2E Tests Overview-sidan (scenarios table, filter, search, expand scenario)

### Fullständiga Flöden
- **`full-generation-flow.spec.ts`** - Komplett genereringsflöde (upload → hierarki → generering)
- **`file-upload-versioning.spec.ts`** - Fil-upload och versioning
- **`claude-generation.spec.ts`** - Claude-generering för application-processen

### Happy Path Scenarios
- **`scenarios/happy-path/mortgage-application-happy.spec.ts`** - Mortgage application happy path
- **`scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts`** - Mortgage application multi-stakeholder
- **`scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts`** - Mortgage bostadsrätt happy path
- **`scenarios/happy-path/mortgage-bostadsratt-two-applicants-happy.spec.ts`** - Mortgage bostadsrätt two applicants
- **`scenarios/happy-path/mortgage-credit-decision-happy.spec.ts`** - Mortgage credit decision happy path

---

## 🧪 E2E Tests (Vitest)

- **`process-explorer.smoke.test.ts`** - Process Explorer smoke test

---

## 📝 Integration Tests (Mortgage-specifika)

- **`mortgage.e2e.test.ts`** - Mortgage E2E test

---

## 🚀 Snabbkommandon

### Kör alla tester
```bash
npm test
```

### Kör specifik kategori
```bash
npm test -- tests/unit/          # Alla unit tests
npm test -- tests/integration/   # Alla integration tests
npm test -- tests/e2e/           # Alla E2E tests
npx playwright test              # Alla Playwright tests
```

### Kör specifikt test
```bash
npm test -- tests/integration/local-folder-diff.test.ts
npm test -- tests/integration/validate-feature-goals-generation.test.ts
npm test -- tests/unit/bpmnVersioning.test.ts
```

### Kör Playwright test
```bash
npx playwright test tests/playwright-e2e/bpmn-file-manager.spec.ts
```

---

## 🔍 Sök efter Specifik Funktionalitet

### "Jag vill testa diff-funktionalitet"
→ `tests/integration/local-folder-diff.test.ts`

### "Jag vill testa dokumentationsgenerering"
→ `tests/integration/application-documentation-generation.test.ts`
→ `tests/integration/household-documentation-generation.test.ts`
→ `tests/integration/full-flow-generation-upload-read.test.ts`

### "Jag vill testa LLM-integration"
→ `tests/integration/claude-api-simple.test.ts`
→ `tests/integration/llm.real.smoke.test.ts`
→ `tests/unit/llmClientAbstraction.test.ts`

### "Jag vill testa BPMN parsing"
→ `tests/integration/bpmnParser.real.test.ts`
→ `tests/integration/bpmnRealParse.mortgage.test.ts`
→ `tests/unit/bpmnHierarchy.integration.test.ts`

### "Jag vill testa Feature Goals"
→ `tests/integration/validate-feature-goals-generation.test.ts`
→ `tests/integration/featureGoal.llm.e2e.test.ts`
→ `tests/unit/featureGoalLlmMapper.test.ts`

### "Jag vill testa genereringsordning"
→ `tests/integration/generation-order-scenarios.test.ts`
→ `tests/integration/aggregation-order.test.ts`
→ `tests/integration/node-generation-order-analysis.test.ts`

### "Jag vill testa UI-sidor"
→ `tests/playwright-e2e/bpmn-file-manager.spec.ts`
→ `tests/playwright-e2e/process-explorer.spec.ts`
→ `tests/playwright-e2e/doc-viewer.spec.ts`

---

## 📊 Teststatistik (Utvecklartester)

- **Unit Tests:** ~48 filer (inkl. 5 nya test generation-tester, varav 4 implementerade)
- **Integration Tests:** ~42 filer (inkl. 1 ny test generation-test under utveckling)
- **E2E Tests (Vitest):** 1 fil
- **Playwright E2E Tests:** 18 filer (7 huvudfiler + 11 scenario-filer)

**Totalt:** ~108 testfiler (utvecklartester)

**Notera:** Test generation-tester (5 filer) är skapade, varav 4 är implementerade. Vissa integrationstester är fortfarande placeholders.

---

## 🎭 Tester som Appen Genererar (Användartester)

> **Viktigt:** Dessa är INTE utvecklartester. De är artefakter som appen genererar för användarna.

**Viktigt:** Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte för att generera given/when/then. All testinformation finns nu i E2E scenarios och Feature Goal-test scenarios.

### E2E-scenarios (genererade från BPMN-processgraf)
- **Var:** Sparas i Supabase Storage under `e2e-scenarios/` mappen
- **Hur genereras:** Via "Generera testinfo" i BPMN File Manager
- **Struktur:** JSON-filer med kompletta E2E-scenarios för root-processen

### Feature Goal-test scenarios (extraherat från E2E-scenarios)
- **Var:** Sparas i databasen (`node_planned_scenarios` tabellen)
- **Hur genereras:** Automatiskt extraherat från E2E-scenarios
- **Struktur:** Test scenarios per Feature Goal med gateway-kontext
- **Syfte:** Används av användare för att testa sina BPMN-processer
- **Se:** [`tests/README.md`](./README.md) - "Test Generation" sektion

**Viktigt:** Epic-testgenerering har tagits bort. Endast Feature Goals (Call Activities) genererar testfiler. Epic-information finns redan inkluderad i Feature Goal-dokumentation via `childrenDocumentation`.

### Test-scenarion (extraherade från E2E-scenarios)
- **Var:** Sparas i `node_planned_scenarios` tabellen i Supabase
- **Hur genereras:** Extraheras från E2E-scenarios (som genereras från Feature Goal-dokumentation)
- **Syfte:** Används för att visa test-scenarion i Test Coverage Explorer
- **Se:** [`docs/analysis/TEST_INFORMATION_GENERATION_ANALYSIS.md`](../docs/analysis/TEST_INFORMATION_GENERATION_ANALYSIS.md)
- **Se:** [`docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md`](../docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md) - Implementeringsplan
- **Se:** [`docs/analysis/TEST_GENERATION_UI_VALIDATION.md`](../docs/analysis/TEST_GENERATION_UI_VALIDATION.md) - UI-validering
- **Se:** [`docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md`](../docs/analysis/TEST_GENERATION_IMPLEMENTATION_PLAN_V2.md) - Implementeringsplan
- **Se:** [`docs/analysis/TEST_GENERATION_UI_VALIDATION.md`](../docs/analysis/TEST_GENERATION_UI_VALIDATION.md) - UI-validering

### Test Coverage-data
- **Var:** Visas i Test Coverage Explorer-sidan i appen
- **Hur genereras:** Byggs från BPMN-hierarki och test-scenarion
- **Syfte:** Ge användare översikt över testtäckning för sina BPMN-processer

**Notera:** Dessa genererade tester är INTE en del av utvecklartest-suiten. De är användarartefakter som appen skapar.

---

## 🔄 Uppdatering

Denna fil bör uppdateras när nya tester läggs till. För att hitta alla testfiler:

```bash
find tests -name "*.test.ts" -o -name "*.spec.ts" | sort
```

---

**Senast uppdaterad:** 2025-01-XX

