# Dokumentationsgenerering - Genereringsordning

**Status:** ✅ Implementerad och dokumenterad  
**Senast uppdaterad:** 2025-01-XX  
**Kod:** `src/lib/bpmnGenerators.ts`

## Översikt

Dokumentationsgenereringen följer en **hierarkisk ordning** som prioriterar att child nodes genereras före parent nodes, men **bevarar också exekveringsordningen** från BPMN-filerna via sequence flows.

## Två Nivåer av Sortering

### 1. Filordning (Subprocess-filer före Parent-filer)

**Syfte:** Säkerställa att child documentation finns tillgänglig när parent Feature Goals genereras.

**Implementering:** `src/lib/bpmnGenerators.ts` rad ~1715-1736

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

// Sortera varje kategori alfabetiskt för determinism
subprocessFilesList.sort((a, b) => a.localeCompare(b));
rootFilesList.sort((a, b) => a.localeCompare(b));

// Subprocess-filer först, sedan root-filer
const sortedAnalyzedFiles = [...subprocessFilesList, ...rootFilesList];
```

**Resultat:**
- Subprocess-filer genereras **FÖRE** parent-filer
- Feature Goals får aggregerat innehåll från subprocesser
- Deterministik ordning (alfabetisk inom varje kategori)

**Exempel:**
```
Genereringsordning:
1. mortgage-se-application.bpmn (subprocess)
2. mortgage-se-internal-data-gathering.bpmn (subprocess)
3. mortgage-se-household.bpmn (subprocess)
4. ... (fler subprocess-filer)
5. mortgage.bpmn (root) ← genereras SIST
```

### 2. Nodordning Inom Filer (Hierarkisk + Exekveringsordning)

**Syfte:** Säkerställa att child nodes genereras före parent nodes, men behålla exekveringsordning.

**Implementering:** `src/lib/bpmnGenerators.ts` rad ~1765-1785

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

## Depth-beräkning

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1527-1542

```typescript
const calculateNodeDepth = (node: BpmnProcessNode, visited = new Set<string>()): number => {
  if (visited.has(node.id)) return 0; // Avoid cycles
  visited.add(node.id);
  
  if (!node.children || node.children.length === 0) {
    nodeDepthMap.set(node.id, 0);
    return 0; // Leaf nodes har depth 0
  }
  
  const maxChildDepth = Math.max(
    ...node.children.map(child => calculateNodeDepth(child, visited))
  );
  const depth = maxChildDepth + 1;
  nodeDepthMap.set(node.id, depth);
  return depth; // Parent nodes har högre depth
};
```

**Exempel:**
```
Task (depth: 0) ← Leaf node
  └─ CallActivity → Subprocess (depth: 1)
      └─ Task (depth: 0)
          └─ Parent Process (depth: 2)
```

## Exekveringsordning (orderIndex)

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

## Komplett Exempel

### Scenario: Generera mortgage.bpmn med alla subprocess-filer

**Filordning:**
1. `mortgage-se-application.bpmn` (subprocess) ← genereras FÖRST
2. `mortgage-se-internal-data-gathering.bpmn` (subprocess)
3. `mortgage-se-household.bpmn` (subprocess)
4. ... (fler subprocess-filer)
5. `mortgage.bpmn` (root) ← genereras SIST

**Nodordning inom mortgage-se-application.bpmn:**
1. **Tasks** (depth 0, orderIndex 2-16) - genereras först
   - Task1 (depth: 0, orderIndex: 2)
   - Task2 (depth: 0, orderIndex: 3)
   - ...
2. **CallActivities** (depth 0, orderIndex 1-4) - genereras efter tasks, i exekveringsordning
   - internal-data-gathering (depth: 0, orderIndex: 1)
   - household (depth: 0, orderIndex: 2)
   - ...
3. **Process-nod** (depth 1, orderIndex 0) - genereras sist
   - mortgage-se-application (depth: 1, orderIndex: 0)

**Nodordning inom mortgage.bpmn:**
1. **Tasks** (depth 0) - genereras först
2. **CallActivity "application"** (depth 0, orderIndex 3) - genereras efter tasks
   - Har nu tillgång till child docs från `mortgage-se-application.bpmn` som redan genererats
   - Feature Goal får aggregerat innehåll från subprocessen
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

## Relaterad Dokumentation

- `docs/analysis/GENERATION_LOGIC_EXPLANATION.md` - Detaljerad förklaring med exempel
- `docs/analysis/FEATURE_GOAL_GENERATION_ORDER_ANALYSIS.md` - Analys av problem och lösningar
- `docs/architecture/bpmn-hierarchy-architecture.md` - Övergripande arkitektur

## Testning

Tester som validerar genereringsordning:
- `tests/integration/generation-order-scenarios.test.ts` - Olika scenarion för genereringsordning
- `tests/integration/validate-feature-goals-generation.test.ts` - Validerar Feature Goal-generering
