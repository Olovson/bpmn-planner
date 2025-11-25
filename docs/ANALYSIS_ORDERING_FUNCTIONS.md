# Analys: Var sorteringsordningen etableras

## Översikt

Sorteringsordningen baserat på när saker händer i BPMN-processen etableras på **två nivåer**:

1. **Tilldelning av metadata** (`orderIndex`, `visualOrderIndex`) - sker under ProcessGraph-byggandet
2. **Sortering av noder** - sker när noder ska visas i UI

## 1. Tilldelning av orderIndex (från sequence flows)

### Huvudfunktion: `assignLocalOrderForFile()`

**Fil:** `src/lib/bpmn/processGraphBuilder.ts` (rad 401-493)

**Vad den gör:**
- Identifierar "sequence-relevanta" noder (noder som förekommer i sequence flows)
- Bygger en adjacency-graf från sequence flows
- Kör DFS (Depth-First Search) från start-noder (inga inkommande kanter)
- Tilldelar `orderIndex`, `branchId`, och `scenarioPath` till sequence-relevanta noder
- Använder global räknare för `orderIndex`

**Anropas från:**
- `buildProcessGraph()` (rad 583) - för varje BPMN-fil

**Detta är den GEMENSAMMA funktionen som används i appen.**

### Alternativa implementationer (DUPLICERAD KOD)

⚠️ **Problem:** Det finns flera parallella implementationer av samma logik:

1. **`assignExecutionOrder()`** i `src/lib/bpmnProcessGraph.ts` (rad 266-405)
   - Liknande logik men används i äldre pipeline
   - Tilldelar `orderIndex` och `visualOrderIndex`

2. **`assignExecutionOrderFromSequenceFlows()`** i `src/lib/bpmn/buildProcessModel.ts` (rad 417-569)
   - Liknande logik men använder `primaryPathIndex` istället för `orderIndex`
   - Används i ProcessModel-pipeline

3. **`calculateOrderIndex()`** i `supabase/functions/build-process-tree/index.ts` (rad 434-521)
   - Server-side implementation
   - Liknande DFS-logik

## 2. Tilldelning av visualOrderIndex (från DI-koordinater)

### Huvudfunktion: I `buildProcessGraph()`

**Fil:** `src/lib/bpmn/processGraphBuilder.ts` (rad 596-632)

**Vad den gör:**
- Filtrerar noder utan `orderIndex` men med DI-koordinater (x, y)
- Sorterar dessa noder på x (ascending), sedan y (ascending)
- Tilldelar `visualOrderIndex` (0, 1, 2, ...) baserat på visuell position

**Anropas från:**
- `buildProcessGraph()` - efter `assignLocalOrderForFile()` för varje fil

**Detta är den GEMENSAMMA funktionen som används i appen.**

### Alternativa implementationer (DUPLICERAD KOD)

⚠️ **Problem:** Samma logik finns på flera ställen:

1. I `assignExecutionOrder()` i `src/lib/bpmnProcessGraph.ts` (rad 276-306)
2. I `assignExecutionOrderFromSequenceFlows()` i `src/lib/bpmn/buildProcessModel.ts` (rad 436-468)

## 3. Sortering av noder för visning

### Gemensam funktion: `sortCallActivities()`

**Fil:** `src/lib/ganttDataConverter.ts` (rad 62-98)

**Vad den gör:**
- Sorterar `ProcessTreeNode[]` baserat på:
  1. `visualOrderIndex` (först)
  2. `orderIndex` (sedan)
  3. `branchId` (sedan, endast i 'root' mode)
  4. `label` (slutligen, alfabetiskt)

**Används i:**
- ✅ `TimelinePage` (via `buildGanttTasksFromProcessTree()`)
- ✅ `ProcessExplorer` (via `ProcessTreeD3.tsx`)
- ✅ `mortgage.tree-hierarchy.test.ts`
- ✅ `mortgage.order-validation.test.ts`
- ✅ `mortgage-order-debug.ts` script

**Detta är den ENDA gemensamma sorteringsfunktionen.**

### Alternativ sortering (DUPLICERAD KOD)

⚠️ **Problem:** Det finns en alternativ sorteringsfunktion:

1. **`sortByOrderIndex()`** i `src/lib/bpmn/processTreeBuilder.ts` (rad 102-120)
   - Sorterar endast på `orderIndex`
   - Används internt i `processTreeBuilder.ts` för att sortera children
   - **Används INTE i UI-komponenter**

## Sammanfattning

### Gemensamma funktioner (används i appen):

1. **`assignLocalOrderForFile()`** - Tilldelar `orderIndex` från sequence flows
2. **`buildProcessGraph()`** (rad 596-632) - Tilldelar `visualOrderIndex` från DI-koordinater
3. **`sortCallActivities()`** - Sorterar noder för visning i UI

### Duplicerad kod (bör konsolideras):

1. `assignExecutionOrder()` i `bpmnProcessGraph.ts`
2. `assignExecutionOrderFromSequenceFlows()` i `buildProcessModel.ts`
3. `calculateOrderIndex()` i `supabase/functions/build-process-tree/index.ts`
4. `sortByOrderIndex()` i `processTreeBuilder.ts` (används bara internt)

## Rekommendation

**För tilldelning av metadata:**
- Använd endast `assignLocalOrderForFile()` och logiken i `buildProcessGraph()`
- Överväg att deprecate eller ta bort de alternativa implementationerna

**För sortering:**
- Använd endast `sortCallActivities()` för alla UI-sorteringar
- `sortByOrderIndex()` kan behållas för intern användning i `processTreeBuilder.ts` om den behövs

