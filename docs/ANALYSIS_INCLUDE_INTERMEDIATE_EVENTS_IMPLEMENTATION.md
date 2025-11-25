# Analys: Implementation av Steg 2 - Inkludera Intermediate Events i Sequence Flow-grafen

## Kritiskt: Inga Fallback-lösningar eller Dupliceringar

**Princip:** Alla ändringar måste använda samma funktioner och logik som redan finns. Inga fallback-lösningar, inga duplicerade funktioner, inga tester med annan logik.

## Nuvarande Situation

### Problem 1: ID-mismatch mellan Sequence Flows och Node IDs

**Sequence flows från parseResult använder element IDs:**
- `sourceRef: "Event_111bwbu"` (intermediate event element ID)
- `targetRef: "offer"` (call activity element ID)

**ProcessGraphNode använder sammansatta IDs:**
- `id: "callActivity:mortgage.bpmn:offer"` (format: `type:fileName:elementId`)
- `bpmnElementId: "offer"` (element ID)

**I `buildSequenceEdgesForFile()` (rad 328-336):**
- Sequence flows från `parseResult.sequenceFlows` använder element IDs
- Men edges skapas med ProcessGraphNode IDs: `from: sourceNode.id, to: targetNode.id`
- **Problem:** Om `sourceNode` eller `targetNode` saknas (t.ex. intermediate event), skapas ingen edge

**I `assignLocalOrderForFile()` (rad 407-413):**
- Edges konverteras tillbaka till sequence flows: `sourceRef: e.from, targetRef: e.to`
- Men `e.from` och `e.to` är ProcessGraphNode IDs, inte element IDs
- **Problem:** Sequence flows får ProcessGraphNode IDs istället för element IDs

**I `calculateOrderFromSequenceFlows()` (rad 22-25):**
- Tar `sequenceFlows` med `sourceRef`/`targetRef` (nu ProcessGraphNode IDs)
- Tar `nodeIds` (ProcessGraphNode IDs)
- **Problem:** Om sequence flows går via intermediate events som inte finns i `nodeIds`, ignoreras de

### Problem 2: Sequence Flows via Intermediate Events Filtreras Bort

**I `buildSequenceEdgesForFile()` (rad 336):**
```typescript
if (!sourceNode || !targetNode) continue;  // ← Filtrerar bort flows via intermediate events
```

**Exempel:**
- `Event_111bwbu → offer` (intermediate event → call activity)
- `Event_111bwbu` finns inte i `nodes` (bara call activities/tasks skapas)
- Edge skapas inte
- Sequence flow ignoreras

### Problem 3: Intermediate Events Saknas i ProcessGraphNode

**I `buildNodes()` (rad 125-208):**
- Skapar bara noder för: `process`, `callActivity`, `userTask`, `serviceTask`, `businessRuleTask`
- Intermediate events och gateways skapas INTE

**Resultat:** Intermediate events finns i `parseResult.elements` men skapas inte som `ProcessGraphNode`.

## Vad Som Behöver Göras

### Steg 1: Använd Original Sequence Flows (Element IDs) Direkt

**Nuvarande flöde:**
1. `parseResult.sequenceFlows` (element IDs) → `buildSequenceEdgesForFile()` → `edges` (ProcessGraphNode IDs)
2. `edges` → `assignLocalOrderForFile()` → `sequenceFlows` (ProcessGraphNode IDs)
3. `sequenceFlows` → `calculateOrderFromSequenceFlows()` → `orderMap`

**Nytt flöde:**
1. `parseResult.sequenceFlows` (element IDs) → använd direkt i `calculateOrderFromSequenceFlows()`
2. Skapa mapping: element ID → ProcessGraphNode ID
3. Mappa resultatet tillbaka till ProcessGraphNode IDs

**Ändring i `assignLocalOrderForFile()`:**
```typescript
function assignLocalOrderForFile(
  fileName: string,
  nodes: ProcessGraphNode[],
  edges: ProcessGraphEdge[],
  parseResult: BpmnParseResult,  // ← Lägg till denna parameter
): Map<string, OrderInfo> {
  // Använd parseResult.sequenceFlows direkt (inkluderar alla flows, även via intermediate events)
  const sequenceFlows = parseResult.sequenceFlows || [];
  
  // Skapa mapping: element ID → ProcessGraphNode ID
  const elementIdToNodeIdMap = new Map<string, string>();
  nodes.forEach((node) => {
    if (node.bpmnElementId) {
      elementIdToNodeIdMap.set(node.bpmnElementId, node.id);
    }
  });
  
  // Anropa calculateOrderFromSequenceFlows med element IDs
  const nodeIds = nodes.map((n) => n.id);
  const orderMap = calculateOrderFromSequenceFlows(
    sequenceFlows,  // ← Använd element IDs direkt
    nodeIds,
    elementIdToNodeIdMap,  // ← Skicka mapping
  );
  
  // Mappa resultatet tillbaka till ProcessGraphNode IDs
  const nodeOrderMap = new Map<string, OrderInfo>();
  orderMap.forEach((info, key) => {
    // Om key är element ID, hitta motsvarande ProcessGraphNode ID
    const nodeId = elementIdToNodeIdMap.get(key) || key;
    nodeOrderMap.set(nodeId, info);
  });
  
  return nodeOrderMap;
}
```

### Steg 2: Utöka `calculateOrderFromSequenceFlows()` att Inkludera Alla Element IDs

**Nuvarande logik (rad 36-43):**
```typescript
nodeIds.forEach((nodeId) => {
  if (!sequenceRelevant.has(nodeId)) {
    return;  // ← Hoppar över noder som inte finns i nodeIds
  }
  adjacency.set(nodeId, []);
  incoming.set(nodeId, 0);
});
```

**Ny logik:**
```typescript
// Steg 1: Inkludera alla element IDs från sequence flows
const allSequenceElementIds = new Set<string>();
sequenceFlows.forEach((flow) => {
  allSequenceElementIds.add(flow.sourceRef);
  allSequenceElementIds.add(flow.targetRef);
});

// Steg 2: Inkludera alla element IDs i grafen (även intermediate events/gateways)
allSequenceElementIds.forEach((elementId) => {
  if (!adjacency.has(elementId)) {
    adjacency.set(elementId, []);
    incoming.set(elementId, 0);
  }
});

// Steg 3: Också inkludera ProcessGraphNode IDs (för direkt koppling)
nodeIds.forEach((nodeId) => {
  // Om nodeId är redan ett element ID, hoppa över (redan inkluderat)
  if (allSequenceElementIds.has(nodeId)) {
    return;
  }
  
  // Om nodeId är ProcessGraphNode ID, hitta motsvarande element ID
  const elementId = elementIdToNodeIdMap?.get(nodeId) 
    ? Array.from(elementIdToNodeIdMap.entries()).find(([_, nId]) => nId === nodeId)?.[0]
    : null;
  
  if (elementId && allSequenceElementIds.has(elementId)) {
    // Element ID redan inkluderat, hoppa över
    return;
  }
  
  // Om nodeId inte är element ID och inte finns i sequence flows, hoppa över
  if (!sequenceRelevant.has(nodeId)) {
    return;
  }
  
  adjacency.set(nodeId, []);
  incoming.set(nodeId, 0);
});
```

### Steg 3: Bygg Adjacency från Sequence Flows (Använd Element IDs)

**Nuvarande logik (rad 45-52):**
```typescript
for (const flow of sequenceFlows) {
  if (!adjacency.has(flow.sourceRef) || !adjacency.has(flow.targetRef)) {
    continue;  // ← Hoppar över om noder saknas
  }
  adjacency.get(flow.sourceRef)!.push(flow.targetRef);
  incoming.set(flow.targetRef, (incoming.get(flow.targetRef) ?? 0) + 1);
}
```

**Ny logik:** Samma, men nu inkluderar vi alla element IDs från sequence flows, så detta kommer fungera.

### Steg 4: Propagera orderIndex från Intermediate Events till Call Activities

**Efter DFS i `calculateOrderFromSequenceFlows()`:**
```typescript
// Propagera orderIndex från intermediate events till call activities
if (elementIdToNodeIdMap) {
  // För varje ProcessGraphNode ID som saknar orderIndex
  nodeIds.forEach((nodeId) => {
    if (orderMap.has(nodeId)) {
      // Redan har orderIndex, hoppa över
      return;
    }
    
    // Hitta motsvarande element ID
    const elementId = Array.from(elementIdToNodeIdMap.entries())
      .find(([_, nId]) => nId === nodeId)?.[0];
    
    if (!elementId) return;
    
    // Om element ID har orderIndex (från intermediate event), använd det
    if (orderMap.has(elementId)) {
      const elementOrderInfo = orderMap.get(elementId)!;
      orderMap.set(nodeId, elementOrderInfo);
      return;
    }
    
    // Annars, hitta inkommande sequence flows till element ID
    const incomingFlows = sequenceFlows.filter((f) => f.targetRef === elementId);
    for (const flow of incomingFlows) {
      const sourceOrderInfo = orderMap.get(flow.sourceRef);
      if (sourceOrderInfo) {
        // Propagera orderIndex med liten offset
        orderMap.set(nodeId, {
          orderIndex: sourceOrderInfo.orderIndex + 0.1,
          branchId: sourceOrderInfo.branchId,
          scenarioPath: sourceOrderInfo.scenarioPath,
        });
        break;
      }
    }
  });
}
```

### Steg 5: Uppdatera Signatur på `calculateOrderFromSequenceFlows()`

**Nuvarande:**
```typescript
export function calculateOrderFromSequenceFlows(
  sequenceFlows: BpmnSequenceFlow[],
  nodeIds: string[],
): Map<string, OrderInfo>
```

**Ny:**
```typescript
export function calculateOrderFromSequenceFlows(
  sequenceFlows: BpmnSequenceFlow[],
  nodeIds: string[],
  elementIdToNodeIdMap?: Map<string, string>,  // ← Optional mapping
): Map<string, OrderInfo>  // Returns OrderInfo keyed by both element IDs and node IDs
```

## Implementation Plan

### Ändring 1: Utöka `calculateOrderFromSequenceFlows()` Signatur

**Fil:** `src/lib/bpmn/sequenceOrderHelpers.ts`

**Ändringar:**
1. Lägg till optional parameter `elementIdToNodeIdMap?: Map<string, string>`
2. Inkludera alla element IDs från sequence flows i grafen
3. Propagera orderIndex från intermediate events till call activities
4. Returnera OrderInfo keyed by både element IDs och ProcessGraphNode IDs

### Ändring 2: Uppdatera `assignLocalOrderForFile()` att Använda parseResult

**Fil:** `src/lib/bpmn/processGraphBuilder.ts`

**Ändringar:**
1. Lägg till parameter `parseResult: BpmnParseResult`
2. Använd `parseResult.sequenceFlows` direkt (istället för att konvertera från edges)
3. Skapa mapping element ID → ProcessGraphNode ID
4. Skicka mapping till `calculateOrderFromSequenceFlows()`
5. Mappa resultatet tillbaka till ProcessGraphNode IDs

### Ändring 3: Uppdatera Anrop till `assignLocalOrderForFile()`

**Fil:** `src/lib/bpmn/processGraphBuilder.ts` (rad 534)

**Ändring:**
```typescript
const parseResult = parseResults.get(fileName);
if (!parseResult) return;

const orderMap = assignLocalOrderForFile(fileName, nodesInFile, fileEdges, parseResult);
```

### Ändring 4: Uppdatera `assignExecutionOrder()` i `bpmnProcessGraph.ts`

**Fil:** `src/lib/bpmnProcessGraph.ts`

**Ändringar:**
1. Skapa mapping element ID → BpmnProcessNode (via bpmnElementId)
2. Använd `parseResult.sequenceFlows` direkt
3. Skicka mapping till `calculateOrderFromSequenceFlows()`
4. Mappa resultatet tillbaka till BpmnProcessNode

### Ändring 5: Uppdatera `assignExecutionOrderFromSequenceFlows()` i `buildProcessModel.ts`

**Fil:** `src/lib/bpmn/buildProcessModel.ts`

**Ändringar:**
1. Skapa mapping element ID → ProcessNodeModel (via bpmnElementId)
2. Använd `parseResult.sequenceFlows` direkt
3. Skicka mapping till `calculateOrderFromSequenceFlows()`
4. Mappa resultatet tillbaka till ProcessNodeModel

## Identifierade Fallback-lösningar och Dupliceringar

### Nuvarande Fallback-lösningar (INTE ändra i Steg 2)

**1. `visualOrderIndex` tilldelas när `orderIndex` saknas:**
- **Plats:** `processGraphBuilder.ts` (rad 546-591), `bpmnProcessGraph.ts` (rad 309-323), `buildProcessModel.ts` (rad 471-484)
- **Logik:** Om en nod saknar `orderIndex`, beräkna `visualOrderIndex` från DI-koordinater
- **Status:** Detta är INTE en fallback i sorteringslogiken, utan en del av metadata-tilldelningen
- **Åtgärd:** Behåll som det är - detta är korrekt beteende för noder utan sequence flow-koppling

**2. `sortCallActivities()` prioritet:**
- **Plats:** `ganttDataConverter.ts` (rad 66-88)
- **Prioritet:** `visualOrderIndex` → `orderIndex` → `branchId` → `label`
- **Status:** Detta är INTE en fallback, utan en explicit prioritetsordning
- **Åtgärd:** Behåll som det är - detta är korrekt sorteringslogik

### Nuvarande Dupliceringar (INTE ändra i Steg 2)

**1. `sortCallActivities()` vs `sortByOrderIndex()`:**
- **`sortCallActivities()`:** `ganttDataConverter.ts` - används av appen och alla tester
- **`sortByOrderIndex()`:** `processTreeBuilder.ts` - används internt i tree building
- **Status:** Båda har samma prioritet (`visualOrderIndex` → `orderIndex` → `label`)
- **Åtgärd:** Behåll som det är - `sortByOrderIndex()` är en intern helper, `sortCallActivities()` är den gemensamma funktionen

**2. `calculateOrderFromSequenceFlows()` används överallt:**
- **Plats:** `sequenceOrderHelpers.ts` - används av alla pipelines
- **Status:** ✅ INGEN duplicering - alla använder samma funktion
- **Åtgärd:** Behåll som det är

**3. `calculateVisualOrderFromCoordinates()` används överallt:**
- **Plats:** `sequenceOrderHelpers.ts` - används av alla pipelines
- **Status:** ✅ INGEN duplicering - alla använder samma funktion
- **Åtgärd:** Behåll som det är

### Tester (INGA dupliceringar)

**Alla tester använder `sortCallActivities()`:**
- ✅ `mortgage.order-validation.test.ts` - använder `sortCallActivities()`
- ✅ `mortgage.tree-hierarchy.test.ts` - använder `sortCallActivities()`
- ✅ `mortgage.order-debug.test.ts` - använder `sortCallActivities()`
- **Status:** ✅ INGA tester har egen sorteringslogik
- **Åtgärd:** Behåll som det är

## Kritiska Punkter för Implementation

### 1. INGA Fallback-lösningar i Steg 2

**Princip:** När vi implementerar Steg 2, ska vi INTE introducera fallback-lösningar.

**Vad som INTE är en fallback:**
- ✅ Optional parameter `elementIdToNodeIdMap` - detta är en feature, inte en fallback
- ✅ Mapping element ID → ProcessGraphNode ID - detta är nödvändigt för implementationen
- ✅ Propagering av `orderIndex` - detta är en del av lösningen, inte en fallback

**Vad som SKULLE vara en fallback (VIKTIGT - INTE GÖRA):**
- ❌ Om `elementIdToNodeIdMap` saknas, använd `visualOrderIndex` istället
- ❌ Om propagering misslyckas, använd `visualOrderIndex` istället
- ❌ Om intermediate events saknas, hoppa över och använd `visualOrderIndex`

**Implementation-regel:**
- Om `elementIdToNodeIdMap` saknas, använd nuvarande logik (bakåtkompatibilitet)
- Om `elementIdToNodeIdMap` finns, använd ny logik med intermediate events
- Om propagering misslyckas, returnera tom map (låt problemet synas, inte dölj det)

### 2. INGA Duplicerade Funktionslogik

**Princip:** Alla ändringar måste använda samma funktioner som redan finns.

**Vad som är OK:**
- ✅ Utöka `calculateOrderFromSequenceFlows()` med ny parameter
- ✅ Använda `calculateOrderFromSequenceFlows()` från `sequenceOrderHelpers.ts`
- ✅ Använda `calculateVisualOrderFromCoordinates()` från `sequenceOrderHelpers.ts`
- ✅ Använda `sortCallActivities()` från `ganttDataConverter.ts`

**Vad som INTE är OK:**
- ❌ Skapa ny funktion `calculateOrderFromSequenceFlowsWithIntermediateEvents()`
- ❌ Duplicera logiken i `calculateOrderFromSequenceFlows()`
- ❌ Skapa ny sorteringsfunktion

### 3. INGA Tester med Annan Logik

**Princip:** Alla tester måste använda samma funktioner som appen.

**Vad som är OK:**
- ✅ Tester använder `sortCallActivities()` från `ganttDataConverter.ts`
- ✅ Tester använder `buildProcessGraph()` och `buildProcessTreeFromGraph()`
- ✅ Tester använder samma pipeline som appen

**Vad som INTE är OK:**
- ❌ Tester med egen sorteringslogik
- ❌ Tester som mockar `calculateOrderFromSequenceFlows()`
- ❌ Tester som hoppar över delar av pipeline

### 4. ID-mapping Komplexitet

**Problem:** Vi har två ID-typer:
- Element IDs: `"Event_111bwbu"`, `"offer"`, `"kyc"`
- ProcessGraphNode IDs: `"callActivity:mortgage.bpmn:offer"`

**Lösning:** 
- Skapa mapping: `Map<elementId, nodeId>`
- Använd element IDs i sequence flow-grafen
- Mappa resultatet tillbaka till ProcessGraphNode IDs

### 2. Propagering av orderIndex

**Problem:** Intermediate events får `orderIndex`, men call activities som kommer efter dem får inte `orderIndex` eftersom de inte är direkt kopplade i grafen.

**Lösning:**
- Efter DFS, hitta call activities som saknar `orderIndex`
- Hitta inkommande sequence flows till deras element ID
- Om source har `orderIndex`, propagera det med liten offset

### 3. Bakåtkompatibilitet (INGEN Fallback)

**Problem:** Om vi ändrar signatur på `calculateOrderFromSequenceFlows()`, kan det påverka andra anrop.

**Lösning (INGEN fallback):**
- Gör `elementIdToNodeIdMap` optional
- Om den saknas, använd nuvarande logik (bakåtkompatibel) - detta är INTE en fallback, utan bakåtkompatibilitet
- Om den finns, använd ny logik med intermediate events
- **VIKTIGT:** Om ny logik misslyckas, returnera tom map (låt problemet synas, inte dölj det med fallback)

### 4. Prestanda

**Problem:** Att inkludera alla intermediate events kan öka antalet noder i grafen avsevärt.

**Lösning:**
- Inkludera bara noder som faktiskt finns i sequence flows
- Använd Set för snabb lookup
- DFS är O(V+E), så prestanda bör vara acceptabel

## Testning

### Testfall att Verifiera

1. **Mortgage.bpmn:**
   - KYC ska få `orderIndex:0`
   - Credit decision ska få `orderIndex:1`
   - Offer ska få `orderIndex` (propagerat från Event_111bwbu)
   - Offer ska komma EFTER KYC och Credit decision

2. **Alla BPMN-filer:**
   - Inga breaking changes i befintlig sortering
   - Alla noder som är sekventiellt kopplade får `orderIndex`
   - Inga noder är beroende av `visualOrderIndex` för sekventiell ordning

### Debug Output

Lägg till debug output för att verifiera:
- Vilka element IDs ingår i grafen
- Vilka noder får `orderIndex` direkt
- Vilka noder får `orderIndex` via propagering
- Final sortering

## Sammanfattning

### Vad Som Behöver Göras

1. **Utöka `calculateOrderFromSequenceFlows()`:**
   - Acceptera optional `elementIdToNodeIdMap`
   - Inkludera alla element IDs från sequence flows i grafen
   - Propagera `orderIndex` från intermediate events till call activities

2. **Uppdatera `assignLocalOrderForFile()`:**
   - Ta `parseResult` som parameter
   - Använd `parseResult.sequenceFlows` direkt
   - Skapa mapping element ID → ProcessGraphNode ID
   - Mappa resultatet tillbaka till ProcessGraphNode IDs

3. **Uppdatera alla anrop:**
   - `buildProcessGraph()` → skicka `parseResult` till `assignLocalOrderForFile()`
   - `assignExecutionOrder()` → skapa mapping och använd element IDs
   - `assignExecutionOrderFromSequenceFlows()` → skapa mapping och använd element IDs

### Förväntat Resultat

- **Offer** får `orderIndex` (propagerat från `Event_111bwbu`)
- **KYC** får `orderIndex:0` (direkt från sequence flows)
- **Credit decision** får `orderIndex:1` (direkt från sequence flows)
- **Offer** kommer EFTER KYC och Credit decision (eftersom `orderIndex` prioriteras)

### Risker

1. **Breaking changes:** Om signatur ändras, kan det påverka andra anrop
2. **Komplexitet:** ID-mapping och propagering ökar komplexiteten
3. **Prestanda:** Fler noder i grafen kan påverka prestanda

### Rekommendation

**Implementera i små steg (INGA fallback-lösningar):**
1. **Först:** Utöka `calculateOrderFromSequenceFlows()` att acceptera optional mapping (bakåtkompatibel)
   - Om mapping saknas: använd nuvarande logik (bakåtkompatibilitet, INTE fallback)
   - Om mapping finns: använd ny logik med intermediate events
   - Om ny logik misslyckas: returnera tom map (låt problemet synas)

2. **Sedan:** Uppdatera `assignLocalOrderForFile()` att använda `parseResult.sequenceFlows`
   - Skapa mapping element ID → ProcessGraphNode ID
   - Använd samma `calculateOrderFromSequenceFlows()` funktion
   - Mappa resultatet tillbaka till ProcessGraphNode IDs

3. **Slutligen:** Testa omfattande med alla BPMN-filer
   - Verifiera att inga fallback-lösningar introduceras
   - Verifiera att alla tester använder samma funktioner som appen
   - Verifiera att inga dupliceringar introduceras

**Kontrolllista innan implementation:**
- ✅ Använder vi `calculateOrderFromSequenceFlows()` från `sequenceOrderHelpers.ts`? (JA)
- ✅ Använder vi `sortCallActivities()` från `ganttDataConverter.ts`? (JA)
- ✅ Har vi introducerat några fallback-lösningar? (NEJ)
- ✅ Har vi duplicerat någon funktion? (NEJ)
- ✅ Använder testerna samma funktioner som appen? (JA)
