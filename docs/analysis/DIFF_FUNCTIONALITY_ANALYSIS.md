# Analys: Diff-funktionalitet för selektiv regenerering

**Datum:** 2025-12-22  
**Uppdaterad:** 2025-12-22  
**Status:** ✅ Implementerad - alla kritiska funktioner är på plats

## Sammanfattning

Systemet har redan en grundläggande diff-funktionalitet, men den behöver förbättras för att fungera optimalt med selektiv regenerering när BPMN-filer uppdateras.

## Vad som redan finns ✅

### 1. Databasstruktur
- ✅ `bpmn_file_diffs` tabell med alla nödvändiga fält
- ✅ Versioning-system med `bpmn_file_versions`
- ✅ Support för `added`, `removed`, `modified`, `unchanged` diff-typer
- ✅ Tracking av `resolved_at` och `resolved_by`

### 2. Diff-beräkning
- ✅ `calculateAndSaveDiff()` - beräknar diff vid uppladdning
- ✅ `calculateBpmnDiff()` - jämför två parse results
- ✅ `extractNodeSnapshots()` - extraherar nod-snapshots för jämförelse
- ✅ `compareNodes()` - jämför individuella noder
- ✅ Anropas automatiskt vid uppladdning (`useBpmnFiles.ts`)

### 3. Diff-baserad filtrering
- ✅ `createDiffBasedNodeFilter()` - skapar filter baserat på unresolved diffs
- ✅ Används i `BpmnFileManager.tsx` (rad 1627-1637)
- ✅ Konfigurerbar via `DiffRegenerationConfig`

### 4. Markera diffs som resolved
- ✅ `markDiffsAsResolved()` - markerar diffs som lösta efter generering
- ✅ Anropas efter lyckad generering (`BpmnFileManager.tsx` rad 2289-2303)

### 5. UI för diff-visning
- ✅ `BpmnDiffOverviewPage.tsx` - visar alla diffs och möjliggör selektiv regenerering
- ✅ Visar added/removed/modified/unchanged
- ✅ Filtrering och sortering

## ✅ Implementerade förbättringar

### 1. ✅ Process nodes inkluderas nu i diff-beräkning

**Implementerat:**
- `extractNodeSnapshots()` i `bpmnDiff.ts` inkluderar nu `process` nodes
- Process nodes extraheras från `parseResult.meta.processes`
- Process nodes kan detekteras som `added`, `removed`, `modified`

**Plats:** `src/lib/bpmnDiff.ts` (rad 122-155)

### 2. ✅ Cascade-diff-detection implementerad

**Implementerat:**
- `detectCascadeDiffs()` funktion i `bpmnDiffRegeneration.ts`
- Om en subprocess-fil ändras → alla call activities som anropar den markeras som `modified`
- Anropas automatiskt efter diff-beräkning

**Plats:** `src/lib/bpmnDiffRegeneration.ts` (rad 487-664)

### 3. ✅ Cleanup av removed nodes implementerad

**Implementerat:**
- `cleanupRemovedNodes()` funktion i `bpmnDiffRegeneration.ts`
- Tar automatiskt bort dokumentation från Storage för removed nodes
- Anropas automatiskt när noder tas bort

**Plats:** `src/lib/bpmnDiffRegeneration.ts` (rad 666-770)

### 4. ✅ Lokal diff-analys (read-only preview)

**Implementerat:**
- `analyzeFolderDiff()` - Analysera lokala BPMN-filer rekursivt
- `calculateDiffForLocalFile()` - Beräkna diff för en lokal fil utan att spara
- `FolderDiffAnalysis` komponent - UI för lokal diff-analys
- **Read-only:** Inga filer laddas upp eller modifieras

**Plats:** 
- `src/lib/bpmnDiffRegeneration.ts` (rad 784-846, 881-977)
- `src/components/FolderDiffAnalysis.tsx`
- `src/pages/BpmnFolderDiffPage.tsx`

### 5. ✅ Förbättrad diff-visning

**Implementerat:**
- Detaljerad visning av vad som ändrats (gamla vs nya värden)
- Visuell markering av ändringar (grön/röd/gul)
- Särskild markering för nya filer
- Process-noder visas tydligt när hela filer är nya

**Plats:** `src/components/DiffResultView.tsx`

## Ytterligare förbättringar (valfria)

### Process nodes räknas i progress
- Process nodes genereras men räknas inte i `nodesToGenerate.length`
- Detta är relaterat till progress-räkning (TODO #1)

### Validering av diff-data
- Förbättra felhantering i diff-beräkning
- Lägg till validering och feedback till användaren om diff-problem

## Nuvarande flöde

1. **Vid uppladdning:**
   - `calculateAndSaveDiff()` anropas automatiskt
   - Diff beräknas mellan gamla och nya versionen
   - Sparas i `bpmn_file_diffs` tabell

2. **Vid generering:**
   - `getAllUnresolvedDiffs()` hämtar alla olösta diffs
   - `createDiffBasedNodeFilter()` skapar filter
   - Filter används i `generateAllFromBpmnWithGraph()`
   - Bara noder med `added` eller `modified` diff genereras

3. **Efter generering:**
   - `markDiffsAsResolved()` markerar genererade noder som lösta
   - Diffs uppdateras med `resolved_at` och `resolved_by`

## Test-scenarion att validera

1. **Ny fil uppladdas:**
   - Alla noder ska markeras som `added`
   - Alla noder ska genereras

2. **Befintlig fil uppdateras:**
   - Endast ändrade noder ska markeras som `modified`
   - Endast ändrade noder ska genereras

3. **Nod tas bort:**
   - Nod ska markeras som `removed`
   - Dokumentation ska tas bort eller markeras som deprecated

4. **Subprocess-fil ändras:**
   - Process node ska markeras som `modified`
   - Call activities som anropar den ska också markeras som `modified`

5. **Parent nod ändras:**
   - Child nodes ska också markeras som behöver regenereras (cascade)
