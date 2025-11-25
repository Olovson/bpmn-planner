# Konsolidering: Sorteringsordning - Alla funktioner använder nu samma logik

## Översikt

Alla duplicerade implementationer av sorteringsordning har konsoliderats till gemensamma helper-funktioner som används konsekvent i hela applikationen.

## Skapade gemensamma helpers

### `src/lib/bpmn/sequenceOrderHelpers.ts`

**Nya funktioner:**
1. **`calculateOrderFromSequenceFlows()`**
   - Beräknar `orderIndex`, `branchId`, och `scenarioPath` från sequence flows
   - Använder DFS (Depth-First Search) från start-noder
   - Returnerar `Map<string, OrderInfo>`

2. **`calculateVisualOrderFromCoordinates()`**
   - Beräknar `visualOrderIndex` från DI-koordinater (x, y)
   - Sorterar på x (ascending), sedan y (ascending)
   - Returnerar `Map<string, number>`

## Refaktorerade funktioner

### 1. `assignLocalOrderForFile()` i `processGraphBuilder.ts`
- **Före:** ~90 rader duplicerad DFS-logik
- **Efter:** Använder `calculateOrderFromSequenceFlows()` och `calculateVisualOrderFromCoordinates()`
- **Används av:** `buildProcessGraph()` (används av appen och testerna)

### 2. `assignExecutionOrder()` i `bpmnProcessGraph.ts`
- **Före:** ~140 rader duplicerad stack-baserad logik
- **Efter:** Använder `calculateOrderFromSequenceFlows()` och `calculateVisualOrderFromCoordinates()`
- **Används av:** `buildBpmnProcessGraph()` (används av `bpmnGenerators.ts`)

### 3. `assignExecutionOrderFromSequenceFlows()` i `buildProcessModel.ts`
- **Före:** ~155 rader duplicerad stack-baserad logik
- **Efter:** Använder `calculateOrderFromSequenceFlows()` och `calculateVisualOrderFromCoordinates()`
- **Används av:** `buildProcessModelFromDefinitions()` (används av `buildBpmnProcessGraph()`)

### 4. `sortByOrderIndex()` i `processTreeBuilder.ts`
- **Före:** Använde `Number.POSITIVE_INFINITY` (inkonsistent med `sortCallActivities`)
- **Efter:** Använder `Number.MAX_SAFE_INTEGER` och samma prioritet som `sortCallActivities`
- **Används av:** Internt i `processTreeBuilder.ts` för att sortera innan konvertering till `ProcessTreeNode`

## Resultat

### Före konsolidering:
- 4 separata implementationer av samma logik
- ~400+ rader duplicerad kod
- Inkonsistenta fallback-värden (`POSITIVE_INFINITY` vs `MAX_SAFE_INTEGER`)
- Risk för att ändringar i en implementation inte sprids till andra

### Efter konsolidering:
- 2 gemensamma helper-funktioner (~150 rader)
- Alla implementationer använder samma logik
- Konsistenta fallback-värden
- En ändring påverkar alla pipelines

## Verifiering

Alla relevanta tester passerar:
- ✅ `mortgage.order-validation.test.ts`
- ✅ `mortgage.tree-hierarchy.test.ts`
- ✅ `mortgage.order-debug.test.ts`

## Kvarvarande duplicering

**`calculateOrderIndex()` i `supabase/functions/build-process-tree/index.ts`**
- Server-side implementation i Deno
- Kan refaktoreras i framtiden om behövs
- Används inte av appen eller testerna

## Sorteringsfunktioner

**Gemensam sortering:**
- ✅ `sortCallActivities()` i `ganttDataConverter.ts` - används av Timeline, ProcessExplorer, och alla tester

**Intern sortering:**
- ✅ `sortByOrderIndex()` i `processTreeBuilder.ts` - använder nu samma logik som `sortCallActivities`

