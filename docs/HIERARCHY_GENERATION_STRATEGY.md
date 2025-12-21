# Strategi: Hierarkisk Dokumentationsgenerering

## Nuvarande Situation

### Ordning för Dokumentationsgenerering

**Nuvarande approach:**
- Loopar genom `testableNodes` filtrerade per fil (`nodesInFile`)
- **INGEN sortering efter hierarki eller depth**
- Genererar dokumentation för alla noder i fil-ordning
- Ingen garanti att child nodes genereras före parent nodes

**Vad skickas till Claude:**
- ✅ `childNodes`: Lista med child node namn/typ/id
- ✅ `descendantNodes`: Alla descendant nodes
- ✅ `descendantHighlights`: Korta sammanfattningar av descendant paths
- ✅ `descendantTypeCounts`: Antal noder per typ
- ❌ **INGEN faktisk dokumentation från child nodes** (bara strukturell info)

### Problem

1. **Feature Goals genereras utan kunskap om child epics:**
   - Claude ser bara att det finns child nodes med namn/typ
   - Men Claude vet inte vad dessa epics faktiskt gör (summary, flowSteps, etc.)
   - Detta gör det svårt för Claude att skriva bra Feature Goal-dokumentation

2. **Ingen garanti på ordning:**
   - Om en Feature Goal genereras före sina child epics, saknas kontext
   - Om child epics genereras först, kan deras information användas för Feature Goal

3. **För testscenarion:**
   - Du nämnde att det var bäst att börja från botten och jobba uppåt
   - Detta gäller också för dokumentation - Feature Goals behöver veta vad epics gör

---

## Förbättringsförslag

### 1. Sortera Noder efter Depth (Leaf Nodes Först)

**Strategi:**
- Sortera `testableNodes` efter depth (högst depth = leaf nodes först)
- Generera dokumentation för leaf nodes först
- Sedan generera för parent nodes med kunskap om child nodes

**Implementation:**
```typescript
// Sortera noder efter depth (högst depth = leaf nodes först)
const sortedNodes = [...testableNodes].sort((a, b) => {
  const depthA = calculateNodeDepth(graph, a.id);
  const depthB = calculateNodeDepth(graph, b.id);
  return depthB - depthA; // Högre depth först (leaf nodes)
});
```

**Fördelar:**
- Leaf nodes genereras först
- Parent nodes kan använda information från child nodes
- Bättre kontext för Feature Goals

### 2. Inkludera Child Node Dokumentation i Parent Node Prompts

**Strategi:**
- När en Feature Goal genereras, inkludera summaries från child epics
- När en Epic genereras, inkludera summaries från child tasks (om relevant)

**Implementation:**
```typescript
// När vi genererar Feature Goal, samla summaries från child epics
const childEpicSummaries = childEpics
  .filter(epic => generatedDocs.has(epic.id))
  .map(epic => ({
    id: epic.bpmnElementId,
    name: epic.name,
    summary: generatedDocs.get(epic.id)?.summary, // Från genererad dokumentation
    flowSteps: generatedDocs.get(epic.id)?.flowSteps,
  }));

// Lägg till i currentNodeContext
currentNodeContext.childrenDocumentation = childEpicSummaries;
```

**Vad ska inkluderas:**
- **För Feature Goals:**
  - Child epics: `summary`, `flowSteps`, `inputs`, `outputs`
  - Detta hjälper Claude att skriva bättre Feature Goal-dokumentation
  
- **För Epics:**
  - Child tasks: `summary`, `flowSteps` (om Epic har child tasks)
  - Detta är mindre kritiskt eftersom Epics ofta är leaf nodes

**Fördelar:**
- Claude får faktisk kontext om vad child nodes gör
- Bättre Feature Goal-dokumentation (summary, effectGoals, epics-lista)
- Mer realistiska flowSteps och dependencies

### 3. Två-Pass Generering (Rekommenderat)

**Pass 1: Generera Leaf Nodes**
- Sortera noder efter depth (högst depth först)
- Generera dokumentation för alla leaf nodes
- Spara genererad dokumentation i en Map

**Pass 2: Generera Parent Nodes**
- Sortera noder efter depth (lägst depth först)
- För varje parent node:
  - Hämta genererad dokumentation från child nodes
  - Inkludera i prompt
  - Generera parent node dokumentation

**Implementation:**
```typescript
// Pass 1: Leaf nodes först
const leafNodes = sortedNodes.filter(node => isLeafNode(node));
for (const node of leafNodes) {
  const doc = await generateDocumentation(node);
  generatedDocs.set(node.id, doc);
}

// Pass 2: Parent nodes med child node info
const parentNodes = sortedNodes.filter(node => !isLeafNode(node));
for (const node of parentNodes) {
  const childDocs = node.children
    .map(child => generatedDocs.get(child.id))
    .filter(Boolean);
  
  const context = buildContextPayload(node, { childDocumentation: childDocs });
  const doc = await generateDocumentation(node, context);
  generatedDocs.set(node.id, doc);
}
```

---

## Jämförelse: Nuvarande vs Förbättrad

### Nuvarande Approach

**Ordning:**
- Ingen garanti - noder genereras i fil-ordning
- Feature Goal kan genereras före child epics

**Kontext till Claude:**
- Child nodes: bara namn/typ/id
- Ingen faktisk dokumentation från child nodes

**Resultat:**
- Feature Goals kan sakna detaljer om vad epics gör
- FlowSteps kan vara generiska

### Förbättrad Approach (Två-Pass)

**Ordning:**
- Pass 1: Leaf nodes först (epics, tasks)
- Pass 2: Parent nodes (Feature Goals) med child node info

**Kontext till Claude:**
- Child nodes: namn/typ/id + **summary, flowSteps, inputs, outputs**
- Faktisk dokumentation från child nodes

**Resultat:**
- Feature Goals har detaljerad kunskap om vad epics gör
- FlowSteps är mer realistiska
- Epics-listan i Feature Goals är mer informativ

---

## Implementeringsplan

### Steg 1: Sortera Noder efter Depth

```typescript
function calculateNodeDepth(graph: BpmnProcessGraph, nodeId: string): number {
  const node = graph.allNodes.get(nodeId);
  if (!node) return 0;
  
  let depth = 0;
  let current = node;
  while (current.parent) {
    depth++;
    current = current.parent;
  }
  return depth;
}

function sortNodesByDepth(nodes: BpmnProcessNode[]): BpmnProcessNode[] {
  return [...nodes].sort((a, b) => {
    const depthA = calculateNodeDepth(graph, a.id);
    const depthB = calculateNodeDepth(graph, b.id);
    return depthB - depthA; // Högre depth först (leaf nodes)
  });
}
```

### Steg 2: Två-Pass Generering

```typescript
// Pass 1: Leaf nodes
const leafNodes = sortedNodes.filter(node => node.children.length === 0);
const generatedDocs = new Map<string, { summary: string; flowSteps: string[]; ... }>();

for (const node of leafNodes) {
  const doc = await generateDocumentationWithLlm(...);
  if (doc?.docJson) {
    generatedDocs.set(node.id, extractKeyInfo(doc.docJson));
  }
}

// Pass 2: Parent nodes med child node info
const parentNodes = sortedNodes.filter(node => node.children.length > 0);
for (const node of parentNodes) {
  const childDocs = node.children
    .map(child => generatedDocs.get(child.id))
    .filter(Boolean);
  
  // Bygg context med child node dokumentation
  const context = buildContextPayload(node, links);
  context.currentNodeContext.childrenDocumentation = childDocs;
  
  const doc = await generateDocumentationWithLlm(...);
}
```

### Steg 3: Uppdatera Prompts

Uppdatera Feature Goal-prompten för att använda `childrenDocumentation`:
- "Använd information från child epics för att skriva Feature Goal-dokumentation"
- "Child epics summaries hjälper dig att förstå vad Feature Goalet faktiskt gör"

---

## Förväntade Förbättringar

### Feature Goals

**Före:**
- Generiska summaries
- FlowSteps baserade på gissningar
- Epics-lista med bara namn

**Efter:**
- Detaljerade summaries baserade på vad epics faktiskt gör
- Realistiska flowSteps som reflekterar child epics
- Informativ epics-lista med summaries från child epics

### Testscenarion

**Före:**
- Generiska scenarion
- Mindre kontext om vad som faktiskt händer

**Efter:**
- Mer realistiska scenarion baserade på child node dokumentation
- Bättre kontext om vad som händer i varje steg

---

## Rekommendation

**Implementera Två-Pass Generering:**

1. ✅ Sortera noder efter depth (leaf nodes först)
2. ✅ Generera leaf nodes i Pass 1
3. ✅ Spara key information från genererad dokumentation
4. ✅ Generera parent nodes i Pass 2 med child node info
5. ✅ Uppdatera prompts för att använda child node dokumentation

**Detta kommer förbättra:**
- Feature Goal-dokumentation (mer detaljerad och realistisk)
- Testscenarion (mer kontextuella)
- Överensstämmelse mellan parent och child nodes







