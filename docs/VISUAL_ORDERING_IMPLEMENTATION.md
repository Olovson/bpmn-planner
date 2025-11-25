# Visuell ordning (Visual Ordering) - Implementation

## Översikt

BPMN Planner använder nu visuell ordning (`visualOrderIndex`) som fallback när tidsordning (`orderIndex`) inte kan beräknas från sequence flows. Detta säkerställer att noder sorteras enligt deras visuella position i BPMN-diagrammet, även när sequence flows saknas.

## Problem

Tidigare sorterades noder endast baserat på `orderIndex`, som beräknas från BPMN sequence flows. När sequence flows saknas (t.ex. för root-level subprocesses i `mortgage.bpmn`) hamnade noderna i godtycklig eller alfabetisk ordning, vilket inte matchade den visuella ordningen i BPMN-editorn.

## Lösning

### 1. DI-koordinater extraheras från BPMN XML

**Fil:** `src/lib/bpmnParser.ts`

- Extraherar x, y koordinater från `element.di.bounds` eller `element.gfx.bounds`
- Sparar koordinater i `BpmnElement` interface (`x?: number, y?: number`)

```typescript
// Extract DI (Diagram Interchange) coordinates for visual ordering
let x: number | undefined;
let y: number | undefined;

if (element.di?.bounds) {
  x = element.di.bounds.x;
  y = element.di.bounds.y;
}
```

### 2. Endast sequence-relevanta noder får orderIndex (7.2-approachen)

- **Definition:** En nod är *sequence-relevant* om den förekommer som `from` eller `to` i minst en `sequence`-edge.
- `assignLocalOrderForFile()` i `src/lib/bpmn/processGraphBuilder.ts` bygger adjacency och kör DFS **endast** för dessa noder.
- Noder som aldrig förekommer i sequence edges lämnas utan `orderIndex`. De betraktas som *visualOnly* och sorteras senare med DI-fallbacken.

Detta gör att:
- Subprocess-filer med riktiga sekvenskedjor bibehåller deterministisk tidsordning.
- Root- eller top-level callActivities som saknar sequence edges sorteras i UI enligt deras visuella layout (vänster→höger).

### 3. visualOrderIndex beräknas per fil

**Filer:**
- `src/lib/bpmn/processGraphBuilder.ts`
- `src/lib/bpmn/buildProcessModel.ts`
- `src/lib/bpmnProcessGraph.ts`

För noder utan `orderIndex` men med DI-koordinater:
1. Samla noderna per fil.
2. Sortera efter x (stigande), sedan y (stigande).
3. Tilldela `visualOrderIndex` (0, 1, 2, ...).

```typescript
// Compute visualOrderIndex for nodes without orderIndex
const nodesWithoutOrder = nodesInFile.filter(n => {
  const orderIndex = n.metadata.orderIndex as number | undefined;
  const hasCoords = n.metadata.x !== undefined && n.metadata.y !== undefined;
  return orderIndex === undefined && hasCoords;
});

if (nodesWithoutOrder.length > 0) {
  const sorted = [...nodesWithoutOrder].sort((a, b) => {
    const ax = (a.metadata.x as number) ?? 0;
    const ay = (a.metadata.y as number) ?? 0;
    const bx = (b.metadata.x as number) ?? 0;
    const by = (b.metadata.y as number) ?? 0;
    
    if (ax !== bx) return ax - bx;
    return ay - by;
  });
  
  sorted.forEach((node, index) => {
    node.metadata.visualOrderIndex = index;
  });
}
```

### 3. Interfaces uppdaterade

**Filer:**
- `src/lib/processTree.ts` - `ProcessTreeNode`
- `src/lib/bpmn/processTreeTypes.ts` - `ProcessTreeNode`
- `src/lib/bpmnProcessGraph.ts` - `BpmnProcessNode`
- `src/hooks/useAllBpmnNodes.ts` - `BpmnNodeData`

Alla interfaces inkluderar nu:
```typescript
visualOrderIndex?: number; // Visuell ordning baserad på BPMN DI-koordinater
```

### 4. Sorteringslogik uppdaterad

**Filer:**
- `src/lib/ganttDataConverter.ts` - `sortCallActivities(nodes, mode)`
- `src/lib/bpmn/processTreeBuilder.ts` - `sortByOrderIndex()`

**Ny sorteringsprioritet:**
1. `orderIndex` (om det finns)
2. `visualOrderIndex` (endast när `orderIndex` saknas för båda noderna)
3. `branchId` (endast i `mode: 'root'`)
4. `label`

```typescript
type SortMode = 'root' | 'subprocess';

export function sortCallActivities(
  nodes: ProcessTreeNode[],
  mode: SortMode = 'root',
): ProcessTreeNode[] {
  return [...nodes].sort((a, b) => {
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    if (a.orderIndex === undefined && b.orderIndex === undefined) {
      const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
      const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
      if (aVisual !== bVisual) return aVisual - bVisual;
    }

    if (mode === 'root' && a.branchId !== b.branchId) {
      if (a.branchId === 'main') return -1;
      if (b.branchId === 'main') return 1;
      return (a.branchId || '').localeCompare(b.branchId || '');
    }

    return a.label.localeCompare(b.label);
  });
}
```

### 5. Propagering genom ProcessTree

`visualOrderIndex` kopieras automatiskt genom hela ProcessTree-konstruktionen:
- `baseTreeNodeFromGraphNode()` - kopierar från `ProcessGraphNode.metadata`
- `buildProcessTreeFromModel()` - kopierar från `ProcessNodeModel`
- `buildProcessTreeFromGraph()` - kopierar från `BpmnProcessNode`

## Resultat

### Före
- Root-level subprocesses i `mortgage.bpmn` sorterades godtyckligt/alfabetiskt
- Ordningen matchade inte BPMN-editorn

### Efter
- Root-level subprocesses sorteras enligt visuell ordning (vänster-till-höger)
- Ordningen matchar BPMN-editorn när sequence flows saknas
- Tasks med sequence flows behåller sin tidsordning via `orderIndex`

## Användning

### Timeline-sidan
Timeline-sidan (`/timeline`) använder automatiskt den nya sorteringslogiken via `buildGanttTasksFromProcessTree()`, som anropar `sortCallActivities()`.

### Node Matrix
Node Matrix kan sortera efter `orderIndex`, men visuell ordning används automatiskt som fallback när `orderIndex` saknas.

### Process Explorer
Process Explorer visar noder i hierarkisk ordning, med visuell ordning som fallback för noder utan sequence flows.

## Tekniska detaljer

### DI-koordinater
- Extraheras från `bpmndi:BPMNShape` → `dc:Bounds` i BPMN XML
- Lagras per element i `BpmnElement` interface
- Används endast för noder som konverteras till ProcessTree-noder (tasks, callActivities, etc.)

### Per-fil beräkning
- `visualOrderIndex` beräknas separat för varje BPMN-fil
- Varje fil har sin egen koordinatsystem
- Index börjar från 0 för varje fil

### Fallback-logik
- `visualOrderIndex` används **endast** när `orderIndex` saknas
- Om både `orderIndex` och `visualOrderIndex` saknas, fallback till `branchId` → `label`
- Om DI-koordinater saknas, hoppas `visualOrderIndex` över och fallback till `branchId` → `label`

## Framtida förbättringar

- [ ] Stöd för global visuell ordning över flera filer (om önskat)
- [ ] Konfigurerbar sorteringsprioritet (användare kan välja mellan tidsordning och visuell ordning)
- [ ] Visualisering av DI-koordinater i debug-vyer



