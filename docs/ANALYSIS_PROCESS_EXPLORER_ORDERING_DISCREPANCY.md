# Analys: Skillnad mellan test och ProcessExplorer-ordning

## Problem
Testet `mortgage.tree-hierarchy.test.ts` visar en ordning, men ProcessExplorer (`http://localhost:8080/#/process-explorer`) visar en annan ordning, trots att båda ska använda samma sorteringsfunktion (`sortCallActivities()`).

## Analys av kedjan

### 1. Testet (`mortgage.tree-hierarchy.test.ts`)

**BPMN-filkällor:**
- Laddar från `tests/fixtures/bpmn/analytics/` med `readFileSync`
- Skapar data URLs från XML: `data:application/xml;base64,...`
- Använder `parseBpmnFile(dataUrl)`

**ProcessGraph building:**
```typescript
const graph = buildProcessGraph(parseResults, {
  bpmnMap: bpmnMapData,
  preferredRootProcessId: 'mortgage',  // ← Hårdkodat 'mortgage'
});
```

**ProcessTree building:**
```typescript
const tree = buildProcessTreeFromGraph(graph, {
  rootProcessId: 'mortgage',           // ← Hårdkodat 'mortgage'
  preferredRootFile: 'mortgage.bpmn',  // ← Hårdkodat 'mortgage.bpmn'
  artifactBuilder: () => [],            // ← Tom artifact builder
});
```

**Sortering:**
- Använder `NewProcessTreeNode` direkt (har `visualOrderIndex`)
- Sorterar med `sortCallActivities(nodes, 'root')` direkt på ProcessTreeNode

### 2. Appen (`useProcessTree` hook)

**BPMN-filkällor:**
- Laddar från Supabase Storage via `parseBpmnFile(fileName)`
- `parseBpmnFile` försöker först ladda från Supabase Storage, sedan fallback till `/bpmn/` path
- Filerna hämtas från `bpmn_files` tabellen i Supabase

**ProcessGraph building:**
```typescript
const graph = buildProcessGraph(parseResults, {
  bpmnMap,
  preferredRootProcessId: effectiveRootFile.replace('.bpmn', ''),  // ← Dynamiskt från databas
});
```

**ProcessTree building:**
```typescript
const newTree = buildProcessTreeFromGraph(graph, {
  rootProcessId: effectiveRootFile.replace('.bpmn', ''),  // ← Dynamiskt
  preferredRootFile: effectiveRootFile,                    // ← Dynamiskt
  artifactBuilder: buildArtifacts,                        // ← Bygger artifacts
});
```

**Konvertering:**
```typescript
// ⚠️ PROBLEM: visualOrderIndex kopieras INTE!
const tree = convertProcessTreeNode(newTree);
```

**Sortering:**
- ProcessTreeD3 får `LegacyProcessTreeNode` (saknar `visualOrderIndex`)
- Sorterar med `sortCallActivities(filteredChildren, mode)` i `filterCollapsed`

## Kritiskt problem: `convertProcessTreeNode` saknar `visualOrderIndex`

### Fil: `src/hooks/useProcessTree.ts` (rad 31-53)

```typescript
function convertProcessTreeNode(node: NewProcessTreeNode): LegacyProcessTreeNode {
  return {
    id: node.id,
    label: node.label,
    type: node.type as LegacyProcessTreeNode['type'],
    bpmnFile: node.bpmnFile,
    bpmnElementId: node.bpmnElementId,
    processId: node.processId,
    orderIndex: node.orderIndex,        // ✓ Kopieras
    branchId: node.branchId,            // ✓ Kopieras
    scenarioPath: node.scenarioPath,    // ✓ Kopieras
    // ⚠️ visualOrderIndex saknas här!
    subprocessFile: node.subprocessFile,
    subprocessLink: node.subprocessLink,
    children: node.children.map(convertProcessTreeNode),
    artifacts: node.artifacts?.map(...),
    diagnostics: node.diagnostics,
  };
}
```

### Konsekvens

1. **NewProcessTreeNode** (från `buildProcessTreeFromGraph`) har `visualOrderIndex` ✓
2. **LegacyProcessTreeNode** (efter konvertering) saknar `visualOrderIndex` ✗
3. **sortCallActivities()** i ProcessTreeD3 kan inte använda `visualOrderIndex` för sortering
4. **Resultat:** ProcessExplorer sorterar endast på `orderIndex → branchId → label` (saknar `visualOrderIndex` prioritet)

### Verifiering

**LegacyProcessTreeNode** (`src/lib/processTree.ts` rad 31):
```typescript
export interface ProcessTreeNode {
  // ...
  orderIndex?: number;
  visualOrderIndex?: number;  // ✓ Definierat i typen
  // ...
}
```

**NewProcessTreeNode** (`src/lib/bpmn/processTreeTypes.ts` rad 43):
```typescript
export interface ProcessTreeNode {
  // ...
  orderIndex?: number;
  visualOrderIndex?: number;  // ✓ Definierat i typen
  // ...
}
```

**convertProcessTreeNode** (`src/hooks/useProcessTree.ts`):
- Kopierar INTE `visualOrderIndex` ✗

## Andra potentiella skillnader

### 1. BPMN-filkällor
- **Testet:** Laddar från lokala fixtures (kända filer)
- **Appen:** Laddar från Supabase Storage (kan vara olika versioner eller saknade filer)

### 2. Root process ID
- **Testet:** Hårdkodat `'mortgage'`
- **Appen:** Dynamiskt från `effectiveRootFile.replace('.bpmn', '')`
- Om filnamnet i databasen är `Mortgage.bpmn` (stor bokstav) blir det `'Mortgage'` istället för `'mortgage'`

### 3. Artifact builder
- **Testet:** `artifactBuilder: () => []` (tom)
- **Appen:** `artifactBuilder: buildArtifacts` (byggs artifacts)
- Påverkar inte sortering, men kan påverka vilka noder som visas

### 4. React Query cache
- **Appen:** Använder React Query med `staleTime: 1000 * 60 * 5` (5 minuter)
- Om ProcessTree cachas kan gamla versioner visas

## Sammanfattning

**Huvudproblem:** `convertProcessTreeNode()` kopierar inte `visualOrderIndex` från `NewProcessTreeNode` till `LegacyProcessTreeNode`, vilket gör att ProcessExplorer inte kan använda visuell ordning för sortering.

**Sekundära skillnader:**
1. Olika BPMN-filkällor (fixtures vs Supabase Storage)
2. Olika root process ID (hårdkodat vs dynamiskt)
3. React Query cache kan visa gamla versioner

**Lösning:**
Lägg till `visualOrderIndex: node.visualOrderIndex,` i `convertProcessTreeNode()` funktionen.

