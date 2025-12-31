# File-Level Dokumentation - Implementation

**Datum:** 2025-01-XX  
**Status:** ✅ Implementerad

## Översikt

File-level dokumentation genereras för alla BPMN-filer som har noder (både root-processer och subprocesser). Den innehåller JSON-data för E2E-scenariogenerering.

**VIKTIGT:** För subprocess-filer:
- Process Feature Goals är primär dokumentation (visas för användaren i doc-viewer)
- File-level docs är sekundär (bara JSON-data för E2E-scenarier, visas INTE för användaren)

För root-filer:
- File-level docs visas i doc-viewer

## Implementation

### Kod-location

**Huvudfunktion:** `src/lib/bpmnGenerators.ts` (rad ~1713-1800)

### Genereringsprocess

1. **Samling av noders dokumentation**
   - Använder redan genererad dokumentation från `generatedChildDocs` (ingen duplicering)
   - Samlar `summary`, `flowSteps`, `inputs`, `outputs` från alla noder i filen
   - Sorterar noder baserat på processens struktur (`orderIndex`)

2. **Processens struktur**
   - Bygger flow graph för filen (endast när det behövs)
   - Hittar paths genom processen
   - Använder strukturen för att förstå flödet

3. **Intelligent sammanfattning**
   - **Summary:** Kombinerar alla noders summaries (max 500 tecken)
   - **FlowSteps:** Sorteras baserat på processens struktur (`orderIndex`) och dedupliceras
   - **Dependencies:** Samlas från alla noder med kontext (Input/Output)
   - **UserStories:** Initieras men fylls inte automatiskt (finns i Epic-dokumentation)

4. **JSON-data för E2E-scenarier**
   - Embeddas i HTML via `<script type="application/json">` tag
   - Används av `loadFileLevelDocFromStorage` i E2E-scenariogenerering
   - Struktur:
     ```typescript
     {
       summary: string;
       flowSteps: string[];
       userStories?: Array<{...}>;
       dependencies?: string[];
     }
     ```

### Förbättringar (2025-01-XX)

**Tidigare (Quick Fix):**
- Tog bara första nodens summary (500 tecken)
- Samlade alla flowSteps utan sortering
- UserStories initierades men fylldes aldrig
- Dependencies samlades som inputs/outputs utan kontext

**Nuvarande (Riktig Implementation):**
- ✅ Kombinerar alla noders summaries för process-sammanfattning
- ✅ Sorterar flowSteps baserat på processens struktur (`orderIndex`)
- ✅ Använder processens flöde (flow graph, paths) för att förstå ordningen
- ✅ Samlar dependencies med kontext (Input/Output)
- ✅ Använder redan genererad dokumentation (ingen duplicering)

## Användning

### För E2E-scenariogenerering

File-level dokumentation används för:
- **E2E-scenariogenerering:** JSON-data embeddas i HTML och används av `loadFileLevelDocFromStorage`
- **För subprocess-filer:** Visas INTE för användaren (Process Feature Goal visas istället)
- **För root-filer:** Visas i doc-viewer

**Exempel:** `mortgage-se-internal-data-gathering.bpmn`
- Har inga callActivities
- Process Feature Goal genereras: `feature-goals/mortgage-se-internal-data-gathering.html` (visas för användaren)
- File-level dokumentation genereras: `mortgage-se-internal-data-gathering.html` (JSON-data för E2E-scenarier, visas INTE för användaren)
- Används av `loadFileLevelDocFromStorage` i E2E-scenariogenerering

### Storage Path

**Format:** `docs/claude/{bpmnFileName}/{versionHash}/{fileBaseName}.html`

**Exempel:**
- `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/mortgage-se-internal-data-gathering.html`

## Relaterad Dokumentation

- **Feature Goal Types:** [`EXACT_FEATURE_GOAL_TYPES_PURPOSE.md`](./EXACT_FEATURE_GOAL_TYPES_PURPOSE.md)
- **E2E Scenario Generation:** [`TESTINFO_GENERATION_COMPLETE_ANALYSIS.md`](./TESTINFO_GENERATION_COMPLETE_ANALYSIS.md)
- **Documentation Counting:** [`DOCUMENTATION_COVERAGE_COUNTING_RULES.md`](./DOCUMENTATION_COVERAGE_COUNTING_RULES.md)



