# Analys: Duplicerad Logik för Graf-byggning

## Problemidentifiering

Det finns **två separata implementationer** för att bygga BPMN-processgrafer:

### 1. Process Explorer Pipeline
**Används av:** `ProcessExplorer`, `useProcessTree`, `useProcessGraph`

**Implementation:**
- `buildProcessGraph()` från `src/lib/bpmn/processGraphBuilder.ts`
- Bygger `ProcessGraph` med `ProcessGraphNode`-typer
- Använder `buildNodes(parseResults)` som bygger noder direkt från `BpmnParseResult`
- Returnerar `ProcessGraph` med:
  - `nodes: Map<string, ProcessGraphNode>`
  - `edges: Map<string, ProcessGraphEdge>`
  - `roots: string[]`
  - `missingDependencies: MissingDependency[]`

**Nod-byggning:**
```typescript
// processGraphBuilder.ts:125
function buildNodes(parseResults: Map<string, BpmnParseResult>): Map<string, ProcessGraphNode> {
  // Bygger noder direkt från parseResults
  // Sätter bpmnFile från fileName i parseResults
  nodes.set(processNodeId, {
    bpmnFile: fileName,  // <-- Direkt från parseResults key
    ...
  });
}
```

### 2. Generering Pipeline
**Används av:** `generateAllFromBpmnWithGraph`, `buildBpmnProcessGraph`

**Implementation:**
- `buildBpmnProcessGraph()` från `src/lib/bpmnProcessGraph.ts`
- Bygger `BpmnProcessGraph` med `BpmnProcessNode`-typer
- Använder `buildProcessModelFromDefinitions()` → `convertProcessModelChildren()`
- Returnerar `BpmnProcessGraph` med:
  - `root: BpmnProcessNode`
  - `allNodes: Map<string, BpmnProcessNode>`
  - `fileNodes: Map<string, BpmnProcessNode[]>`
  - `missingDependencies: { parent: string; childProcess: string }[]`

**Nod-byggning:**
```typescript
// bpmnProcessGraph.ts:166
function convertProcessModelChildren(...) {
  // Bygger noder via ProcessModel (hierarkisk struktur)
  // Sätter bpmnFile från context.currentFile
  const graphNode: BpmnProcessNode = {
    bpmnFile: context.currentFile,  // <-- Från context, kan vara annorlunda!
    ...
  };
}
```

## Kritiska Skillnader

### 1. Olika Datastrukturer
- **ProcessGraph**: Flat struktur med `nodes` Map och `edges` Map
- **BpmnProcessGraph**: Hierarkisk struktur med `root` och `children`-rekursion

### 2. Olika Nod-typer
- **ProcessGraphNode**: Används av Process Explorer
- **BpmnProcessNode**: Används av generering

### 3. Olika `bpmnFile`-tilldelning
- **ProcessGraph**: `bpmnFile` sätts direkt från `parseResults` key (filnamn)
- **BpmnProcessGraph**: `bpmnFile` sätts från `context.currentFile`, som kan vara:
  - `rootFileName` (för root-process)
  - `subprocessFile` (för callActivity children)
  - `context.currentFile` (för tasks i subprocesser)

### 4. Olika Hierarki-hantering
- **ProcessGraph**: Bygger flat graf, hierarki hanteras via edges
- **BpmnProcessGraph**: Bygger hierarkisk struktur direkt via `convertProcessModelChildren`

## Potentiella Problem

### Problem 1: `bpmnFile`-matchning
När Household genereras isolerat:
- **Process Explorer** skulle se: `bpmnFile = "mortgage-se-household.bpmn"` (direkt från filnamn)
- **Generering** kan se: `bpmnFile = "mortgage-se-household.bpmn"` ELLER `context.currentFile` som kan vara annorlunda om noden är child till en process

### Problem 2: Noder saknas i grafen
- **Process Explorer**: Bygger graf från alla filer i `parseResults`
- **Generering**: Bygger graf från `graphFileScope` (kan vara begränsad till parent + subprocess)

### Problem 3: Olika root-process-val
- **Process Explorer**: Väljer root baserat på `preferredRootProcessId`
- **Generering**: Väljer root baserat på `preferredRootFile` och `model.hierarchyRoots.find((proc) => proc.bpmnFile === rootFile)`

## Specifikt Problem: Household-generering

När Household genereras:
1. `graphFileScope` inkluderar parent + subprocess (för kontext)
2. `buildBpmnProcessGraph` bygger graf med Household som root
3. `convertProcessModelChildren` sätter `context.currentFile = rootFileName` (Household)
4. Noder i Household borde få `bpmnFile = "mortgage-se-household.bpmn"`
5. Men om noden är child till en process-node, kan `context.currentFile` vara annorlunda

**Möjlig orsak:** När Household genereras isolerat, kanske noderna får `bpmnFile` från parent-process istället för Household-filen.

## Rekommendationer

### Kort sikt (för att fixa Household-problemet)
1. **Verifiera `bpmnFile`-värden**: Lägg till debug-logging för att se vilka `bpmnFile`-värden noderna faktiskt har
2. **Kontrollera `context.currentFile`**: Se till att `context.currentFile` är korrekt när Household genereras

### Lång sikt (för att undvika framtida problem)
1. **Unifiera graf-byggning**: Överväg att använda samma pipeline för både Process Explorer och generering
2. **Dokumentera skillnader**: Skapa tydlig dokumentation om när vilken pipeline ska användas
3. **Skapa gemensam abstraktion**: Skapa en wrapper som normaliserar `bpmnFile`-värden oavsett vilken pipeline som används

## Debugging-steg

För att identifiera exakt vad som händer med Household:

1. **Kontrollera `graphFileScope`**: Vilka filer inkluderas när Household genereras?
2. **Kontrollera `rootFileName`**: Vad är `rootFileName` när Household genereras?
3. **Kontrollera `context.currentFile`**: Vad är `context.currentFile` när Household-noder skapas?
4. **Kontrollera `node.bpmnFile`**: Vilka `bpmnFile`-värden har noderna i `testableNodes`?
5. **Jämför med Process Explorer**: Vad visar Process Explorer för Household-noder?

## Slutsats

Ja, det finns duplicerad logik. Process Explorer och generering använder olika pipelines för att bygga grafer, vilket kan leda till inkonsekventa `bpmnFile`-värden och att noder saknas eller filtreras bort felaktigt.
