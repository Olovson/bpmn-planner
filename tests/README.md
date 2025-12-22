# BPMN Test Suite

## Översikt

Detta test-suite innehåller tester för BPMN Planner-applikationen, organiserade i fyra huvudkategorier:

> 📋 **Snabb referens:** Se [`TEST_INDEX.md`](./TEST_INDEX.md) för komplett index över alla tester organiserade efter funktionalitet.

1. **Unit Tests** (`tests/unit/`) - ~43 filer - Isolerade funktioner och komponenter
2. **Integration Tests** (`tests/integration/`) - ~41 filer - Flöden mellan komponenter
   - **Local Folder Diff Analysis** (`local-folder-diff.test.ts`) - Testar "Analysera Lokal Mapp"-funktionalitet
3. **E2E Tests** (`tests/e2e/`) - 1 fil - UI-komponenter i isolerad miljö
4. **Playwright E2E Tests** (`tests/playwright-e2e/`) - 7 filer - Fullständiga användarflöden

> 📋 **För en detaljerad analys av testtäckning och gaps, se:**
> - [`docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md`](../docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md) - Omfattande analys av testtäckning och identifierade gaps
> - [`docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md`](../docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md) - Konkret implementeringsplan för att förbättra testtäckningen

## Teststruktur

### Playwright Tests (Generated from BPMN)

Playwright-tester genereras från BPMN-processmodeller och är organiserade hierarkiskt för att matcha BPMN- och Jira-strukturen:

- **Initiative** (top-level BPMN process, e.g., "Application")
- **Feature Goals** (CallActivity nodes)
- **Epics** (UserTask, ServiceTask, BusinessRuleTask nodes)

## Integration Tests

### ⭐ Validera Nya BPMN-filer från A till Ö

**För en komplett guide om hur du validerar nya BPMN-filer, se:**
**[`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md)**

Denna guide täcker hela processen:
- Hitta alla BPMN-filer (rekursivt)
- Analysera diff mot befintliga filer
- Validera parsing, graph building, tree building
- Validera dokumentationsgenerering (Feature Goals & Epics)
- Checklista och felsökning

### Konfigurerbar BPMN-katalog för tester

Vissa tester kan läsa BPMN-filer från en lokal katalog istället för fixtures via environment variable `BPMN_TEST_DIR`:

```bash
# Använd lokal katalog
BPMN_TEST_DIR=/path/to/bpmn/files npm test -- validate-feature-goals-generation.test.ts

# Använd fixtures (default)
npm test -- validate-feature-goals-generation.test.ts
```

Detta är användbart när du vill validera nya BPMN-filer innan de läggs till i fixtures. Funktionen söker rekursivt i den angivna katalogen efter BPMN-filer.

**Viktigt:** Använd den kompletta guiden ovan för att se vilka tester som ska användas och i vilken ordning.

### Local Folder Diff Analysis

**`tests/integration/local-folder-diff.test.ts`** - Tests the "Analysera Lokal Mapp" functionality

This test:
- Finds all BPMN files recursively in a directory using Node.js fs
- Calculates diff against existing files in Supabase
- Uses the same core functions as the app (`parseBpmnFileContent`, `calculateDiffForLocalFile`)
- Validates that diff analysis works correctly before uploading files

**Usage:**
```bash
npm test -- tests/integration/local-folder-diff.test.ts
```

**Test Directory:**
- Default: `/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se`
- Can be modified in the test file's `testDirPath` constant

**What it tests:**
1. ✅ Recursive BPMN file discovery
2. ✅ Diff calculation for each file
3. ✅ Same functions as app (read-only, no uploads)

---

## Test Structure

Each test file follows a hierarchical structure with nested `describe` blocks:

```typescript
test.describe('Application', () => {
  test.describe('Internal data gathering', () => {
    test('Application / Internal data gathering / Fetch party information – happy path', 
      async ({ page }, testInfo) => {
        // Test implementation
      }
    );
  });
});
```

## Test Naming Convention

Test names follow the pattern:

```
<Initiative> / <FeatureGoalPath> / <NodeName> – <ScenarioType>
```

Examples:
- `Application / Confirm application – happy path`
- `Application / Internal data gathering / Fetch party information – validation error`
- `Application / Stakeholder / Register applicant – edge case`

## Test Metadata & Tags

Every test is annotated with metadata tags for filtering and reporting:

- `@initiative:<name>` - Top-level process (e.g., `@initiative:application`)
- `@feature:<path>` - Feature goal path (e.g., `@feature:application-internal-data-gathering`)
- `@epic:<path>` - Full hierarchical path to epic (e.g., `@epic:application-internal-data-gathering-fetch-party-information`)
- `@bpmn:<element-id>` - BPMN element ID (e.g., `@bpmn:fetch-party-information`)
- `@bpmn-file:<file>` - BPMN file name (e.g., `@bpmn-file:mortgage-se-application`)
- `@jira-type:<type>` - Jira type (`@jira-type:epic` or `@jira-type:feature-goal`)

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests by initiative
```bash
npx playwright test --grep "@initiative:application"
```

### Run tests by feature goal
```bash
npx playwright test --grep "@feature:application-internal-data-gathering"
```

### Run tests by epic/node
```bash
npx playwright test --grep "@epic:application-internal-data-gathering-fetch-party-information"
```

### Run tests by BPMN element
```bash
npx playwright test --grep "@bpmn:fetch-party-information"
```

### Run tests by Jira type
```bash
# Run all feature goal tests
npx playwright test --grep "@jira-type:feature-goal"

# Run all epic tests
npx playwright test --grep "@jira-type:epic"
```

### Run tests by BPMN file
```bash
npx playwright test --grep "@bpmn-file:mortgage-se-application"
```

### Combine filters
```bash
# Run all epics in the Application initiative
npx playwright test --grep "@initiative:application" --grep "@jira-type:epic"

# Run all tests in Internal data gathering feature
npx playwright test --grep "@feature:application-internal-data-gathering"
```

## ⚠️ Viktig Distinktion: Två Typer av Tester

### 1. Utvecklartester (validerar appens funktionalitet)
Dessa tester i denna mapp (`tests/`) validerar att appens kod fungerar korrekt:
- **Unit Tests** - Testar isolerade funktioner
- **Integration Tests** - Testar flöden mellan komponenter
- **E2E Tests** - Testar UI-komponenter
- **Playwright E2E Tests** - Testar fullständiga användarflöden

**Syfte:** Säkerställa att appens kod, logik och funktionalitet fungerar som förväntat.

### 2. Användartester (genererade av appen)
Dessa tester genereras av appen från BPMN-filer och sparas i Supabase Storage:
- **Playwright-testfiler** - Genereras från BPMN-processer
- **Test-scenarion** - Extraheras från dokumentation
- **Test Coverage-data** - Visas i Test Coverage Explorer

**Syfte:** Används av användare för att testa sina BPMN-processer, INTE för att validera appens kod.

**Viktigt:** När vi pratar om "tester" i utvecklingssammanhang menar vi vanligtvis kategori 1 (utvecklartester). Kategori 2 är "artefakter" som appen genererar för användarna.

---

## Test Generation (Användartester)

> **Notera:** Detta avsnitt handlar om tester som **appen genererar för användarna**, inte utvecklartester.

Tests are automatically generated from BPMN files via the `generate-artifacts` edge function. The generation:

1. Parses BPMN hierarchy (Initiative → Feature Goals → Epics)
2. Generates test stubs with standardized naming
3. Adds metadata annotations for filtering
4. Preserves existing test implementations (does not overwrite)

To regenerate tests:
1. Go to the BPMN File Manager
2. Select a BPMN file
3. Click "Generate Artifacts"
4. Tests will be created/updated in Supabase Storage

**Dessa genererade tester är INTE en del av utvecklartest-suiten.**

## Test Metadata Utilities

Helper functions for working with test metadata are available in:

```typescript
import { 
  buildTestName, 
  buildTags, 
  buildAnnotations,
  nodeToMeta,
  type NodeMeta 
} from '@/tests/meta/jiraBpmnMeta';
```

See `src/tests/meta/jiraBpmnMeta.ts` for details.

## Best Practices

1. **Don't edit generated test stubs** - The generator preserves existing implementations, but you should implement tests in the generated stubs rather than creating new files
2. **Use consistent scenario types** - Stick to: `happy path`, `validation error`, `edge case`, `error handling`
3. **Add additional scenarios** - You can add more test scenarios for the same node by following the naming convention
4. **Keep metadata in sync** - When adding manual tests, use the `buildTestName()` and `buildAnnotations()` helpers to maintain consistency

## Viewing Test Results

Test results are integrated into the app's Test Report dashboard:
- Navigate to the "Tests" page in the app
- View hierarchical test results grouped by Initiative → Feature Goal → Epic
- Click on test names to see BPMN links and documentation

## CI/CD Integration

Tests run automatically on GitHub Actions. Results are submitted to the app's test dashboard for tracking. See `.github/workflows/tests.yml` for workflow configuration.

---

## Test Coverage och Gaps

### Nuvarande Status

- ✅ **Unit Tests:** Bra täckning (~43 filer)
- ✅ **Integration Tests:** Bra täckning (~40 filer) + 2 nya (template-versioning, per-node-overrides)
- ⚠️ **E2E Tests:** Begränsad täckning (1 smoke test)
- ✅ **Playwright E2E:** Förbättrad täckning (11 filer totalt, inkl. nya UI-tester)

### Implementeringsstatus

**Fas 1: Kritiska UI-flöden** ✅ **KLART**
- ✅ BpmnFileManager UI-test
- ✅ ProcessExplorer UI-test
- ✅ DocViewer UI-test
- ✅ Fullständigt genereringsflöde

**Fas 2: Viktiga funktioner** ✅ **KLART**
- ✅ Template versioning (integration test)
- ✅ Per-node overrides (integration test)
- ✅ NodeMatrix UI-test
- ✅ TimelinePage UI-test

**Fas 3: Mindre gaps** ⏳ **PENDING**
- ⏳ TestCoverageExplorerPage
- ⏳ E2eQualityValidationPage
- ⏳ GitHub-synkronisering
- ⏳ Jira-namngivning

### Identifierade Gaps (Återstående)

**Mindre gaps (låg prioritet):**
- TestCoverageExplorerPage UI-test
- E2eQualityValidationPage UI-test
- GitHub-synkronisering integration test
- Jira-namngivning unit test
- DoR/DoD i UI

Se [`docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md`](../docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md) för detaljerad analys och [`docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md`](../docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md) för implementeringsplan.
