# Förklaring: Hur Genereringslogiken Fungerar

## Översikt

Genereringslogiken följer en **hierarkisk ordning** som prioriterar att child nodes genereras före parent nodes, men **bevarar också exekveringsordningen** från BPMN-filerna.

## Steg-för-steg Process

### Steg 1: Bygg Hierarki
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1387

```typescript
const graph = await buildBpmnProcessGraph(bpmnFileName, graphFileScope, versionHashes);
```

- Bygger en komplett graf av alla uppladdade BPMN-filer
- Identifierar hierarkiska relationer (call activities → subprocesser)
- Skapar noder för alla element (tasks, callActivities, process-noder)
- **Beräknar exekveringsordning** (`orderIndex`) från sequence flows i BPMN-filerna

### Steg 2: Beräkna Exekveringsordning (orderIndex)
**Kod:** `src/lib/bpmnProcessGraph.ts` rad ~136, `src/lib/bpmn/sequenceOrderHelpers.ts`

```typescript
assignExecutionOrder(parseResults, fileNodes);
```

- **Analyserar sequence flows** i varje BPMN-fil
- Använder **DFS (Depth-First Search)** från start-noder
- Beräknar `orderIndex` för varje nod baserat på exekveringsordning
- Tilldelar även `branchId` och `scenarioPath` för parallella grenar

**Exempel:**
```
Start → Task1 (orderIndex: 1) → Task2 (orderIndex: 2) → CallActivity (orderIndex: 3)
```

### Steg 3: Bestäm Vilka Filer som Ska Genereras
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1446-1448

```typescript
const analyzedFiles = isRootFileGeneration
  ? graphFileScope // Alla filer i hierarkin
  : [bpmnFileName]; // Bara vald fil
```

- Om root-fil-generering: alla filer i hierarkin
- Om isolerad generering: bara vald fil

### Steg 4: Filtrera Noder
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1483-1522

```typescript
const nodesToGenerate = testableNodes.filter(node => {
  // Filtrera baserat på analyzedFiles, missingDefinition, etc.
});
```

- Filtrerar bort noder som inte ska genereras
- För callActivities: kollar att subprocess-filen finns

### Steg 5: Beräkna Depth (Hierarkisk Nivå)
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1527-1542

```typescript
const calculateNodeDepth = (node: BpmnProcessNode): number => {
  if (!node.children || node.children.length === 0) {
    return 0; // Leaf nodes har depth 0
  }
  const maxChildDepth = Math.max(...node.children.map(calculateNodeDepth));
  return maxChildDepth + 1; // Parent nodes har högre depth
};
```

- **Leaf nodes** (tasks utan children): depth = 0
- **Subprocesser** (callActivities med children): depth = max(child depths) + 1
- **Parent processer**: högre depth än sina children

**Exempel:**
```
Task (depth: 0)
  └─ CallActivity → Subprocess (depth: 1)
      └─ Task (depth: 0)
          └─ Parent Process (depth: 2)
```

### Steg 6: Sortera Filer (Subprocess-filer Före Parent-filer)
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1715-1736

```typescript
// Identifiera subprocess-filer (anropas av callActivities)
const subprocessFiles = new Set<string>();
for (const node of nodesToGenerate) {
  if (node.type === 'callActivity' && node.subprocessFile) {
    subprocessFiles.add(node.subprocessFile);
  }
}

// Separera i subprocess-filer och root-filer
const subprocessFilesList = analyzedFiles.filter(file => subprocessFiles.has(file));
const rootFilesList = analyzedFiles.filter(file => !subprocessFiles.has(file));

// Subprocess-filer först, sedan root-filer
const sortedAnalyzedFiles = [...subprocessFilesList, ...rootFilesList];
```

**Resultat:**
- Subprocess-filer genereras **FÖRE** parent-filer
- Detta säkerställer att child documentation finns tillgänglig när parent Feature Goals genereras

### Steg 7: Generera Dokumentation per Fil
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1738

```typescript
for (const file of sortedAnalyzedFiles) {
  // Generera dokumentation för alla noder i denna fil
}
```

### Steg 8: Sortera Noder Inom Varje Fil
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1765-1785

```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  // Primär sortering: lägre depth först (subprocesser före parent nodes)
  if (depthA !== depthB) {
    return depthA - depthB; // LÄGRE DEPTH FÖRST
  }
  
  // Sekundär sortering: orderIndex (exekveringsordning) inom samma depth
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? 0;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? 0;
  if (orderA !== orderB) {
    return orderA - orderB; // Lägre orderIndex först
  }
  
  // Tertiär sortering: alfabetiskt för determinism
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

**Sorteringsordning:**
1. **Primär: Depth** (lägre depth först)
   - Leaf nodes (depth 0) → Subprocesser (depth 1) → Parent processer (depth 2+)
2. **Sekundär: orderIndex** (exekveringsordning från sequence flows)
   - Noder med samma depth sorteras efter exekveringsordning
3. **Tertiär: Alfabetiskt** (för determinism)

### Steg 9: Generera Dokumentation i Sorterad Ordning
**Kod:** `src/lib/bpmnGenerators.ts` rad ~1787+

```typescript
for (const node of sortedNodesInFile) {
  // Generera dokumentation för noden
  // För callActivities: samla child docs från generatedChildDocs
  // För tasks/epics: generera direkt
}
```

## Exempel: Generering av mortgage.bpmn med application

### Filordning:
1. `mortgage-se-application.bpmn` (subprocess-fil) ← genereras FÖRST
2. `mortgage-se-internal-data-gathering.bpmn` (subprocess-fil)
3. `mortgage-se-household.bpmn` (subprocess-fil)
4. ... (fler subprocess-filer)
5. `mortgage.bpmn` (root-fil) ← genereras SIST

### Nodordning inom mortgage-se-application.bpmn:
1. **Tasks** (depth 0, orderIndex 2-16) - genereras först
   - Task1 (depth: 0, orderIndex: 2)
   - Task2 (depth: 0, orderIndex: 3)
   - ...
2. **CallActivities** (depth 0, orderIndex 1-4) - genereras efter tasks
   - internal-data-gathering (depth: 0, orderIndex: 1)
   - household (depth: 0, orderIndex: 2)
   - ...
3. **Process-nod** (depth 1, orderIndex 0) - genereras sist
   - mortgage-se-application (depth: 1, orderIndex: 0)

### Nodordning inom mortgage.bpmn:
1. **Tasks** (depth 0) - genereras först
2. **CallActivities** (depth 0) - genereras efter tasks
   - application (depth: 0, orderIndex: 3)
   - credit-evaluation (depth: 0, orderIndex: 1)
   - ...
3. **Process-nod** (depth 1) - genereras sist

## Viktiga Poänger

### ✅ Exekveringsordning BEVARAS
- `orderIndex` beräknas från sequence flows i BPMN-filerna
- Används som **sekundär sortering** inom samma depth
- Noder med samma depth genereras i exekveringsordning

### ✅ Hierarkisk Ordning PRIORITERAS
- **Primär sortering**: depth (lägre depth först)
- Detta säkerställer att child nodes genereras före parent nodes
- Child documentation finns tillgänglig när parent Feature Goals genereras

### ✅ Filordning Säkerställer Aggregerat Innehåll
- Subprocess-filer genereras före parent-filer
- När call activity "application" i mortgage.bpmn genereras, har mortgage-se-application.bpmn redan genererats
- Feature Goal för "application" får aggregerat innehåll från subprocessen

## Sammanfattning

**Genereringsordning:**
1. **Filordning**: Subprocess-filer → Root-filer
2. **Nodordning inom filer**: 
   - Primär: Depth (lägre depth först)
   - Sekundär: orderIndex (exekveringsordning från sequence flows)
   - Tertiär: Alfabetiskt

**Resultat:**
- Leaf nodes genereras före parent nodes (hierarkisk ordning)
- Exekveringsordning bevaras inom samma depth
- Feature Goals får aggregerat innehåll från subprocesser
