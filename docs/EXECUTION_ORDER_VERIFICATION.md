# Verifiering: Exekveringsordning och Dokumentationsgenerering

## Status: ✅ Alla kontroller bevarade

**Datum**: 2024-12-19
**Verifiering**: Exekveringsordning (orderIndex, sequence flows) bevaras korrekt

## Översikt

Detta dokument verifierar att vi inte har tappat kontrollen över exekveringsordningen när vi genererar dokumentation. Vi har lagt mycket tid på att definiera ordningen baserat på vad som faktiskt händer i BPMN-filerna (sequence flows, orderIndex), och detta bevaras.

## Två Olika Sorteringar

### 1. Filordning (hierarkisk)
**Syfte**: Säkerställa att child documentation finns tillgänglig när parent-filer genereras

**Implementering**:
- Subprocess-filer (children) genereras före root-filer (parents)
- Inom varje kategori sorteras alfabetiskt för determinism
- **Påverkar INTE**: Nodordning inom filer

**Kod**: `src/lib/bpmnGenerators.ts` rad ~1374-1397

### 2. Nodordning inom filer (hierarkisk + exekveringsordning)
**Syfte**: Säkerställa att child nodes genereras före parent nodes, men behålla exekveringsordning

**Implementering**:
- **Primär sortering**: `depth` (hierarkisk - leaf nodes först)
- **Sekundär sortering**: `orderIndex` (exekveringsordning från sequence flows) inom samma depth
- **Tertiär sortering**: Alfabetiskt för determinism

**Kod**: `src/lib/bpmnGenerators.ts` rad ~1547-1568

## Exekveringsordning bevaras

### ✅ orderIndex beräknas fortfarande korrekt

**Källa**: `src/lib/bpmnProcessGraph.ts` rad ~274-342
- `assignExecutionOrder` anropar `calculateOrderFromSequenceFlows`
- `orderIndex` beräknas från sequence flows via DFS/topologisk sortering
- Tilldelas till varje nod: `node.orderIndex = info.orderIndex`

### ✅ orderIndex används fortfarande

**I testgenerering**:
- `src/lib/bpmnGenerators.ts` rad ~2666, 2677
- Testfiler inkluderar `[#${node.orderIndex}]` prefix

**I dokumentation**:
- `src/lib/bpmnGenerators.ts` rad ~2886, 2897
- När `includeOrderIndex` är true, visas orderIndex i dokumentationen

**I nodsortering**:
- `src/lib/bpmnGenerators.ts` rad ~1554-1568
- Sekundär sortering efter `orderIndex` inom samma depth-nivå

### ✅ visualOrderIndex används som fallback

**Källa**: `src/lib/bpmnProcessGraph.ts` rad ~326-340
- Beräknas från BPMN DI-koordinater (vänster→höger)
- Används när `orderIndex` saknas
- Används i sekundär sortering när `orderIndex` saknas

## Sorteringslogik - Detaljerad

### Filordning
```typescript
// 1. Identifiera subprocess-filer (anropas av callActivities)
const subprocessFiles = new Set<string>();
for (const node of testableNodes) {
  if (node.type === 'callActivity' && node.subprocessFile) {
    subprocessFiles.add(node.subprocessFile);
  }
}

// 2. Separera i subprocess-filer och root-filer
const subprocessFilesList = allFiles.filter(file => subprocessFiles.has(file));
const rootFilesList = allFiles.filter(file => !subprocessFiles.has(file));

// 3. Sortera varje kategori alfabetiskt
subprocessFilesList.sort((a, b) => a.localeCompare(b));
rootFilesList.sort((a, b) => a.localeCompare(b));

// 4. Subprocess-filer först, sedan root-filer
const filesToGenerate = [...subprocessFilesList, ...rootFilesList];
```

**Resultat**: 
- Subprocess-filer genereras före parent-filer
- Deterministik ordning (alfabetisk inom varje kategori)
- **Påverkar INTE nodordning inom filer**

### Nodordning inom filer
```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  // Primär: högre depth först (leaf nodes före parent nodes)
  if (depthA !== depthB) {
    return depthB - depthA;
  }
  
  // Sekundär: orderIndex (exekveringsordning) inom samma depth
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? 0;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? 0;
  
  if (orderA !== orderB) {
    return orderA - orderB; // Lägre orderIndex först
  }
  
  // Tertiär: alfabetiskt för determinism
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

**Resultat**:
- Leaf nodes genereras före parent nodes (hierarkisk ordning)
- Inom samma depth följer exekveringsordningen från sequence flows
- Deterministik ordning (alfabetisk som sista fallback)

## Verifiering: Alla problem lösta

### ✅ Problem 1: Inkonsekvent Feature Goal-generering
- **Status**: Löst
- Subprocess-filen genererar alltid sin egen Feature Goal-sida
- callActivity skapar instans-specifik sida med parent i namnet

### ✅ Problem 2: Filordning är inte deterministisk
- **Status**: Löst
- Hierarkisk sortering: subprocess-filer före root-filer
- Alfabetisk sortering inom varje kategori för determinism

### ✅ Problem 3: Feature Goal-sida kan skapas två gånger
- **Status**: Löst
- Kontroll innan skapande: `result.docs.has(featureDocPath)`
- Förhindrar dubbelgenerering

### ✅ Problem 4: Instans-specifik dokumentation sparas inte
- **Status**: Löst
- Sparas med instans-specifik key (`nodeKey`)
- Base dokumentation sparas med `subprocess:${file}` key

### ✅ Problem 5: Child documentation samlas inte rekursivt
- **Status**: Löst
- Rekursiv funktion `collectChildDocsRecursively`
- Inkluderar nested subprocesser korrekt

### ✅ Problem 6: Inkonsekvent processedDocNodes-hantering
- **Status**: Löst
- Global `globalProcessedDocNodes` Set
- Konsekvent logik för alla nodtyper

### ✅ Problem 7: Exekveringsordning bevaras
- **Status**: Löst
- Primär sortering: depth (hierarkisk)
- Sekundär sortering: orderIndex (exekveringsordning)
- orderIndex beräknas fortfarande korrekt från sequence flows
- orderIndex används fortfarande i testgenerering och dokumentation

## Sammanfattning

**Filordning**: Hierarkisk (subprocess-filer före root-filer) - påverkar INTE nodordning inom filer

**Nodordning**: Hierarkisk (depth) + Exekveringsordning (orderIndex) - bevarar både hierarki OCH exekveringsordning

**Exekveringsordning**: 
- ✅ Beräknas fortfarande korrekt från sequence flows
- ✅ Används i sekundär sortering inom samma depth-nivå
- ✅ Används i testgenerering och dokumentation
- ✅ visualOrderIndex används som fallback när orderIndex saknas

**Resultat**: Vi har INTE tappat kontrollen över exekveringsordningen. Den bevaras korrekt och används där det är relevant.
