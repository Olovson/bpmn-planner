# Analys: KYC vs Offer ordningsbugg

## Problembeskrivning

Från mortgage.bpmn (root) ser vi följande korrekta ordning:
1. application
2. mortgage commitment
3. Automatic Credit Evaluation
4. Appeal
5. Manual credit evaluation

Men sedan kommer:
- **Offer** (fel)
- **KYC** (borde komma först)
- **Credit decision** (borde komma efter KYC)

## Sequence Flows i BPMN

Från `mortgage.bpmn`:

```
event-credit-evaluation-complete → kyc (Flow_1cnua0l)
kyc → credit-decision (Flow_0sh7kx6)
credit-decision → is-credit-approved (gateway) (Flow_1cd4ae2)
is-credit-approved → event-credit-decision-completed (is-credit-approved-yes)
event-credit-decision-completed → Event_111bwbu (Flow_1fvldyx)
Event_111bwbu → offer (Flow_1m7kido)
```

**Korrekt sekvens borde vara:**
1. event-credit-evaluation-complete
2. kyc
3. credit-decision
4. is-credit-approved (gateway)
5. event-credit-decision-completed
6. Event_111bwbu
7. offer

## Rotorsaksanalys

### Problem 1: Flera start-noder

I `calculateOrderFromSequenceFlows()` hittar vi start-noder (inga inkommande edges):

```typescript
const startNodes = sequenceRelevantNodeIds.filter(
  (id) => (incoming.get(id) ?? 0) === 0,
);
```

Om det finns flera start-noder, bearbetas de i den ordning de finns i `startNodes` arrayen:

```typescript
startNodes.forEach((nodeId, idx) => {
  const branchId = idx === 0 ? 'main' : `entry-${idx + 1}`;
  const path = [branchId];
  dfs(nodeId, branchId, path);
});
```

**Problemet:** Om `Event_111bwbu` eller `offer` har inga inkommande sequence flows (t.ex. om de inte är "sequence-relevant"), kan de bli start-noder och bearbetas före KYC.

### Problem 2: Noder som inte är "sequence-relevant"

I `calculateOrderFromSequenceFlows()`:

```typescript
const sequenceRelevant = new Set<string>();
sequenceFlows.forEach((flow) => {
  sequenceRelevant.add(flow.sourceRef);
  sequenceRelevant.add(flow.targetRef);
});
```

Om en nod inte finns i `nodeIds` som skickas till funktionen, kommer den inte att inkluderas i adjacency-grafen, även om den finns i sequence flows.

**Problemet:** Om `Event_111bwbu` eller andra intermediate events inte ingår i `nodeIds` (t.ex. om de filtreras bort som "inte call activities"), kommer de inte att få `orderIndex`, och kommer därför att använda `visualOrderIndex` istället.

### Problem 3: VisualOrderIndex fallback

Om noder inte får `orderIndex` från sequence flows, används `visualOrderIndex` som fallback. I `sortCallActivities()`:

```typescript
const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
if (aVisual !== bVisual) {
  return aVisual - bVisual;
}
```

**Problemet:** Om `offer` har en lägre `visualOrderIndex` (x-koordinat) än `kyc`, kommer den att sorteras före KYC, även om sequence flows säger att KYC ska komma först.

## Trolig orsak

Baserat på analysen tror jag att problemet är **Problem 3**: 

1. `Event_111bwbu` (intermediate event) är inte en call activity, så den inkluderas inte i `nodeIds` som skickas till `calculateOrderFromSequenceFlows()`
2. `offer` får därför inget `orderIndex` från sequence flows (eftersom `Event_111bwbu` saknas i grafen)
3. `offer` använder istället `visualOrderIndex` baserat på x-koordinat
4. `kyc` får `orderIndex` från sequence flows (eftersom den är en call activity och ingår i grafen)
5. Men eftersom `sortCallActivities()` prioriterar `visualOrderIndex` före `orderIndex`, sorteras `offer` (med `visualOrderIndex`) före `kyc` (med `orderIndex`)

## Verifiering behövs

För att bekräfta detta behöver vi verifiera:
1. Om `Event_111bwbu` och andra intermediate events ingår i `nodeIds` som skickas till `calculateOrderFromSequenceFlows()`
2. Om `offer` får `orderIndex` eller bara `visualOrderIndex`
3. Om `kyc` får `orderIndex` från sequence flows
4. Vilka värden `visualOrderIndex` har för `offer` vs `kyc`

## Lösningsförslag (för framtida implementering)

1. **Inkludera intermediate events i sequence flow-grafen:** Se till att alla noder som finns i sequence flows (inklusive events och gateways) ingår i `nodeIds`, inte bara call activities.

2. **Prioritera orderIndex över visualOrderIndex:** Ändra `sortCallActivities()` så att `orderIndex` alltid prioriteras över `visualOrderIndex`, även när båda finns.

3. **Propagera orderIndex genom intermediate events:** Om en nod har `orderIndex` men saknar direkta sequence flows, använd `orderIndex` från föregående nod i sekvensen.


