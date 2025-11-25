# Verifiering: Test vs App - Använder exakt samma funktionalitet

## Sammanfattning

✅ **JA** - `tests/integration/mortgage.tree-hierarchy.test.ts` använder **EXAKT samma funktionalitet** som appen.

## Detaljerad jämförelse

### 1. Parsing av BPMN-filer

#### Testet (`mortgage.tree-hierarchy.test.ts`):
```typescript
const result = await parseBpmnFile(dataUrl);
parseResults.set(file, result);
```

#### Appen (`useProcessTree.ts`):
```typescript
const parsed = await parseBpmnFile(fileName);
parseResults.set(fileName, parsed);
```

**Resultat:** ✅ Samma funktion, samma användning

### 2. Bygga ProcessGraph

#### Testet (`mortgage.tree-hierarchy.test.ts`):
```typescript
const graph = buildProcessGraph(parseResults, {
  bpmnMap: bpmnMapData,
  preferredRootProcessId: 'mortgage',
});
```

#### Appen (`useProcessTree.ts`):
```typescript
const graph = buildProcessGraph(parseResults, {
  bpmnMap,
  preferredRootProcessId: effectiveRootFile.replace('.bpmn', ''),
});
```

**Resultat:** ✅ Samma funktion, samma parametrar (endast skillnad är rootFile-värdet)

### 3. Bygga ProcessTree

#### Testet (`mortgage.tree-hierarchy.test.ts`):
```typescript
const tree = buildProcessTreeFromGraph(graph, {
  rootProcessId: 'mortgage',
  preferredRootFile: 'mortgage.bpmn',
  artifactBuilder: () => [],
});
```

#### Appen (`useProcessTree.ts`):
```typescript
const newTree = buildProcessTreeFromGraph(graph, {
  rootProcessId: effectiveRootFile.replace('.bpmn', ''),
  preferredRootFile: effectiveRootFile,
  artifactBuilder: buildArtifacts,
});
```

**Resultat:** ✅ Samma funktion, samma parametrar (endast skillnad är artifactBuilder som inte påverkar sortering)

### 4. Sortering av noder

#### Testet (`mortgage.tree-hierarchy.test.ts`):
```typescript
// Sort children using the same logic as ProcessExplorer
const sortedChildren = sortCallActivities(node.children, depth === 0 ? 'root' : 'subprocess');
```

#### Appen - ProcessExplorer (`ProcessTreeD3.tsx`):
```typescript
// Använd samma sorteringslogik som Timeline: visualOrderIndex -> orderIndex -> branchId -> label
// Bestäm mode baserat på om det är root-nivå (depth 0) eller subprocess-nivå
const mode = isRoot ? 'root' : 'subprocess';
filtered.children = sortCallActivities(filteredChildren, mode);
```

#### Appen - Timeline (`ganttDataConverter.ts`):
```typescript
// Root level
const sorted = sortCallActivities(rootCallActivities, 'root');

// Subprocess level
const sorted = sortCallActivities(childNodes, 'subprocess');
```

**Resultat:** ✅ Samma funktion, samma mode-logik ('root' för root-nivå, 'subprocess' för subprocess-nivå)

## Skillnader (som INTE påverkar sortering)

### 1. Data-källa

- **Testet:** Läser BPMN-filer från `tests/fixtures/bpmn/analytics/`
- **Appen:** Läser BPMN-filer från Supabase Storage

**Påverkan:** ❌ Ingen - båda använder `parseBpmnFile()` som returnerar samma `BpmnParseResult`

### 2. ArtifactBuilder

- **Testet:** `artifactBuilder: () => []` (tom array)
- **Appen:** `artifactBuilder: buildArtifacts` (byggs artifacts)

**Påverkan:** ❌ Ingen - artifacts påverkar INTE sortering

### 3. BPMN Map

- **Testet:** Laddar från `bpmn-map.json` i test-mappen
- **Appen:** Laddar från `bpmn-map.json` i root

**Påverkan:** ❌ Ingen - samma struktur, samma funktion `loadBpmnMap()`

## Slutsats

✅ **Testet använder EXAKT samma funktionalitet som appen:**

1. ✅ Samma parsing-funktion (`parseBpmnFile`)
2. ✅ Samma graph-building-funktion (`buildProcessGraph`)
3. ✅ Samma tree-building-funktion (`buildProcessTreeFromGraph`)
4. ✅ Samma sorteringsfunktion (`sortCallActivities`)
5. ✅ Samma mode-logik ('root' vs 'subprocess')

**Enda skillnaderna:**
- Data-källa (test fixtures vs Supabase) - påverkar INTE sortering
- ArtifactBuilder (tom vs faktisk) - påverkar INTE sortering
- BPMN Map (samma struktur, olika plats) - påverkar INTE sortering

**Resultat:** Testet är en **exakt replika** av appens funktionalitet när det gäller sortering och ordning.

