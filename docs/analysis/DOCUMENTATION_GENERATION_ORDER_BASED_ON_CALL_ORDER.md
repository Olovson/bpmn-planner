# Analys: Dokumentationsgenerering baserat på Anropsordning

## Datum: 2025-12-26

## 🎯 Användarens Förväntning

Användaren vill att dokumentationsfiler genereras i **samma ordning som de anropas i BPMN-filerna**, vilket kan ses på **test-coverage sidan** med filter "Fullständig (per aktivitet)" när man läser från **vänster till höger**.

**Två viktiga principer:**
1. **Ordning baserad på anropsordning:** Dokumentation borde genereras i samma ordning som noder anropas i BPMN-filerna (från vänster till höger, som på test-coverage sidan)
2. **Leaf nodes först:** Leaf nodes (epics) i subprocesser borde genereras **FÖRE** Feature Goals för dessa subprocesser

---

## 📊 Hur Test Coverage Sidan Visar Ordningen

### Test Coverage Sidan: "Fullständig (per aktivitet)"

**Kod-referens:**
```106:150:src/lib/testCoverageHelpers.ts
export function sortPathsByProcessTreeOrder(
  rows: PathRow[]
): PathRow[] {
  return rows.sort((a, b) => {
    // Jämför paths nod för nod
    const minLength = Math.min(a.path.length, b.path.length);
    
    for (let i = 0; i < minLength; i++) {
      const nodeA = a.path[i];
      const nodeB = b.path[i];
      
      if (nodeA.id !== nodeB.id) {
        // Sortera baserat på visualOrderIndex, orderIndex, branchId, label (samma som sortCallActivities)
        const aVisual = nodeA.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        const bVisual = nodeB.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        
        if (aVisual !== bVisual) {
          return aVisual - bVisual;
        }
        
        const aOrder = nodeA.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const bOrder = nodeB.orderIndex ?? Number.MAX_SAFE_INTEGER;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        // ... branchId, label, etc.
      }
    }
    
    return a.path.length - b.path.length;
  });
}
```

**Vad detta betyder:**
- Test Coverage sidan sorterar paths baserat på `visualOrderIndex` och `orderIndex`
- `visualOrderIndex`: Visuell ordning från BPMN-diagrammet (vänster till höger)
- `orderIndex`: Exekveringsordning från sequence flows
- Ordningen är **deterministisk** och följer hur noder faktiskt anropas i BPMN-filerna

---

## 🔍 Nuvarande Implementation

### 1. Fil-sortering (Topologisk)

**Kod-referens:**
```1887:1919:src/lib/bpmnGenerators.ts
// Bygg dependency-graf från graph.allNodes (vilka filer anropar vilka)
const fileDependencies = new Map<string, Set<string>>();
for (const node of graph.allNodes.values()) {
  if (node.type === 'callActivity' && node.subprocessFile && !node.missingDefinition) {
    const parentFile = node.bpmnFile;
    const subprocessFile = node.subprocessFile;
    fileDependencies.get(parentFile)!.add(subprocessFile);
  }
}

// Topologisk sortering: leaf nodes (filer som inte anropas) först, root-filer sist
const sortedAnalyzedFiles = topologicalSortFiles(analyzedFiles, fileDependencies);
```

**Vad detta gör:**
- ✅ Sorterar filer topologiskt (subprocesser före parent)
- ✅ Säkerställer att subprocess-filer genereras FÖRE parent-filer
- ❌ **Använder INTE anropsordning** (vänster till höger från BPMN-filerna)

---

### 2. Node-sortering inom fil

**Kod-referens:**
```1975:2001:src/lib/bpmnGenerators.ts
// Sortera noder primärt efter depth (hierarkisk ordning: leaf nodes först)
// Sekundärt efter orderIndex (exekveringsordning från sequence flows) inom samma depth
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
    return orderA - orderB; // Lägre orderIndex först (tidigare i exekveringsordningen)
  }
  
  // Tertiär sortering: alfabetiskt för determinism
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

**Vad detta gör:**
- ✅ Primär sortering: **depth** (lägre depth först = subprocesser före parent)
- ✅ Sekundär sortering: **orderIndex** (exekveringsordning)
- ✅ Tertiär sortering: **visualOrderIndex** (visuell ordning)
- ⚠️ **Problemet:** Primär sortering är **depth**, inte **orderIndex/visualOrderIndex**

---

### 3. Child Documentation Collection

**Kod-referens:**
```2202:2243:src/lib/bpmnGenerators.ts
// Rekursiv funktion för att samla dokumentation från alla descendant nodes
const collectChildDocsRecursively = (currentNode: BpmnProcessNode) => {
  if (currentNode.children && Array.isArray(currentNode.children) && currentNode.children.length > 0) {
    for (const child of currentNode.children) {
      const childDocKey = child.type === 'callActivity' && child.subprocessFile
        ? `subprocess:${child.subprocessFile}`
        : `${child.bpmnFile}::${child.bpmnElementId}`;
      
      const childDoc = generatedChildDocs.get(childDocKey);
      if (childDoc) {
        childDocsForNode.set(child.id, childDoc);
      }
      
      // Rekursivt samla från nested children
      if (child.children && Array.isArray(child.children) && child.children.length > 0) {
        collectChildDocsRecursively(child);
      }
    }
  }
};

// För callActivities: samla rekursivt från alla descendant nodes
if (node.type === 'callActivity') {
  collectChildDocsRecursively(node);
}
```

**Vad detta gör:**
- ✅ Samlar dokumentation från `node.children` rekursivt
- ❌ **Problemet:** Epics i subprocess-filen är INTE children till callActivity-noden
- ❌ Epics i `internal-data-gathering.bpmn` är children till **process-noden** i subprocess-filen, inte till callActivity-noden i parent-filen

---

## 🔴 Problem med Nuvarande Implementation

### Problem 1: Primär Sortering är Depth, inte Anropsordning

**Nuvarande logik:**
- Primär sortering: **depth** (lägre depth först)
- Sekundär sortering: **orderIndex** (exekveringsordning)

**Problemet:**
- Om två noder har samma depth, sorteras de efter `orderIndex`
- Men om de har olika depth, sorteras de efter depth (inte anropsordning)
- Detta kan leda till att noder genereras i fel ordning jämfört med hur de anropas i BPMN-filerna

**Exempel:**
```
BPMN-fil: mortgage-se-application.bpmn
Anropsordning (från vänster till höger):
1. internal-data-gathering (callActivity, depth: 1)
2. Fetch party information (serviceTask, depth: 2) ← i subprocess-filen
3. Pre-screen party (businessRuleTask, depth: 2) ← i subprocess-filen
4. household (callActivity, depth: 1)
5. Confirm application (userTask, depth: 1)

Nuvarande sortering (depth först):
1. internal-data-gathering (depth: 1, orderIndex: 1)
2. household (depth: 1, orderIndex: 4)
3. Confirm application (depth: 1, orderIndex: 5)
4. Fetch party information (depth: 2, orderIndex: 2) ← kommer EFTER callActivities
5. Pre-screen party (depth: 2, orderIndex: 3) ← kommer EFTER callActivities

Önskad sortering (anropsordning):
1. internal-data-gathering (callActivity)
2. Fetch party information (epic i subprocess) ← FÖRE household
3. Pre-screen party (epic i subprocess) ← FÖRE household
4. household (callActivity)
5. Confirm application (epic)
```

---

### Problem 2: Epics i Subprocesser Genereras EFTER Feature Goals

**Nuvarande logik:**
- Filerna sorteras topologiskt (subprocesser före parent)
- Men noder inom fil sorteras efter depth (lägre depth först)
- Detta betyder att callActivities (depth: 1) genereras FÖRE epics i subprocess-filen (depth: 2)

**Problemet:**
- Epics i `internal-data-gathering.bpmn` genereras när `internal-data-gathering.bpmn` processas
- Men Feature Goal för callActivity "internal-data-gathering" i `application.bpmn` genereras när `application.bpmn` processas
- Om `application.bpmn` processas FÖRE `internal-data-gathering.bpmn`, saknas epics när Feature Goal genereras

**Exempel:**
```
Ordning med topologisk sortering:
1. mortgage-se-internal-data-gathering.bpmn (subprocess)
   - Fetch party information (epic) ← genereras här
   - Pre-screen party (epic) ← genereras här
2. mortgage-se-application.bpmn (parent)
   - internal-data-gathering (Feature Goal) ← genereras här, epics finns redan ✅

Men om filerna sorteras fel:
1. mortgage-se-application.bpmn (parent)
   - internal-data-gathering (Feature Goal) ← genereras här, epics saknas ❌
2. mortgage-se-internal-data-gathering.bpmn (subprocess)
   - Fetch party information (epic) ← genereras för sent ❌
```

---

### Problem 3: Child Documentation Collection Samlar INTE från Subprocess-filen

**Nuvarande logik:**
- `collectChildDocsRecursively(node)` samlar från `node.children` (direkta children till callActivity-noden)
- Epics i subprocess-filen är INTE children till callActivity-noden
- De är children till process-noden i subprocess-filen

**Problemet:**
- När Feature Goal genereras för callActivity "internal-data-gathering", samlas dokumentation från `node.children`
- Men `node.children` innehåller bara process-noden från `internal-data-gathering.bpmn`, inte epics (UserTasks, ServiceTasks)
- Epics saknas i Feature Goal-dokumentationen ❌

---

## ✅ Hur Det Borde Fungera

### Princip 1: Ordning baserad på Anropsordning

**För filer:**
- Sortera filer topologiskt (subprocesser före parent) ✅ (redan implementerat)
- Men inom varje fil, sortera noder efter **anropsordning** (orderIndex/visualOrderIndex), inte depth

**För noder inom fil:**
- Primär sortering: **orderIndex** (exekveringsordning från sequence flows)
- Sekundär sortering: **visualOrderIndex** (visuell ordning från BPMN-diagrammet)
- Tertiär sortering: **depth** (lägre depth först, för att säkerställa subprocesser före parent)

**Kod-förslag:**
```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  // Primär sortering: orderIndex (anropsordning från sequence flows)
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  
  if (orderA !== orderB) {
    return orderA - orderB; // Lägre orderIndex först (tidigare i anropsordningen)
  }
  
  // Sekundär sortering: visualOrderIndex (visuell ordning från BPMN-diagrammet)
  const visualA = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  const visualB = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  
  if (visualA !== visualB) {
    return visualA - visualB;
  }
  
  // Tertiär sortering: depth (lägre depth först, för att säkerställa subprocesser före parent)
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  if (depthA !== depthB) {
    return depthA - depthB;
  }
  
  // Kvartär sortering: alfabetiskt för determinism
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

---

### Princip 2: Leaf Nodes (Epics) Före Feature Goals

**För subprocesser:**
- När en subprocess-fil processas, generera **epics först** (leaf nodes)
- Sedan generera **Feature Goal** för subprocessen (om det behövs)

**För parent-filer:**
- När en parent-fil processas, generera **epics först** (leaf nodes i parent-filen)
- Sedan generera **Feature Goals** för callActivities (med epics från subprocess-filer tillgängliga)

**Implementation:**
- Sortera noder så att **tasks/epics** (leaf nodes) kommer FÖRE **callActivities** (Feature Goals)
- Detta kan göras genom att sortera efter **node type** (tasks/epics före callActivities) inom samma orderIndex

**Kod-förslag:**
```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  // Primär sortering: orderIndex (anropsordning)
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  
  // Sekundär sortering: node type (tasks/epics före callActivities)
  // Detta säkerställer att leaf nodes genereras FÖRE Feature Goals
  const typeOrder = {
    'userTask': 1,
    'serviceTask': 1,
    'businessRuleTask': 1,
    'callActivity': 2,
    'process': 3,
  };
  const typeOrderA = typeOrder[a.type as keyof typeof typeOrder] ?? 99;
  const typeOrderB = typeOrder[b.type as keyof typeof typeOrder] ?? 99;
  
  if (typeOrderA !== typeOrderB) {
    return typeOrderA - typeOrderB; // Tasks/epics (1) före callActivities (2)
  }
  
  // Tertiär sortering: visualOrderIndex
  const visualA = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  const visualB = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
  
  if (visualA !== visualB) {
    return visualA - visualB;
  }
  
  // Kvartär sortering: depth
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  if (depthA !== depthB) {
    return depthA - depthB;
  }
  
  // Kvintär sortering: alfabetiskt
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

---

### Princip 3: Samla Child Documentation från Subprocess-filen

**För callActivities:**
- När Feature Goal genereras för callActivity, hitta subprocess-filen
- Hämta alla noder i subprocess-filen från `graph.fileNodes.get(subprocessFile)`
- Samla dokumentation från alla noder i subprocess-filen (epics, tasks)
- Inkludera dessa i `convertedChildDocs`

**Kod-förslag:**
```typescript
if (node.type === 'callActivity' && node.subprocessFile) {
  // Hitta alla noder i subprocess-filen
  const subprocessNodes = graph.fileNodes.get(node.subprocessFile) || [];
  
  // Samla dokumentation från alla noder i subprocess-filen
  for (const subprocessNode of subprocessNodes) {
    // Hoppa över process-noden (den har ingen epic-dokumentation)
    if (subprocessNode.type === 'process') continue;
    
    // Hitta dokumentation för noden
    const subprocessDocKey = `${subprocessNode.bpmnFile}::${subprocessNode.bpmnElementId}`;
    const subprocessDoc = generatedChildDocs.get(subprocessDocKey);
    
    if (subprocessDoc) {
      childDocsForNode.set(subprocessNode.id, subprocessDoc);
    }
  }
  
  // Också samla rekursivt från node.children (för nested subprocesser)
  collectChildDocsRecursively(node);
}
```

---

## 📊 Jämförelse: Nuvarande vs Önskad

| Aspekt | Nuvarande | Önskad |
|--------|-----------|--------|
| **Fil-sortering** | Topologisk (subprocesser före parent) ✅ | Topologisk (subprocesser före parent) ✅ |
| **Node-sortering primär** | Depth (lägre depth först) ❌ | OrderIndex (anropsordning) ✅ |
| **Node-sortering sekundär** | OrderIndex (exekveringsordning) ⚠️ | VisualOrderIndex (visuell ordning) ✅ |
| **Node-sortering tertiär** | VisualOrderIndex (visuell ordning) ⚠️ | Node type (tasks/epics före callActivities) ✅ |
| **Leaf nodes före Feature Goals** | ❌ (depth-sortering kan ge fel ordning) | ✅ (node type-sortering säkerställer detta) |
| **Child documentation från subprocess** | ❌ (samlas bara från node.children) | ✅ (samlas från subprocess-filen) |

---

## 🎯 Rekommendation

### Implementera Tre Förändringar:

1. **Ändra primär sortering från depth till orderIndex**
   - Primär sortering: `orderIndex` (anropsordning)
   - Sekundär sortering: `visualOrderIndex` (visuell ordning)
   - Tertiär sortering: `node type` (tasks/epics före callActivities)
   - Kvartär sortering: `depth` (lägre depth först)

2. **Sortera efter node type för att säkerställa leaf nodes före Feature Goals**
   - Tasks/epics (userTask, serviceTask, businessRuleTask) → typeOrder: 1
   - CallActivities → typeOrder: 2
   - Process → typeOrder: 3

3. **Samla child documentation från subprocess-filen**
   - När callActivity Feature Goal genereras, hitta subprocess-filen
   - Hämta alla noder i subprocess-filen från `graph.fileNodes.get(subprocessFile)`
   - Samla dokumentation från alla noder i subprocess-filen (epics, tasks)

---

## 🔍 Exempel: Förväntad Ordning

### Scenario: `mortgage-se-application.bpmn`

**BPMN-anropsordning (från vänster till höger):**
1. `internal-data-gathering` (callActivity, orderIndex: 1)
2. `Fetch party information` (serviceTask, orderIndex: 2) ← i subprocess-filen
3. `Pre-screen party` (businessRuleTask, orderIndex: 3) ← i subprocess-filen
4. `household` (callActivity, orderIndex: 4)
5. `Confirm application` (userTask, orderIndex: 5)

**Önskad genereringsordning:**
1. `internal-data-gathering` (Feature Goal) ← genereras när `application.bpmn` processas
   - Men först: epics från `internal-data-gathering.bpmn` måste finnas
2. `Fetch party information` (epic) ← genereras när `internal-data-gathering.bpmn` processas
3. `Pre-screen party` (epic) ← genereras när `internal-data-gathering.bpmn` processas
4. `household` (Feature Goal) ← genereras när `application.bpmn` processas
5. `Confirm application` (epic) ← genereras när `application.bpmn` processas

**Med topologisk fil-sortering:**
1. `mortgage-se-internal-data-gathering.bpmn` (subprocess)
   - `Fetch party information` (epic) ✅
   - `Pre-screen party` (epic) ✅
2. `mortgage-se-application.bpmn` (parent)
   - `internal-data-gathering` (Feature Goal) ✅ (epics finns redan)
   - `household` (Feature Goal) ✅
   - `Confirm application` (epic) ✅

**Med orderIndex-sortering inom fil:**
- Noder i `application.bpmn` sorteras efter orderIndex:
  1. `internal-data-gathering` (orderIndex: 1)
  2. `household` (orderIndex: 4)
  3. `Confirm application` (orderIndex: 5)

**Med node type-sortering:**
- Om två noder har samma orderIndex, sorteras de efter node type:
  - Tasks/epics (typeOrder: 1) före callActivities (typeOrder: 2)

---

## Slutsats

**Nuvarande implementation:**
- ✅ Fil-sortering är korrekt (topologisk)
- ❌ Node-sortering använder depth som primär sortering (borde vara orderIndex)
- ❌ Leaf nodes (epics) genereras inte alltid före Feature Goals
- ❌ Child documentation samlas inte från subprocess-filen

**Önskad implementation:**
- ✅ Fil-sortering: Topologisk (behålls)
- ✅ Node-sortering: OrderIndex → VisualOrderIndex → Node type → Depth
- ✅ Leaf nodes före Feature Goals: Säkerställs av node type-sortering
- ✅ Child documentation från subprocess: Samlas från `graph.fileNodes.get(subprocessFile)`

