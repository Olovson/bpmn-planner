# Analys: Feature Goal Genereringsordning - När genereras "application"?

## Problemformulering

Användaren är skeptisk till att Feature Goal för "application" genereras när `mortgage.bpmn` körs, eftersom detta bryter mot principen att Feature Goals ska genereras **EFTER** leaf nodes och subprocesser så att innehållet kan aggregeras.

## Nuvarande Genereringsordning

### 1. Filordning (analyzedFiles)

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1406-1420

```typescript
// analyzedFiles bestämmer vilka filer som ska genereras
// Om useHierarchy = true, inkluderas alla filer i hierarkin
// Om useHierarchy = false, bara root-filen
const analyzedFiles = useHierarchy 
  ? Array.from(new Set(graphFileScope))  // Alla filer i hierarkin
  : [bpmnFileName];                      // Bara root-filen
```

**Problem:** Ingen explicit sortering av filer! Filer genereras i den ordning de finns i `graphFileScope`, vilket kan vara:
- Alfabetisk ordning
- Ordning de hittades i grafen
- **INGEN garanti att subprocess-filer genereras före parent-filer**

### 2. Nodordning inom filer

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1738-1759

```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  // Primär sortering: lägre depth först (subprocesser före parent nodes)
  if (depthA !== depthB) {
    return depthA - depthB; // LÄGRE DEPTH FÖRST
  }
  
  // Sekundär sortering: orderIndex (exekveringsordning)
  // ...
});
```

**Detta är KORREKT:** Noder sorteras så att lägre depth (subprocesser) genereras före högre depth (parent nodes).

### 3. Depth-beräkning

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1527-1542

```typescript
const calculateNodeDepth = (node: BpmnProcessNode, visited = new Set<string>()): number => {
  if (!node.children || node.children.length === 0) {
    return 0; // Leaf nodes har depth 0
  }
  
  const maxChildDepth = Math.max(
    ...node.children.map(child => calculateNodeDepth(child, visited))
  );
  return maxChildDepth + 1; // Parent nodes har högre depth
};
```

**Detta är KORREKT:** Leaf nodes får depth 0, parent nodes får högre depth.

## Scenario: När genereras Feature Goal för "application"?

### Scenario A: Generera alla filer (useHierarchy = true)

**Filer i hierarkin:**
1. `mortgage.bpmn` (root)
2. `mortgage-se-application.bpmn` (subprocess)
3. `mortgage-se-internal-data-gathering.bpmn` (subprocess)
4. `mortgage-se-household.bpmn` (subprocess)
5. ... (fler subprocesser)

**Problem:** Om `mortgage.bpmn` genereras FÖRE `mortgage-se-application.bpmn`:

1. **När `mortgage.bpmn` genereras:**
   - Call activity "application" har depth baserat på children i grafen
   - Om `mortgage-se-application.bpmn` INTE är genererad än, finns INGA child docs i `generatedChildDocs`
   - Feature Goal för "application" genereras **UTAN** aggregerat innehåll från subprocessen
   - Resultat: `feature-goals/mortgage-application.html` skapas med ofullständig information

2. **När `mortgage-se-application.bpmn` genereras senare:**
   - Process-nod "mortgage-se-application" genereras
   - Feature Goal för process-noden skapas: `feature-goals/mortgage-se-application.html`
   - Men call activity Feature Goal från `mortgage.bpmn` är redan genererad och saknar aggregerat innehåll

### Scenario B: Generera bara mortgage.bpmn (useHierarchy = false)

**Filer:**
- Bara `mortgage.bpmn`

**När `mortgage.bpmn` genereras:**
- Call activity "application" har children i grafen (från `mortgage-se-application.bpmn`)
- Men `mortgage-se-application.bpmn` genereras INTE (inte i analyzedFiles)
- Child docs samlas från `node.children`, men dessa är bara strukturell info, inte faktisk dokumentation
- Feature Goal genereras **UTAN** aggregerat innehåll från subprocessen

## Problemidentifiering

### Problem 1: Ingen filordningssortering

**Nuvarande beteende:**
- Filer genereras i ordning de finns i `graphFileScope`
- Ingen garanti att subprocess-filer genereras före parent-filer

**Konsekvens:**
- Om `mortgage.bpmn` genereras före `mortgage-se-application.bpmn`, genereras Feature Goal för "application" utan aggregerat innehåll

### Problem 2: Child docs samlas bara från redan genererade noder

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1970-1987

```typescript
// Samla child docs från generatedChildDocs
for (const child of node.children) {
  const childDocKey = child.type === 'callActivity' && child.subprocessFile
    ? `subprocess:${child.subprocessFile}`
    : `${child.bpmnFile}::${child.bpmnElementId}`;
  
  const childDoc = generatedChildDocs.get(childDocKey);
  if (childDoc) {
    childDocsForNode.set(child.id, childDoc);
  }
}
```

**Problem:** 
- Child docs hämtas bara från `generatedChildDocs`, som bara innehåller dokumentation från **redan genererade** noder
- Om subprocess-filen inte är genererad än, finns INGA child docs att hämta
- Feature Goal genereras utan aggregerat innehåll

### Problem 3: Call activities från root-filen genereras alltid

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1990-2025

```typescript
if (node.type === 'callActivity') {
  // Generera alltid Feature Goal för callActivities
  // ...
}
```

**Problem:**
- Call activities från root-filen genereras alltid, även om subprocess-filen inte är genererad än
- Detta bryter mot principen att Feature Goals ska genereras EFTER subprocesser

## Lösningsförslag

### Lösning 1: Sortera filer så att subprocess-filer genereras före parent-filer

**Implementation:**
```typescript
// Identifiera subprocess-filer (anropas av callActivities)
const subprocessFiles = new Set<string>();
for (const node of testableNodes) {
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

**Fördelar:**
- Subprocess-filer genereras alltid före parent-filer
- Feature Goals får aggregerat innehåll från subprocesser

**Nackdelar:**
- Kräver ändring i kod
- Kan påverka befintliga test

### Lösning 2: Fördröj generering av call activity Feature Goals tills subprocess-filen är genererad

**Implementation:**
```typescript
if (node.type === 'callActivity') {
  // Kolla om subprocess-filen är genererad
  const subprocessFileGenerated = generatedSubprocessFeatureGoals.has(node.subprocessFile);
  
  if (!subprocessFileGenerated && analyzedFiles.includes(node.subprocessFile)) {
    // Subprocess-filen ska genereras senare - hoppa över call activity Feature Goal nu
    // Den kommer genereras när subprocess-filen processas
    continue;
  }
  
  // Generera Feature Goal med aggregerat innehåll
  // ...
}
```

**Fördelar:**
- Feature Goals genereras alltid med aggregerat innehåll
- Ingen filordningsändring behövs

**Nackdelar:**
- Call activities från root-filen kan hoppas över om subprocess-filen inte är med i analyzedFiles
- Kräver ändring i kod

### Lösning 3: Två-pass generering för call activities

**Implementation:**
```typescript
// Pass 1: Generera alla subprocesser och tasks
for (const file of analyzedFiles) {
  for (const node of sortedNodesInFile) {
    if (node.type !== 'callActivity') {
      // Generera tasks/epics
    }
  }
}

// Pass 2: Generera call activity Feature Goals med aggregerat innehåll
for (const file of analyzedFiles) {
  for (const node of sortedNodesInFile) {
    if (node.type === 'callActivity') {
      // Generera Feature Goal med aggregerat innehåll
    }
  }
}
```

**Fördelar:**
- Alla subprocesser och tasks genereras först
- Feature Goals får alltid aggregerat innehåll

**Nackdelar:**
- Kräver större refaktorering
- Två pass genom filer kan vara långsammare

## Rekommendation

**Rekommendation: Kombinera Lösning 1 och 2**

1. **Sortera filer** så att subprocess-filer genereras före parent-filer
2. **Fördröj call activity Feature Goals** tills subprocess-filen är genererad (om den är med i analyzedFiles)

Detta säkerställer att:
- Feature Goals alltid får aggregerat innehåll när möjligt
- Call activities från root-filen genereras korrekt när subprocess-filen är genererad
- Om subprocess-filen inte är med i analyzedFiles, genereras Feature Goal ändå (men utan aggregerat innehåll)

## Nuvarande Status

**Problem bekräftat:** 
- ✅ Call activities från root-filen genereras alltid, även om subprocess-filen inte är genererad än
- ✅ Ingen filordningssortering säkerställer att subprocess-filer genereras före parent-filer
- ✅ Feature Goals kan genereras utan aggregerat innehåll från subprocesser

**Nästa steg:**
- Implementera filordningssortering
- Fördröj call activity Feature Goals tills subprocess-filen är genererad (om möjligt)
