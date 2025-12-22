# Analys: Diff-funktionalitet för selektiv regenerering

**Datum:** 2025-12-22  
**Status:** Delvis implementerad - behöver förbättringar

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

## Vad som saknas eller behöver förbättras ⚠️

### 1. Process nodes inkluderas inte i diff-beräkning

**Problem:**
- `extractNodeSnapshots()` i `bpmnDiff.ts` inkluderar bara:
  - `callActivity`
  - `userTask`
  - `serviceTask`
  - `businessRuleTask`
- **Saknas:** `process` nodes (subprocess Feature Goals)

**Påverkan:**
- När en subprocess-fil ändras (t.ex. process-nodens namn), detekteras inte ändringen
- Process nodes genereras inte selektivt baserat på diff

**Lösning:**
- Lägg till process nodes i `extractNodeSnapshots()`
- Identifiera process nodes från `parseResult` (process definitions)

### 2. Hierarchical dependencies hanteras inte

**Problem:**
- Om en parent nod (callActivity) ändras, behöver child nodes (tasks i subprocess) också potentiellt regenereras
- Om en subprocess-fil ändras, behöver alla call activities som anropar den också regenereras

**Påverkan:**
- Ändringar i parent kan påverka child-dokumentation (aggregated content)
- Ändringar i subprocess kan påverka call activity Feature Goals

**Lösning:**
- Implementera cascade-diff-detection:
  - Om subprocess-fil ändras → markera alla call activities som anropar den som `modified`
  - Om callActivity ändras → markera subprocess Feature Goal som `modified`
  - Om parent nod ändras → markera child nodes som behöver regenereras

### 3. Removed nodes hanteras inte korrekt

**Problem:**
- När en nod tas bort (`removed`), genereras ingen dokumentation (korrekt)
- Men befintlig dokumentation i Storage tas inte bort
- `autoRegenerateRemoved` är `false` som standard (korrekt)

**Påverkan:**
- Döda länkar i dokumentation
- Förvirring om vilka noder som faktiskt finns

**Lösning:**
- Implementera cleanup av dokumentation för removed nodes
- Alternativ: Markera dokumentation som "deprecated" istället för att ta bort

### 4. Diff-filtret används inte som standard

**Problem:**
- Diff-filtret används bara om `unresolvedDiffs.size > 0`
- Om ingen diff-data finns, regenereras allt (fallback)
- Detta är korrekt beteende, men kan förbättras

**Påverkan:**
- Första gången efter uppladdning: alla noder regenereras (korrekt)
- Efter uppdatering: bara ändrade noder regenereras (korrekt)
- Men om diff-beräkning misslyckas, regenereras allt (konservativt, men kan vara onödigt)

**Lösning:**
- Förbättra felhantering i diff-beräkning
- Lägg till validering att diff-data är korrekt

### 5. Process nodes räknas inte i progress

**Problem:**
- Process nodes genereras men räknas inte i `nodesToGenerate.length`
- Detta är relaterat till TODO #1 (progress-räkning)

**Påverkan:**
- Progress-visningen är felaktig
- Men genereringen fungerar korrekt

### 6. Validering av diff-data

**Problem:**
- Ingen validering att diff-data är korrekt
- Om diff-beräkning misslyckas, fallback till att regenerera allt
- Ingen feedback till användaren om diff-problem

**Lösning:**
- Lägg till validering av diff-data
- Visa varningar om diff-beräkning misslyckas
- Ge användaren möjlighet att välja: "regenerera allt" eller "försök igen med diff"

## Rekommenderade förbättringar

### Prioritet 1: Process nodes i diff-beräkning
- Lägg till process nodes i `extractNodeSnapshots()`
- Säkerställ att process nodes kan detekteras som `added`, `removed`, `modified`

### Prioritet 2: Cascade-diff-detection
- Implementera logik för att detektera cascade-effekter:
  - Subprocess-fil ändras → markera call activities som `modified`
  - Parent nod ändras → markera child nodes som behöver regenereras

### Prioritet 3: Cleanup av removed nodes
- Implementera cleanup av dokumentation för removed nodes
- Alternativ: Markera som "deprecated" istället för att ta bort

### Prioritet 4: Förbättrad felhantering
- Förbättra felhantering i diff-beräkning
- Lägg till validering och feedback till användaren

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
