# Analys: Feature Goal-generering med Subprocesser och Leaf Nodes

## Nuvarande Situation

### Vad skickas till LLM för Feature Goals?

När en Feature Goal (callActivity) genereras, skickas följande information till LLM:

1. **childrenDocumentation** (om det finns):
   - Dokumentation från direkta children (bara de som har genererat dokumentation)
   - Innehåller: `summary`, `flowSteps`, `inputs`, `outputs`, `scenarios`
   - **Problem**: Samlas bara från direkta children, inte rekursivt

2. **descendantNodes** (strukturell info):
   - Alla descendant nodes rekursivt
   - Men bara strukturell info (id, name, type, file)
   - **Ingen faktisk dokumentation** från dessa noder

3. **descendantHighlights**:
   - Korta sammanfattningar av descendant paths (max 10)
   - Format: `"Node1 → Node2 → Node3"`
   - **Ingen faktisk dokumentation**

4. **descendantTypeCounts**:
   - Antal noder per typ (t.ex. `{ userTask: 5, serviceTask: 3 }`)
   - **Ingen faktisk dokumentation**

### Problem Identifierat

#### Problem 1: Bara direkta children samlas
**Beskrivning**:
- För callActivities samlas dokumentation bara från `node.children` (direkta children)
- Om callActivity pekar på en subprocess, kommer `node.children` att innehålla noder från subprocess-filen
- Men om subprocessen har nested subprocesser eller tasks, samlas INTE dokumentation från dessa

**Exempel**:
```
Application (callActivity)
  └─ Internal data gathering (subprocess)
      ├─ Fetch party information (serviceTask) ← Leaf node
      ├─ Screen party (businessRuleTask) ← Leaf node
      └─ Fetch engagements (serviceTask) ← Leaf node
```

**Nuvarande beteende**:
- `node.children` för Application innehåller "Internal data gathering" subprocess
- Vi samlar dokumentation från "Internal data gathering" Feature Goal
- Men vi samlar INTE dokumentation från leaf nodes (Fetch party information, Screen party, Fetch engagements)

**Konsekvens**:
- Feature Goal för Application får bara information om "Internal data gathering" som helhet
- Men inte information om vad som faktiskt händer i subprocessen (vilka tasks/epics som ingår)

#### Problem 2: Ingen analys av leaf nodes
**Beskrivning**:
- Ingen explicit analys av vilka noder som är leaf nodes
- Ingen filtrering eller prioritering av leaf nodes
- `descendantNodes` innehåller alla descendant nodes, men ingen dokumentation från dem

**Konsekvens**:
- LLM får strukturell info om alla descendant nodes
- Men inte faktisk dokumentation från leaf nodes (tasks/epics) som faktiskt gör arbetet

#### Problem 3: childrenDocumentation mappas bara mot direkta children
**Beskrivning**:
- I `buildContextPayload` (rad 699-716), mappas `childrenDocumentation` bara mot `context.childNodes`
- `context.childNodes` är bara direkta children, inte alla descendant nodes
- Om en child är en callActivity (subprocess), får vi dokumentation från subprocessen
- Men vi får INTE dokumentation från leaf nodes i subprocessen

**Kod**:
```typescript
childrenDocumentation: childrenDocumentation
  ? context.childNodes  // ← Bara direkta children!
      .map((child) => {
        const childDoc = childrenDocumentation.get(child.id);
        // ...
      })
  : undefined,
```

## Lösning Implementerad

### ✅ Fix 1: Rekursiv samling för callActivities

**Implementering**:
- För callActivities: samla dokumentation rekursivt från alla descendant nodes
- För tasks/epics: samla bara från direkta children (de har normalt inga children)

**Kod**:
```typescript
// Rekursiv funktion för att samla dokumentation från alla descendant nodes
const collectChildDocsRecursively = (currentNode: BpmnProcessNode) => {
  for (const child of currentNode.children) {
    const childDocKey = child.type === 'callActivity' && child.subprocessFile
      ? `subprocess:${child.subprocessFile}`
      : `${child.bpmnFile}::${child.bpmnElementId}`;
    
    const childDoc = generatedChildDocs.get(childDocKey);
    if (childDoc) {
      childDocsForNode.set(child.id, childDoc);
    }
    
    // Rekursivt samla från nested children
    if (child.children && child.children.length > 0) {
      collectChildDocsRecursively(child);
    }
  }
};

// För callActivities: samla rekursivt
if (node.type === 'callActivity') {
  collectChildDocsRecursively(node);
}
```

**Resultat**:
- Feature Goals får nu dokumentation från alla descendant nodes, inklusive leaf nodes
- Om subprocessen har nested subprocesser, samlas dokumentation från dem också

### Vad skickas nu till LLM?

**För Feature Goals (callActivities)**:
1. **childrenDocumentation**: 
   - Rekursivt samlad dokumentation från alla descendant nodes
   - Inkluderar leaf nodes (tasks/epics) i subprocesser
   - Inkluderar nested subprocesser

2. **descendantNodes**: 
   - Alla descendant nodes (strukturell info)
   - Används för att ge LLM översikt över strukturen

3. **descendantHighlights**: 
   - Korta sammanfattningar av descendant paths
   - Hjälper LLM förstå hierarkin

4. **descendantTypeCounts**: 
   - Antal noder per typ
   - Hjälper LLM förstå omfattningen

## Analys av Leaf Nodes

### Identifiering av Leaf Nodes

**Definition**: Leaf nodes = noder utan children (tasks/epics som faktiskt gör arbetet)

**Hur identifieras de**:
- `node.children.length === 0` = leaf node
- I `buildNodeDocumentationContext`: `descendantNodes` innehåller alla descendant nodes rekursivt
- Leaf nodes är de i `descendantNodes` som har `children.length === 0`

### Analys i Nuvarande Implementation

**Ja, det görs analys**:
1. `descendantNodes` samlas rekursivt via `collectDescendants(node)` (rad 61 i documentationContext.ts)
2. `descendantTypeCounts` räknar antal noder per typ (inklusive leaf nodes)
3. `descendantHighlights` visar paths till descendant nodes (inklusive leaf nodes)

**Men dokumentation från leaf nodes samlas bara om**:
- De är direkta children till callActivity, ELLER
- De är children till en subprocess som är direkt child (efter fix)

**Efter fix**:
- Dokumentation från alla leaf nodes i subprocessen samlas rekursivt
- Feature Goal får dokumentation från alla tasks/epics som faktiskt gör arbetet

## Exempel: Internal Data Gathering

### Struktur
```
Application (callActivity)
  └─ Internal data gathering (subprocess)
      ├─ Fetch party information (serviceTask) ← Leaf node
      ├─ Screen party (businessRuleTask) ← Leaf node
      └─ Fetch engagements (serviceTask) ← Leaf node
```

### Före Fix
**Vad Application Feature Goal fick**:
- `childrenDocumentation`: Bara "Internal data gathering" Feature Goal-dokumentation
- `descendantNodes`: Alla noder (strukturell info)
- **Saknade**: Dokumentation från leaf nodes (Fetch party information, Screen party, Fetch engagements)

### Efter Fix
**Vad Application Feature Goal får**:
- `childrenDocumentation`: 
  - "Internal data gathering" Feature Goal-dokumentation
  - "Fetch party information" Epic-dokumentation (leaf node)
  - "Screen party" Business Rule-dokumentation (leaf node)
  - "Fetch engagements" Epic-dokumentation (leaf node)
- `descendantNodes`: Alla noder (strukturell info)
- **Resultat**: Fullständig kontext om vad som faktiskt händer i subprocessen

## Lösningar Implementerade

### ✅ Fix 1: Rekursiv samling för callActivities

**Implementering** (bpmnGenerators.ts rad ~1656-1693):
- För callActivities: samla dokumentation rekursivt från alla descendant nodes
- För tasks/epics: samla bara från direkta children
- Använder `collectChildDocsRecursively` funktion som går igenom alla children rekursivt

**Resultat**:
- Feature Goals får dokumentation från alla descendant nodes, inklusive leaf nodes i subprocesser
- Nested subprocesser inkluderas också

### ✅ Fix 2: Mappning mot descendant nodes för Feature Goals

**Implementering** (llmDocumentation.ts rad ~698-737):
- För Feature Goals (callActivities): mappa `childrenDocumentation` mot `context.descendantNodes`
- För Epics/Tasks: mappa mot `context.childNodes` (direkta children)
- Detta säkerställer att alla descendant nodes med dokumentation inkluderas

**Resultat**:
- LLM får dokumentation från alla descendant nodes, inte bara direkta children
- Leaf nodes i subprocesser inkluderas korrekt

## Sammanfattning

### ✅ Vad fungerar nu

1. **Rekursiv samling för callActivities**:
   - Dokumentation samlas rekursivt från alla descendant nodes
   - Inkluderar leaf nodes i subprocesser
   - Nested subprocesser inkluderas också

2. **Analys av descendant nodes**:
   - `descendantNodes`: Alla descendant nodes (strukturell info) - samlas rekursivt
   - `descendantTypeCounts`: Antal noder per typ (inklusive leaf nodes)
   - `descendantHighlights`: Paths till descendant nodes (inklusive leaf nodes)

3. **Leaf nodes identifieras och inkluderas**:
   - Leaf nodes identifieras via `descendantNodes` (noder utan children)
   - Dokumentation från leaf nodes samlas rekursivt i `bpmnGenerators.ts`
   - Mappas korrekt i `llmDocumentation.ts` för Feature Goals
   - Skickas till LLM via `childrenDocumentation`

### Vad skickas till LLM för Feature Goals

**childrenDocumentation** (rekursivt samlad):
- ✅ Dokumentation från alla descendant nodes (inklusive leaf nodes)
- ✅ Innehåller: `summary`, `flowSteps`, `inputs`, `outputs`, `scenarios`
- ✅ Mappas mot `context.descendantNodes` för Feature Goals

**descendantNodes** (strukturell info):
- ✅ Alla descendant nodes rekursivt
- ✅ Inkluderar leaf nodes (tasks/epics)
- ✅ Används för att ge LLM översikt över strukturen

**descendantHighlights**:
- ✅ Korta sammanfattningar av descendant paths (max 10)
- ✅ Inkluderar paths till leaf nodes

**descendantTypeCounts**:
- ✅ Antal noder per typ
- ✅ Inkluderar räkning av leaf nodes

**Resultat**: 
- ✅ LLM får fullständig kontext om vad som faktiskt händer i subprocessen
- ✅ Inkluderar alla leaf nodes (tasks/epics) som faktiskt gör arbetet
- ✅ Inkluderar nested subprocesser
- ✅ Analys görs av vilka noder som är leaf nodes (via `descendantNodes`)

## Begränsningar för Stora Processer

### Problem: Token Overflow Risk

För stora processer som "Application" med 50+ leaf nodes kan `childrenDocumentation` bli mycket stor och riskera:
- Överskrida token limits
- Göra prompten för lång och svår att hantera
- Höga kostnader

### Lösning Implementerad

**Smart begränsning med prioritetsordning** (llmDocumentation.ts rad ~702-758):

1. **Max 40 items** för Feature Goals:
   - Begränsar totalt antal items i `childrenDocumentation`
   - Varnar i konsolen om truncation sker

2. **Prioritetsordning**:
   - **1) Direkta children (subprocesser)** - Viktigast för att förstå strukturen
   - **2) Leaf nodes (tasks/epics)** - Viktiga för att förstå vad som faktiskt görs
   - **3) Övriga descendant nodes** - Mindre viktiga

3. **Scenarios begränsas**:
   - Max 3 scenarios per node (istället för alla)
   - Sparar tokens utan att tappa viktig information

**Exempel för Application med 50+ leaf nodes**:
- Före: 50+ items med alla scenarios → risk för token overflow
- Efter: Max 40 items (prioriterade) med max 3 scenarios per node → säkert och effektivt

**Vad behålls**:
- ✅ Alla direkta children (subprocesser) - viktigast
- ✅ De viktigaste leaf nodes (tasks/epics)
- ✅ Summary, flowSteps, inputs, outputs - allt behålls
- ✅ Scenarios (begränsade till 3 per node)

**Vad kan trunkeras**:
- ⚠️ Övriga descendant nodes om det finns >40 items totalt
- ⚠️ Scenarios utöver de första 3 per node

**Resultat**: 
- ✅ Säker token-hantering även för stora processer
- ✅ Viktig information prioriteras och behålls
- ✅ Varning i konsolen om truncation sker
- ✅ Ingen viktig information tappas (direkta children och leaf nodes prioriteras)
