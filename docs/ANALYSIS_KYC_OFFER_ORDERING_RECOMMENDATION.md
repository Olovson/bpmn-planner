# Analys och Rekommendation: KYC vs Offer-ordningsbugg

## Problemvalidering

Från test-output ser vi:
- **Offer**: `orderIndex:N/A, visualOrderIndex:5` - får INTE orderIndex från sequence flows
- **KYC**: `orderIndex:0, visualOrderIndex:N/A` - får orderIndex från sequence flows  
- **Credit decision**: `orderIndex:1, visualOrderIndex:N/A` - får orderIndex från sequence flows

I `sortCallActivities()` prioriteras `visualOrderIndex` före `orderIndex`:
```typescript
const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
if (aVisual !== bVisual) {
  return aVisual - bVisual;  // ← visualOrderIndex prioriteras FÖRST
}
const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
if (aOrder !== bOrder) {
  return aOrder - bOrder;  // ← orderIndex kommer EFTER
}
```

**Resultat:** Offer (visualOrderIndex=5) sorteras före KYC (orderIndex=0) eftersom 5 < MAX_SAFE_INTEGER.

## Rotorsak: Intermediate Events och Gateways Exkluderas

### Sequence Flows i BPMN

Från `mortgage.bpmn`:
```
event-credit-evaluation-complete → kyc (Flow_1cnua0l)
kyc → credit-decision (Flow_0sh7kx6)
credit-decision → is-credit-approved (gateway) (Flow_1cd4ae2)
is-credit-approved → event-credit-decision-completed (is-credit-approved-yes)
event-credit-decision-completed → Event_111bwbu (Flow_1fvldyx)
Event_111bwbu → offer (Flow_1m7kido)
```

### Vad som Händer i Koden

1. **`buildNodes()`** (rad 125-208) skapar bara noder för:
   - `process` (process definitions)
   - `callActivity` (call activities)
   - `userTask`, `serviceTask`, `businessRuleTask` (tasks)
   
   **Intermediate events och gateways skapas INTE som ProcessGraphNode.**

2. **`buildSequenceEdgesForFile()`** (rad 320-352) filtrerar bort sequence flows där source eller target inte finns i `nodes`:
   ```typescript
   if (!sourceNode || !targetNode) continue;
   ```
   
   **Resultat:** Sequence flows som går via intermediate events/gateways ignoreras.

3. **`calculateOrderFromSequenceFlows()`** får bara sequence flows mellan call activities/tasks:
   - `event-credit-evaluation-complete → kyc` ✅ (båda finns)
   - `kyc → credit-decision` ✅ (båda finns)
   - `credit-decision → is-credit-approved` ❌ (gateway finns inte)
   - `event-credit-decision-completed → Event_111bwbu` ❌ (events finns inte)
   - `Event_111bwbu → offer` ❌ (event finns inte)

4. **Resultat:** 
   - KYC får `orderIndex:0` (från `event-credit-evaluation-complete → kyc`)
   - Credit decision får `orderIndex:1` (från `kyc → credit-decision`)
   - Offer får INTE `orderIndex` (eftersom `Event_111bwbu → offer` ignoreras)
   - Offer får `visualOrderIndex:5` (från DI-koordinater)

## Rekommendation: Två-stegs Lösning

### Steg 1: Prioritera orderIndex över visualOrderIndex (Korttidsfix)

**Problem:** När både `orderIndex` och `visualOrderIndex` finns, prioriteras `visualOrderIndex` felaktigt.

**Lösning:** Ändra `sortCallActivities()` så att `orderIndex` alltid prioriteras över `visualOrderIndex`:

```typescript
export function sortCallActivities(
  nodes: ProcessTreeNode[],
  mode: SortMode = 'root',
): ProcessTreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // Primary: orderIndex (prioritize actual sequence flow order)
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    // Secondary: visualOrderIndex (fallback for nodes without sequence flow order)
    const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aVisual !== bVisual) {
      return aVisual - bVisual;
    }
    
    // Tertiary (root mode only): branchId (main before branches)
    if (mode === 'root' && a.branchId !== b.branchId) {
      if (a.branchId === 'main') return -1;
      if (b.branchId === 'main') return 1;
      return (a.branchId || '').localeCompare(b.branchId || '');
    }

    // Final fallback: label (alphabetical)
    return a.label.localeCompare(b.label);
  });
  return sorted;
}
```

**Fördelar:**
- ✅ Snabb fix som löser problemet omedelbart
- ✅ Ingen risk för breaking changes
- ✅ Noder med `orderIndex` kommer alltid före noder med bara `visualOrderIndex`

**Nackdelar:**
- ⚠️ Offer kommer fortfarande inte få `orderIndex` (använder `visualOrderIndex` som fallback)
- ⚠️ Om två noder båda saknar `orderIndex`, används `visualOrderIndex` (kan vara fel)

### Steg 2: Inkludera Intermediate Events och Gateways i Sequence Flow-grafen (Långtidsfix)

**Problem:** Intermediate events och gateways ingår inte i `ProcessGraphNode`, så sequence flows via dem ignoreras.

**Lösning:** Skapa "virtuella" noder för intermediate events och gateways i sequence flow-grafen:

1. **I `calculateOrderFromSequenceFlows()`:** Skapa temporära noder för alla element som finns i sequence flows men inte i `nodeIds`:
   ```typescript
   // Collect all nodes mentioned in sequence flows
   const allSequenceNodes = new Set<string>();
   sequenceFlows.forEach((flow) => {
     allSequenceNodes.add(flow.sourceRef);
     allSequenceNodes.add(flow.targetRef);
   });
   
   // Add missing nodes (intermediate events, gateways) to adjacency graph
   allSequenceNodes.forEach((nodeId) => {
     if (!adjacency.has(nodeId)) {
       adjacency.set(nodeId, []);
       incoming.set(nodeId, 0);
     }
   });
   ```

2. **Propagera orderIndex:** När vi beräknar `orderIndex` för en nod, propagera värdet till efterföljande noder som saknas i `nodeIds`:
   ```typescript
   // After calculating orderIndex for a node, propagate to intermediate events
   const propagateOrder = (nodeId: string, orderIndex: number) => {
     const successors = adjacency.get(nodeId) ?? [];
     successors.forEach((successorId) => {
       if (!nodeIds.includes(successorId) && !orderMap.has(successorId)) {
         // This is an intermediate event/gateway - propagate orderIndex
         orderMap.set(successorId, {
           orderIndex: orderIndex + 0.5, // Use fractional to maintain order
           branchId: orderMap.get(nodeId)?.branchId || 'main',
           scenarioPath: orderMap.get(nodeId)?.scenarioPath || ['main'],
         });
       }
     });
   };
   ```

3. **Applicera på call activities:** När vi applicerar `orderIndex` på call activities, använd orderIndex från föregående intermediate event om det finns:
   ```typescript
   // When applying orderIndex to offer, check if Event_111bwbu has orderIndex
   const eventOrderIndex = orderMap.get('Event_111bwbu');
   if (eventOrderIndex) {
     // Use orderIndex from intermediate event
     offer.orderIndex = eventOrderIndex.orderIndex + 0.1;
   }
   ```

**Fördelar:**
- ✅ Alla noder får `orderIndex` baserat på faktisk sekvens
- ✅ Ingen beroende av `visualOrderIndex` för sekventiell ordning
- ✅ Mer robust och korrekt

**Nackdelar:**
- ⚠️ Mer komplex implementation
- ⚠️ Kräver ändringar i flera funktioner
- ⚠️ Risk för breaking changes om inte noggrant implementerat

## Rekommenderad Implementation-ordning

### Fas 1: Korttidsfix (Steg 1)
1. Ändra `sortCallActivities()` att prioritera `orderIndex` över `visualOrderIndex`
2. Verifiera att KYC kommer före Offer
3. Testa att inga andra sorteringar bryts

### Fas 2: Långtidsfix (Steg 2)
1. Utöka `calculateOrderFromSequenceFlows()` att inkludera intermediate events/gateways
2. Propagera `orderIndex` genom intermediate events
3. Verifiera att alla noder får korrekt `orderIndex`
4. Testa omfattande med alla BPMN-filer

## Validering

För att validera lösningen:

1. **Korttidsfix:** Verifiera att efter ändring:
   - KYC (orderIndex=0) kommer före Offer (visualOrderIndex=5)
   - Credit decision (orderIndex=1) kommer efter KYC
   - Andra sorteringar förblir korrekta

2. **Långtidsfix:** Verifiera att:
   - Offer får `orderIndex` (t.ex. från Event_111bwbu)
   - Alla noder som är sekventiellt kopplade får `orderIndex`
   - Inga noder är beroende av `visualOrderIndex` för sekventiell ordning

## Sammanfattning

**Huvudproblem:** Intermediate events och gateways ingår inte i sequence flow-grafen, vilket gör att noder som `offer` (som kommer efter `Event_111bwbu`) inte får `orderIndex` och faller tillbaka på `visualOrderIndex`.

**Rekommendation:** 
1. **Korttidsfix:** Prioritera `orderIndex` över `visualOrderIndex` i `sortCallActivities()` (löser problemet omedelbart)
2. **Långtidsfix:** Inkludera intermediate events och gateways i sequence flow-grafen (löser roten till problemet)

**Prioritet:** Implementera korttidsfixen först för att lösa problemet omedelbart, sedan långtidsfixen för att säkerställa korrekt ordning i framtiden.


