# Implementeringsplan: Refaktorering av Stora Kodfiler

## Översikt

Detta dokument innehåller en detaljerad implementeringsplan för refaktorering av stora kodfiler (>1500 rader), inklusive teststrategi och validering.

## Prioritering

### Prioritet 1: E2eQualityValidationPage.tsx (2469 rader)
**Anledning:** Störst fil, ingen testtäckning, hög komplexitet

### Prioritet 2: useFileGeneration.ts (1653 rader)
**Anledning:** Kritiskt för BpmnFileManager, används aktivt

### Prioritet 3: documentationTemplates.ts (2008 rader)
**Anledning:** Stor fil, delvis testtäckning

### Prioritet 4: TestCoverageTable.tsx (1467 rader)
**Anledning:** UI-komponent, delvis testtäckning

---

## 1. E2eQualityValidationPage.tsx (2469 rader)

### Nuvarande Struktur
- En stor React-komponent med många funktioner
- Valideringslogik, UI-rendering, state management allt i samma fil
- Många interfaces och typer definierade i filen

### Refaktoreringsplan

#### Steg 1: Skapa teststruktur (FÖRE refaktorering)
**Mål:** Säkerställa att vi kan validera refaktoreringen

**Filer att skapa:**
1. `tests/playwright-e2e/e2e-quality-validation.spec.ts`
   - Testa att sidan laddas
   - Testa att validering körs
   - Testa att resultat visas

2. `tests/unit/e2eQualityValidation/validationHelpers.test.ts`
   - Testa valideringslogik
   - Testa issue-generering
   - Testa kategorisering

3. `tests/unit/e2eQualityValidation/completenessMetrics.test.ts`
   - Testa beräkningar av kompletthet
   - Testa procentberäkningar
   - Testa aggregering

**Tidsuppskattning:** 4-6 timmar

#### Steg 2: Extrahera typer och interfaces
**Mål:** Separera typer från logik

**Ny fil:** `src/pages/E2eQualityValidationPage/types.ts`
- `ValidationIssue`
- `CompletenessMetrics`
- `MockQualityAnalysis`
- `BpmnServiceTask`
- `BpmnUserTask`
- `BpmnBusinessRuleTask`
- `BpmnValidationResult`
- `BackendStateField`
- `MockResponseAnalysis`
- Alla andra interfaces

**Validering:** Build fungerar, typer exporteras korrekt

**Tidsuppskattning:** 1-2 timmar

#### Steg 3: Extrahera valideringslogik
**Mål:** Separera valideringslogik från UI

**Ny fil:** `src/pages/E2eQualityValidationPage/utils/validationHelpers.ts`
- Funktioner för att validera BPMN-filer
- Funktioner för att identifiera saknade tasks
- Funktioner för att identifiera borttagna tasks
- Funktioner för att kategorisera issues

**Validering:** 
- Unit-tester fungerar
- Integration med UI fungerar

**Tidsuppskattning:** 3-4 timmar

#### Steg 4: Extrahera UI-komponenter
**Mål:** Dela upp UI i mindre komponenter

**Nya filer:**
1. `src/pages/E2eQualityValidationPage/components/ValidationIssueList.tsx`
   - Lista över valideringsproblem
   - Filtrering och sortering

2. `src/pages/E2eQualityValidationPage/components/CompletenessMetrics.tsx`
   - Kompletthetsmätningar
   - Procentvisningar

3. `src/pages/E2eQualityValidationPage/components/MockQualityAnalysis.tsx`
   - Mock-kvalitetsanalys
   - API-mock-validering

4. `src/pages/E2eQualityValidationPage/components/ValidationReport.tsx`
   - Huvudrapport-komponent
   - Sammanfattning

**Validering:**
- Playwright-test fungerar
- UI ser likadan ut

**Tidsuppskattning:** 4-6 timmar

#### Steg 5: Extrahera hooks
**Mål:** Separera state management och logik

**Nya filer:**
1. `src/pages/E2eQualityValidationPage/hooks/useValidationAnalysis.ts`
   - Valideringsanalys-logik
   - State management för validering

2. `src/pages/E2eQualityValidationPage/hooks/useCompletenessMetrics.ts`
   - Kompletthetsmätningar
   - Beräkningar

3. `src/pages/E2eQualityValidationPage/hooks/useMockQualityAnalysis.ts`
   - Mock-kvalitetsanalys
   - API-validering

**Validering:**
- Unit-tester fungerar
- Hook fungerar i komponenten

**Tidsuppskattning:** 3-4 timmar

#### Steg 6: Validera hela refaktoreringen
**Mål:** Säkerställa att allt fungerar

**Aktiviteter:**
1. Kör alla tester
2. Testa manuellt i UI
3. Verifiera att inga funktioner försvunnit
4. Kontrollera build och linting

**Tidsuppskattning:** 2-3 timmar

**Total tidsuppskattning:** 2-3 dagar

---

## 2. useFileGeneration.ts (1653 rader)

### Nuvarande Struktur
- En stor hook med många funktioner
- Genereringslogik, state management, progress tracking allt i samma fil

### Refaktoreringsplan

#### Steg 1: Skapa teststruktur (FÖRE refaktorering)
**Mål:** Säkerställa att vi kan validera refaktoreringen

**Filer att skapa:**
1. `tests/unit/useFileGeneration/generationLogic.test.ts`
   - Testa genereringslogik
   - Testa fil-validering
   - Testa graph-building

2. `tests/unit/useFileGeneration/progressTracking.test.ts`
   - Testa progress tracking
   - Testa phase-uppdateringar
   - Testa cancellation

3. `tests/integration/useFileGeneration/handleGenerateArtifacts.test.ts`
   - Testa hela flödet för `handleGenerateArtifacts`
   - Testa med mock-data
   - Testa error handling

**Tidsuppskattning:** 3-4 timmar

#### Steg 2: Extrahera genereringslogik
**Mål:** Separera genereringslogik från hook

**Ny fil:** `src/pages/BpmnFileManager/hooks/useFileGeneration/generationLogic.ts`
- Funktioner för att validera filer
- Funktioner för att bygga graph
- Funktioner för att bestämma scope
- Funktioner för att hantera versioning

**Validering:**
- Unit-tester fungerar
- Integration med hook fungerar

**Tidsuppskattning:** 2-3 timmar

#### Steg 3: Extrahera progress tracking
**Mål:** Separera progress tracking från hook

**Ny fil:** `src/pages/BpmnFileManager/hooks/useFileGeneration/progressTracking.ts`
- Funktioner för att uppdatera progress
- Funktioner för att hantera phases
- Funktioner för att beräkna totals

**Validering:**
- Unit-tester fungerar
- Progress visas korrekt i UI

**Tidsuppskattning:** 2-3 timmar

#### Steg 4: Extrahera upload-logik
**Mål:** Separera upload-logik från hook

**Ny fil:** `src/pages/BpmnFileManager/hooks/useFileGeneration/uploadLogic.ts`
- Funktioner för att uploada dokumentation
- Funktioner för att hantera storage paths
- Funktioner för att hantera versioning

**Validering:**
- Unit-tester fungerar
- Upload fungerar korrekt

**Tidsuppskattning:** 2-3 timmar

#### Steg 5: Dela upp huvudfunktioner
**Mål:** Separera stora funktioner i mindre moduler

**Nya filer:**
1. `src/pages/BpmnFileManager/hooks/useFileGeneration/handleGenerateArtifacts.ts`
   - `handleGenerateArtifacts` funktion
   - Relaterad logik

2. `src/pages/BpmnFileManager/hooks/useFileGeneration/handleGenerateAllArtifacts.ts`
   - `handleGenerateAllArtifacts` funktion
   - Relaterad logik

3. `src/pages/BpmnFileManager/hooks/useFileGeneration/handleGenerateSelectedFile.ts`
   - `handleGenerateSelectedFile` funktion
   - Relaterad logik

**Validering:**
- Integration-tester fungerar
- Alla funktioner fungerar som förväntat

**Tidsuppskattning:** 3-4 timmar

#### Steg 6: Validera hela refaktoreringen
**Mål:** Säkerställa att allt fungerar

**Aktiviteter:**
1. Kör alla tester
2. Testa manuellt i UI
3. Verifiera att generering fungerar
4. Kontrollera build och linting

**Tidsuppskattning:** 2-3 timmar

**Total tidsuppskattning:** 1-2 dagar

---

## 3. documentationTemplates.ts (2008 rader)

### Nuvarande Struktur
- Många template-funktioner för olika dokumentationstyper
- Schema-definitioner
- Rendering-logik

### Refaktoreringsplan

#### Steg 1: Skapa saknade tester (FÖRE refaktorering)
**Mål:** Säkerställa att vi kan validera refaktoreringen

**Filer att skapa:**
1. `tests/unit/documentationTemplates/featureGoalTemplate.test.ts`
   - Testa `renderFeatureGoalDoc`
   - Testa template-rendering
   - Testa med mock-data

2. `tests/unit/documentationTemplates/epicTemplate.test.ts`
   - Testa `renderEpicDoc`
   - Testa template-rendering
   - Testa med mock-data

3. `tests/unit/documentationTemplates/businessRuleTemplate.test.ts`
   - Testa `renderBusinessRuleDoc`
   - Testa template-rendering
   - Testa med mock-data

4. `tests/unit/documentationTemplates/renderingHelpers.test.ts`
   - Testa rendering-helpers
   - Testa HTML-generering
   - Testa link-generering

**Tidsuppskattning:** 3-4 timmar

#### Steg 2: Extrahera scheman
**Mål:** Separera scheman från rendering

**Ny fil:** `src/lib/documentationTemplates/schemas.ts`
- `FEATURE_GOAL_DOC_SCHEMA`
- `EPIC_DOC_SCHEMA`
- `BUSINESS_RULE_DOC_SCHEMA`
- `DocSectionId`
- `DocSectionConfig`
- `DocTemplateSchema`

**Validering:**
- Befintliga tester fungerar
- Scheman exporteras korrekt

**Tidsuppskattning:** 1 timme

#### Steg 3: Extrahera template-funktioner per typ
**Mål:** Separera template-funktioner per typ

**Nya filer:**
1. `src/lib/documentationTemplates/featureGoalTemplate.ts`
   - `renderFeatureGoalDoc`
   - `buildFeatureGoalDocModelFromContext`
   - Relaterad logik

2. `src/lib/documentationTemplates/epicTemplate.ts`
   - `renderEpicDoc`
   - Relaterad logik

3. `src/lib/documentationTemplates/businessRuleTemplate.ts`
   - `renderBusinessRuleDoc`
   - `renderBusinessRuleDocFromLlm`
   - Relaterad logik

**Validering:**
- Unit-tester fungerar
- Templates renderas korrekt

**Tidsuppskattning:** 3-4 timmar

#### Steg 4: Extrahera rendering-helpers
**Mål:** Separera rendering-helpers från templates

**Ny fil:** `src/lib/documentationTemplates/renderingHelpers.ts`
- `wrapDocument`
- `renderLlmHtml`
- HTML-rendering helpers
- Link-generering helpers

**Validering:**
- Unit-tester fungerar
- Rendering fungerar korrekt

**Tidsuppskattning:** 2-3 timmar

#### Steg 5: Extrahera link-generering
**Mål:** Separera link-generering från templates

**Ny fil:** `src/lib/documentationTemplates/linkHelpers.ts`
- Funktioner för att generera länkar
- `TemplateLinks` interface
- Link-building logik

**Validering:**
- Unit-tester fungerar
- Länkar genereras korrekt

**Tidsuppskattning:** 1-2 timmar

#### Steg 6: Validera hela refaktoreringen
**Mål:** Säkerställa att allt fungerar

**Aktiviteter:**
1. Kör alla tester
2. Testa att dokumentation genereras korrekt
3. Verifiera att länkar fungerar
4. Kontrollera build och linting

**Tidsuppskattning:** 2-3 timmar

**Total tidsuppskattning:** 1-2 dagar

---

## 4. TestCoverageTable.tsx (1467 rader)

### Nuvarande Struktur
- En stor React-komponent med många rendering-funktioner
- Tabell-logik, sortering, filtrering allt i samma fil

### Refaktoreringsplan

#### Steg 1: Skapa saknade tester (FÖRE refaktorering)
**Mål:** Säkerställa att vi kan validera refaktoreringen

**Filer att skapa:**
1. `tests/unit/TestCoverageTable/sorting.test.ts`
   - Testa sorteringslogik
   - Testa olika sorteringskolumner
   - Testa sorteringsriktning

2. `tests/unit/TestCoverageTable/filtering.test.ts`
   - Testa filtreringslogik
   - Testa search query
   - Testa view mode

3. `tests/unit/TestCoverageTable/calculations.test.ts`
   - Testa beräkningar
   - Testa depth-beräkningar
   - Testa aggregeringar

4. `tests/unit/TestCoverageTable/renderHelpers.test.ts`
   - Testa rendering-helpers
   - Testa cell-rendering
   - Testa format-funktioner

**Tidsuppskattning:** 3-4 timmar

#### Steg 2: Extrahera typer
**Mål:** Separera typer från komponent

**Ny fil:** `src/components/TestCoverageTable/types.ts`
- `TestCoverageTableProps`
- Alla andra interfaces och typer

**Validering:**
- Build fungerar
- Typer exporteras korrekt

**Tidsuppskattning:** 1 timme

#### Steg 3: Extrahera rendering-helpers
**Mål:** Separera rendering-funktioner från komponent

**Nya filer:**
1. `src/components/TestCoverageTable/renderHelpers.ts`
   - `renderBulletList`
   - `isCustomerUserTask`
   - Andra rendering-helpers

2. `src/components/TestCoverageTable/cellRenderers.ts`
   - Cell-rendering funktioner
   - Format-funktioner

**Validering:**
- Unit-tester fungerar
- Rendering ser likadan ut

**Tidsuppskattning:** 2-3 timmar

#### Steg 4: Extrahera sub-komponenter
**Mål:** Dela upp komponenten i mindre delar

**Nya filer:**
1. `src/components/TestCoverageTable/TableHeader.tsx`
   - Tabell-header
   - Sorterings-knappar

2. `src/components/TestCoverageTable/TableRow.tsx`
   - Tabell-rad
   - Cell-rendering

3. `src/components/TestCoverageTable/TableCell.tsx`
   - Tabell-cell
   - Cell-format

**Validering:**
- Playwright-test fungerar
- UI ser likadan ut

**Tidsuppskattning:** 3-4 timmar

#### Steg 5: Extrahera logik
**Mål:** Separera logik från rendering

**Nya filer:**
1. `src/components/TestCoverageTable/sorting.ts`
   - Sorteringslogik
   - Sorterings-funktioner

2. `src/components/TestCoverageTable/filtering.ts`
   - Filtreringslogik
   - Search-funktioner

3. `src/components/TestCoverageTable/calculations.ts`
   - Beräkningslogik
   - Depth-beräkningar
   - Aggregeringar

**Validering:**
- Unit-tester fungerar
- Logik fungerar korrekt

**Tidsuppskattning:** 2-3 timmar

#### Steg 6: Validera hela refaktoreringen
**Mål:** Säkerställa att allt fungerar

**Aktiviteter:**
1. Kör alla tester
2. Testa manuellt i UI
3. Verifiera att tabellen fungerar
4. Kontrollera build och linting

**Tidsuppskattning:** 1-2 timmar

**Total tidsuppskattning:** 1 dag

---

## Teststrategi - Allmänna Riktlinjer

### För varje refaktorering:

1. **Skapa tester FÖRE refaktorering**
   - Säkerställ att vi har tester som validerar funktionalitet
   - Om tester saknas, skapa dem först
   - Kör befintliga tester för att säkerställa baseline

2. **Refaktorera stegvis**
   - En modul i taget
   - Validera efter varje steg
   - Kör tester efter varje ändring

3. **Validera kontinuerligt**
   - Build fungerar
   - Linting fungerar
   - Tester fungerar
   - UI fungerar (manuell testning)

4. **Dokumentera ändringar**
   - Uppdatera imports
   - Uppdatera dokumentation
   - Uppdatera test-index

### Testtyper per fil:

**E2eQualityValidationPage:**
- ✅ Playwright E2E-test för UI
- ✅ Unit-tester för valideringslogik
- ✅ Unit-tester för beräkningar

**useFileGeneration:**
- ✅ Integration-tester för genereringsflöden
- ✅ Unit-tester för logik-funktioner
- ✅ Mock-tester för progress tracking

**documentationTemplates:**
- ✅ Unit-tester för varje template-typ
- ✅ Unit-tester för rendering-helpers
- ✅ Snapshot-tester för HTML-output

**TestCoverageTable:**
- ✅ Playwright E2E-test (redan finns)
- ✅ Unit-tester för sortering/filtrering
- ✅ Unit-tester för beräkningar
- ✅ Snapshot-tester för rendering

---

## Sammanfattning

| Fil | Storlek | Prioritet | Testtäckning | Tidsuppskattning | Status |
|-----|--------|-----------|--------------|------------------|--------|
| `bpmnGenerators.ts` | 3200 | ✅ Klar | ✅ Bra | - | ✅ Klar |
| `E2eQualityValidationPage.tsx` | 2469 | 🔴 HÖG | ❌ Saknas | 2-3 dagar | ⏳ Planerad |
| `testMapping.ts` | 2332 | ⚪ LÅG | - | - | ⏸️ Pausad |
| `documentationTemplates.ts` | 2008 | 🟡 MEDEL | ⚠️ Delvis | 1-2 dagar | ⏳ Planerad |
| `useFileGeneration.ts` | 1653 | 🔴 HÖG | ⚠️ Delvis | 1-2 dagar | ⏳ Planerad |
| `TestCoverageTable.tsx` | 1467 | 🟡 MEDEL | ⚠️ Delvis | 1 dag | ⏳ Planerad |

**Totalt:** 4 filer behöver refaktorering, ~5-8 dagars arbete

---

## Nästa Steg

1. **Börja med E2eQualityValidationPage** (högsta prioritet)
   - Skapa teststruktur först
   - Refaktorera stegvis
   - Validera kontinuerligt

2. **Fortsätt med useFileGeneration** (kritisk funktionalitet)
   - Skapa teststruktur först
   - Refaktorera stegvis
   - Validera kontinuerligt

3. **Fortsätt med documentationTemplates** (stor fil)
   - Skapa saknade tester först
   - Refaktorera stegvis
   - Validera kontinuerligt

4. **Avsluta med TestCoverageTable** (UI-komponent)
   - Skapa saknade tester först
   - Refaktorera stegvis
   - Validera kontinuerligt

