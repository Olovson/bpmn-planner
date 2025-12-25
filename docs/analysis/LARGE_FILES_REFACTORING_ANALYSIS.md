# Analys: Stora Kodfiler som Behöver Refaktorering

## Översikt

Detta dokument analyserar kodfiler över 1500 rader och identifierar vilka som behöver refaktorering, tillsammans med implementeringsförslag och teststrategier.

## Identifierade Stora Filer

### 1. `src/lib/bpmnGenerators.ts` - 3200 rader
**Status:** ✅ Redan refaktorerad (enligt `docs/analysis/REFACTORING_SUMMARY.md`)
- Delad upp i flera moduler:
  - `bpmnGenerators/types.ts`
  - `bpmnGenerators/testGenerators.ts`
  - `bpmnGenerators/dorDodGenerator.ts`
  - `bpmnGenerators/documentationGenerator.ts`
  - `bpmnGenerators/docRendering.ts`
  - `bpmnGenerators/batchHelpers.ts`
  - `bpmnGenerators/batchGenerator.ts`
- **Tester:** ✅ `tests/unit/generateAllFromBpmnWithGraph.test.ts` (5/5 passed)

### 2. `src/pages/E2eQualityValidationPage.tsx` - 2469 rader ⚠️
**Behöver refaktorering:** JA
**Prioritet:** HÖG

**Nuvarande struktur:**
- En stor React-komponent med många funktioner
- Valideringslogik, UI-rendering, state management allt i samma fil
- Många interfaces och typer definierade i filen

**Förslag på refaktorering:**
1. **Extrahera typer och interfaces** → `E2eQualityValidationPage/types.ts`
2. **Extrahera valideringslogik** → `E2eQualityValidationPage/utils/validationHelpers.ts`
3. **Extrahera UI-komponenter:**
   - `ValidationIssueList.tsx` - Lista över valideringsproblem
   - `CompletenessMetrics.tsx` - Kompletthetsmätningar
   - `MockQualityAnalysis.tsx` - Mock-kvalitetsanalys
   - `ValidationReport.tsx` - Valideringsrapport
4. **Extrahera hooks:**
   - `useValidationAnalysis.ts` - Valideringsanalys-logik
   - `useCompletenessMetrics.ts` - Kompletthetsmätningar
   - `useMockQualityAnalysis.ts` - Mock-kvalitetsanalys

**Mål:** Reducera till ~800-1000 rader

**Tester:**
- ⚠️ **Saknas:** Inga specifika tester för denna sida
- **Behöver skapas:**
  - `tests/playwright-e2e/e2e-quality-validation.spec.ts` - UI-test
  - `tests/unit/e2eQualityValidation/validationHelpers.test.ts` - Valideringslogik
  - `tests/unit/e2eQualityValidation/completenessMetrics.test.ts` - Kompletthetsmätningar

### 3. `src/data/testMapping.ts` - 2332 rader
**Behöver refaktorering:** NEJ (datafil)
**Prioritet:** LÅG

**Anmärkning:** Detta är en datafil med mappningar, inte kod. Kanske kan delas upp i flera filer för bättre organisation, men det är inte kritiskt.

### 4. `src/lib/documentationTemplates.ts` - 2008 rader ⚠️
**Behöver refaktorering:** JA
**Prioritet:** MEDEL

**Nuvarande struktur:**
- Många template-funktioner för olika dokumentationstyper
- Schema-definitioner
- Rendering-logik

**Förslag på refaktorering:**
1. **Extrahera scheman** → `documentationTemplates/schemas.ts`
2. **Extrahera template-funktioner per typ:**
   - `documentationTemplates/featureGoalTemplate.ts`
   - `documentationTemplates/epicTemplate.ts`
   - `documentationTemplates/businessRuleTemplate.ts`
3. **Extrahera rendering-helpers** → `documentationTemplates/renderingHelpers.ts`
4. **Extrahera link-generering** → `documentationTemplates/linkHelpers.ts`

**Mål:** Reducera till ~600-800 rader

**Tester:**
- ✅ **Finns:** `tests/unit/documentationTemplates.schema.test.ts`
- ⚠️ **Saknas:** Tester för rendering-logik
- **Behöver skapas:**
  - `tests/unit/documentationTemplates/featureGoalTemplate.test.ts`
  - `tests/unit/documentationTemplates/epicTemplate.test.ts`
  - `tests/unit/documentationTemplates/businessRuleTemplate.test.ts`
  - `tests/unit/documentationTemplates/renderingHelpers.test.ts`

### 5. `src/pages/BpmnFileManager/hooks/useFileGeneration.ts` - 1653 rader ⚠️
**Behöver refaktorering:** JA
**Prioritet:** HÖG

**Nuvarande struktur:**
- En stor hook med många funktioner
- Genereringslogik, state management, progress tracking allt i samma fil

**Förslag på refaktorering:**
1. **Extrahera genereringslogik** → `useFileGeneration/generationLogic.ts`
2. **Extrahera progress tracking** → `useFileGeneration/progressTracking.ts`
3. **Extrahera job management** → `useFileGeneration/jobManagement.ts` (kan använda `useJobManagement` istället)
4. **Extrahera upload-logik** → `useFileGeneration/uploadLogic.ts`
5. **Dela upp huvudfunktioner:**
   - `useFileGeneration/handleGenerateArtifacts.ts`
   - `useFileGeneration/handleGenerateAllArtifacts.ts`
   - `useFileGeneration/handleGenerateSelectedFile.ts`

**Mål:** Reducera till ~600-800 rader

**Tester:**
- ✅ **Finns:** `tests/unit/generateAllFromBpmnWithGraph.test.ts` (testar underliggande logik)
- ⚠️ **Saknas:** Tester för hook-specifik logik
- **Behöver skapas:**
  - `tests/unit/useFileGeneration/generationLogic.test.ts`
  - `tests/unit/useFileGeneration/progressTracking.test.ts`
  - `tests/integration/useFileGeneration/handleGenerateArtifacts.test.ts`

### 6. `src/components/TestCoverageTable.tsx` - 1467 rader ⚠️
**Behöver refaktorering:** JA
**Prioritet:** MEDEL

**Nuvarande struktur:**
- En stor React-komponent med många rendering-funktioner
- Tabell-logik, sortering, filtrering allt i samma fil

**Förslag på refaktorering:**
1. **Extrahera typer** → `TestCoverageTable/types.ts`
2. **Extrahera rendering-helpers:**
   - `TestCoverageTable/renderHelpers.ts` - Rendering-funktioner
   - `TestCoverageTable/cellRenderers.ts` - Cell-rendering
3. **Extrahera sub-komponenter:**
   - `TestCoverageTable/TableHeader.tsx`
   - `TestCoverageTable/TableRow.tsx`
   - `TestCoverageTable/TableCell.tsx`
4. **Extrahera logik:**
   - `TestCoverageTable/sorting.ts` - Sorteringslogik
   - `TestCoverageTable/filtering.ts` - Filtreringslogik
   - `TestCoverageTable/calculations.ts` - Beräkningslogik

**Mål:** Reducera till ~500-700 rader

**Tester:**
- ✅ **Finns:** `tests/playwright-e2e/test-coverage-explorer.spec.ts` (testar UI)
- ⚠️ **Saknas:** Tester för rendering-logik och beräkningar
- **Behöver skapas:**
  - `tests/unit/TestCoverageTable/sorting.test.ts`
  - `tests/unit/TestCoverageTable/filtering.test.ts`
  - `tests/unit/TestCoverageTable/calculations.test.ts`
  - `tests/unit/TestCoverageTable/renderHelpers.test.ts`

## Implementeringsplan

### Prioritet 1: E2eQualityValidationPage (2469 rader)
**Anledning:** Störst fil, ingen testtäckning, hög komplexitet

**Steg:**
1. Skapa teststruktur först
2. Extrahera typer och interfaces
3. Extrahera valideringslogik
4. Extrahera UI-komponenter
5. Extrahera hooks
6. Validera med tester

**Tidsuppskattning:** 2-3 dagar

### Prioritet 2: useFileGeneration (1653 rader)
**Anledning:** Kritiskt för BpmnFileManager, används aktivt

**Steg:**
1. Skapa teststruktur först
2. Extrahera genereringslogik
3. Extrahera progress tracking
4. Extrahera upload-logik
5. Dela upp huvudfunktioner
6. Validera med tester

**Tidsuppskattning:** 1-2 dagar

### Prioritet 3: documentationTemplates (2008 rader)
**Anledning:** Stör fil, delvis testtäckning

**Steg:**
1. Skapa saknade tester först
2. Extrahera scheman
3. Extrahera template-funktioner per typ
4. Extrahera rendering-helpers
5. Validera med tester

**Tidsuppskattning:** 1-2 dagar

### Prioritet 4: TestCoverageTable (1467 rader)
**Anledning:** UI-komponent, delvis testtäckning

**Steg:**
1. Skapa saknade tester först
2. Extrahera typer
3. Extrahera rendering-helpers
4. Extrahera sub-komponenter
5. Extrahera logik
6. Validera med tester

**Tidsuppskattning:** 1 dag

## Teststrategi

### För varje refaktorering:
1. **Skapa tester FÖRE refaktorering** (om de saknas)
2. **Kör befintliga tester** för att säkerställa att de fungerar
3. **Refaktorera stegvis** - en modul i taget
4. **Validera efter varje steg** - kör tester
5. **Uppdatera tester** om nödvändigt

### Testtyper per fil:

**E2eQualityValidationPage:**
- Playwright E2E-test för UI
- Unit-tester för valideringslogik
- Unit-tester för beräkningar

**useFileGeneration:**
- Integration-tester för genereringsflöden
- Unit-tester för logik-funktioner
- Mock-tester för progress tracking

**documentationTemplates:**
- Unit-tester för varje template-typ
- Unit-tester för rendering-helpers
- Snapshot-tester för HTML-output

**TestCoverageTable:**
- Playwright E2E-test (redan finns)
- Unit-tester för sortering/filtrering
- Unit-tester för beräkningar
- Snapshot-tester för rendering

## Sammanfattning

| Fil | Storlek | Prioritet | Testtäckning | Tidsuppskattning |
|-----|--------|-----------|--------------|------------------|
| `bpmnGenerators.ts` | 3200 | ✅ Klar | ✅ Bra | - |
| `E2eQualityValidationPage.tsx` | 2469 | 🔴 HÖG | ❌ Saknas | 2-3 dagar |
| `testMapping.ts` | 2332 | ⚪ LÅG | - | - |
| `documentationTemplates.ts` | 2008 | 🟡 MEDEL | ⚠️ Delvis | 1-2 dagar |
| `useFileGeneration.ts` | 1653 | 🔴 HÖG | ⚠️ Delvis | 1-2 dagar |
| `TestCoverageTable.tsx` | 1467 | 🟡 MEDEL | ⚠️ Delvis | 1 dag |

**Totalt:** 4 filer behöver refaktorering, ~5-8 dagars arbete

