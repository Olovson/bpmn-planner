# Analys: Påverkan av Coverage Fix på Genereringslogik

## Datum: 2025-12-26

### Sammanfattning

**✅ Genereringslogiken påverkas INTE av våra ändringar.**

### Vad vi ändrade

**`src/hooks/useFileArtifactCoverage.ts`:**
- Ändrade hur `total_nodes` räknas: från grafen → direkt från BPMN-filen
- Detta påverkar BARA coverage-display i UI, inte genereringsprocessen

### Vad genereringslogiken använder

**`src/lib/bpmnGenerators.ts` - `generateAllFromBpmnWithGraph()`:**
1. Bygger sin egen graf med `buildBpmnProcessGraph()` - oberoende av coverage
2. Räknar noder med `getTestableNodes(graph)` - från grafen, inte från coverage
3. Filtrerar noder med `nodeFilter` - baserat på grafen, inte coverage
4. Genererar dokumentation för `nodesToGenerate` - från grafen, inte coverage

**`src/pages/BpmnFileManager/hooks/useFileGeneration.ts`:**
- Använder `generateAllFromBpmnWithGraph()` direkt
- Använder INTE `useFileArtifactCoverage` eller `useAllFilesArtifactCoverage`
- Efter generering invalideras coverage-queries (rad 1363-1364) - detta är bara för att uppdatera UI, inte för genereringen

### Coverage används bara för UI

**Filer som använder coverage:**
- `src/pages/BpmnFileManager/components/FileTable.tsx` - visar coverage i tabellen
- `src/components/ArtifactStatusBadge.tsx` - visar coverage-badges
- `src/pages/TestReport.tsx` - visar coverage i test reports
- `src/pages/BpmnFileManager.tsx` - visar coverage i fil-listan

**Ingen av dessa används i genereringsprocessen.**

### Slutsats

✅ **Genereringslogiken är helt oberoende av coverage-räkningen**
✅ **Våra ändringar påverkar bara UI-display, inte generering**
✅ **Inga relaterade problem i genereringsprocessen**

## Uppdaterad Logik: Call Activities Räknas i Parent-Filen

**VIKTIGT:** Call activities räknas som Feature Goals för filen där de är **definierade** (parent-filen), INTE när subprocess-filen genereras.

**Räkningsregler:**
- **UserTask/ServiceTask/BusinessRuleTask** → Epic (räknas i filen)
- **CallActivity** → Feature Goal (räknas i parent-filen)

**Exempel för `mortgage-se-object.bpmn`:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity → 1 Feature Goal
- **Total: 4/4** (3 Epics + 1 Feature Goal)

Se `docs/analysis/DOCUMENTATION_COVERAGE_COUNTING_RULES.md` för fullständig dokumentation av räkningsreglerna.

### Verifiering

För att verifiera att allt fungerar:
1. Generera dokumentation för en fil - ska fungera som vanligt
2. Generera testinfo för en fil - ska fungera som vanligt
3. Coverage-siffror i UI - ska nu visa korrekt antal

