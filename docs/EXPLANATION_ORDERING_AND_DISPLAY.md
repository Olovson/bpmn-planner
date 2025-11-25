# Förklaring: Hur vi beräknar ordningen och vad vi visar

## 1. Hur vi beräknar ordningen

### Vi använder egen kod, INGEN plugin

**Vår implementation:**
- **Funktion**: `calculateOrderFromSequenceFlows()` i `src/lib/bpmn/sequenceOrderHelpers.ts`
- **Algoritm**: DFS (Depth-First Search) traversal
- **Input**: Sequence flows från BPMN-filen
- **Output**: `orderIndex` för varje nod

**Process:**
1. Vi använder `bpmn-js` biblioteket för att **PARSA** BPMN XML-filen (läsa in strukturen)
2. Vi extraherar **sequence flows** från den parsade filen
3. Vi bygger en **adjacency-graf** från sequence flows
4. Vi kör **DFS** från start-noder (noder utan inkommande kanter)
5. Vi tilldelar `orderIndex` baserat på DFS-ordningen

**VIKTIGT:** Vi använder `bpmn-js` bara för parsing, INTE för att beräkna ordningen. Ordningen beräknas av vår egen kod.

### Exempel från mortgage.bpmn

När vi läser `mortgage.bpmn`:
- Vi ser sequence flow: `Flow_1cnua0l` från `event-credit-evaluation-complete` till `kyc`
- Vi ser sequence flow: `Flow_0sh7kx6` från `kyc` till `credit-decision`
- Vi ser sequence flow: `Flow_1m7kido` från `Event_111bwbu` till `offer`

Vår DFS-algoritm följer dessa flows och tilldelar:
- `kyc` → `orderIndex: X`
- `credit-decision` → `orderIndex: X+1`
- `offer` → `orderIndex: X+2`

## 2. Vad vi visar i ProcessExplorer

### Vi filtrerar bort många BPMN-element

**Vad vi VISAR:**
- ✅ `callActivity` (subprocesses/feature goals)
- ✅ `userTask`
- ✅ `serviceTask`
- ✅ `businessRuleTask`

**Vad vi INTE visar (men använder för ordningen):**
- ❌ `exclusiveGateway` (beslutsnoder)
- ❌ `intermediateThrowEvent` (events mellan aktiviteter)
- ❌ `startEvent` / `endEvent`
- ❌ `boundaryEvent`
- ❌ Andra BPMN-element

**Kod som styr detta:**
```typescript
// src/lib/bpmn/buildProcessTreeFromGraph.ts
const INCLUDED_NODE_TYPES: BpmnNodeType[] = [
  'process',
  'callActivity',
  'userTask',
  'serviceTask',
  'businessRuleTask',
];
```

### Varför det kan se annorlunda ut

**I en dedikerad BPMN-app (t.ex. Camunda Modeler):**
- Du ser ALLT: gateways, events, sequence flows, etc.
- Du ser den visuella layouten (x, y koordinater)
- Du ser alla element i diagrammet

**I vår ProcessExplorer:**
- Vi visar BARA call activities, user tasks, service tasks, business rule tasks
- Vi visar INTE gateways eller events
- Vi sorterar baserat på `orderIndex` (beräknat från sequence flows)

**Exempel:**
I `mortgage.bpmn` finns det:
- Gateway: `is-purchase` ("Is purchase?")
- Intermediate Event: `event-credit-evaluation-complete`
- Call Activity: `kyc`

**I BPMN-app:**
- Du ser alla tre elementen med sequence flows mellan dem

**I vår ProcessExplorer:**
- Du ser BARA `kyc` (call activity)
- Gateway och event är dolda, men vi använder dem för att beräkna ordningen

## 3. Vad är "Happy Path"?

**"Happy Path"** = det normala, framgångsrika flödet utan fel eller alternativa vägar.

**I mortgage.bpmn:**
- Happy path: Application → Credit Evaluation → KYC → Credit Decision → Offer → Document Generation → Signing → Disbursement
- Det finns många alternativa vägar:
  - Om "Is purchase? = No" → hoppa över Mortgage commitment
  - Om "Automatically approved? = No" → gå till Manual credit evaluation
  - Om "Credit approved? = No" → avsluta (rejected)
  - Om "Needs collateral registration? = Yes" → lägg till Collateral registration

**Vår ordningsberäkning:**
- Vi följer ALLA sequence flows (inte bara happy path)
- Vi tilldelar `orderIndex` baserat på DFS-traversal
- Vi hanterar branches med `branchId` och `scenarioPath`
- Men vi visar bara de filtrerade noderna (call activities, tasks)

## 4. Varför ProcessExplorer kan se annorlunda ut

### Problem 1: Vi visar bara vissa nodtyper

**I BPMN-app:**
```
Start → Application → [Gateway: is-purchase] → Mortgage commitment → [Gateway] → Credit Evaluation → [Event] → KYC → Credit Decision → [Event] → Offer
```

**I ProcessExplorer:**
```
Application → Mortgage commitment → Credit Evaluation → KYC → Credit Decision → Offer
```

Gateways och events är dolda, men de påverkar ordningen.

### Problem 2: Vi sorterar baserat på orderIndex, inte visuell position

**Sorteringslogik** (`sortCallActivities` i `src/lib/ganttDataConverter.ts`):
1. Först: `visualOrderIndex` (från x, y koordinater)
2. Sedan: `orderIndex` (från sequence flows)
3. Sedan: `branchId` (main före branches)
4. Slutligen: `label` (alfabetiskt)

**Om `orderIndex` saknas:**
- Vi använder `visualOrderIndex` (från DI-koordinater)
- Detta kan ge annorlunda ordning än BPMN-appen som följer visuell layout

### Problem 3: Intermediate events påverkar ordningen

**I mortgage.bpmn:**
- `event-credit-evaluation-complete` ligger mellan Credit Evaluation och KYC
- `Event_111bwbu` ("Offer created") ligger mellan Credit Decision och Offer

**Vår implementation:**
- Vi inkluderar nu intermediate events i sequence flow-grafen (efter vår fix)
- Vi propagerar `orderIndex` från intermediate events till call activities
- Men vi visar INTE intermediate events i ProcessExplorer

**Resultat:**
- Ordningen borde vara korrekt (KYC → Credit Decision → Offer)
- Men det kan se annorlunda ut eftersom vi döljer intermediate events

## 5. Slutsats

**Varför ProcessExplorer kan se annorlunda ut än BPMN-appen:**

1. **Vi filtrerar bort många element** (gateways, events) som syns i BPMN-appen
2. **Vi sorterar baserat på sequence flows**, inte visuell layout
3. **Vi visar bara call activities och tasks**, inte alla BPMN-element
4. **Vi använder egen kod för ordningen**, inte samma logik som BPMN-appen

**Ordningen borde vara korrekt** (baserat på sequence flows), men **visningen är annorlunda** eftersom vi filtrerar bort många element.

**Om du vill se samma sak som BPMN-appen:**
- Du behöver öppna BPMN-filen i en BPMN-visualiserare (t.ex. Camunda Modeler)
- ProcessExplorer är designad för att visa bara "testbara" element (call activities, tasks)
- Det är avsiktligt - vi vill inte visa gateways och events i ProcessExplorer


