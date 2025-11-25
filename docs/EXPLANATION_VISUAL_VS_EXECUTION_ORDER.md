# Förklaring: Visuell ordning vs Exekveringsordning

## Varför ser bpmn.io en korrekt ordning?

När du öppnar `mortgage.bpmn` i **bpmn.io** ser du en korrekt ordning eftersom bpmn.io visar elementen baserat på **DI-koordinater** (Diagram Interchange), inte XML-ordningen eller sequence flows.

## Det finns TRE olika "ordningar" i en BPMN-fil

### 1. **Visuell ordning** (DI-koordinater) - Vad bpmn.io visar

**Var:** I `<bpmndi:BPMNDiagram>` sektionen i XML:en  
**Vad:** x, y koordinater för var varje element ska ritas på skärmen  
**Används av:** bpmn.io, Camunda Modeler, och andra BPMN-visualiserare  
**Exempel från mortgage.bpmn:**

```xml
<bpmndi:BPMNShape id="Activity_0g4og24_di" bpmnElement="application">
  <dc:Bounds x="375" y="840" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Activity_16bnskh_di" bpmnElement="credit-evaluation">
  <dc:Bounds x="1147" y="840" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Activity_0hts4sm_di" bpmnElement="kyc">
  <dc:Bounds x="2340" y="840" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Activity_065g0i6_di" bpmnElement="credit-decision">
  <dc:Bounds x="2570" y="840" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Activity_0hx57aj_di" bpmnElement="offer">
  <dc:Bounds x="3160" y="840" width="100" height="80" />
</bpmndi:BPMNShape>
```

**Visuell ordning (från vänster till höger, baserat på x-koordinater):**
1. `application` (x=375, y=840)
2. `credit-evaluation` (x=1147, y=840)
3. `kyc` (x=2340, y=840)
4. `credit-decision` (x=2570, y=840)
5. `offer` (x=3160, y=840)

**Detta är vad du ser i bpmn.io!** Elementen ritas från vänster till höger baserat på deras x-koordinater. Alla dessa call activities ligger på samma y-koordinat (y=840), så de är sorterade strikt från vänster till höger.

### 2. **Exekveringsordning** (Sequence flows) - Vad vår app beräknar

**Var:** I `<bpmn:sequenceFlow>` elementen i XML:en  
**Vad:** Referenser som visar vilka element som körs efter varandra  
**Används av:** Vår app (`calculateOrderFromSequenceFlows`)  
**Exempel från mortgage.bpmn:**

```xml
<bpmn:sequenceFlow id="Flow_1fn7ls8" sourceRef="Event_0ssbeto" targetRef="application" />
<bpmn:sequenceFlow id="Flow_0us992j" sourceRef="application" targetRef="event-application-evaluation-completed" />
<bpmn:sequenceFlow id="Flow_05h03ml" sourceRef="event-application-evaluation-completed" targetRef="is-purchase" />
<bpmn:sequenceFlow id="Flow_06f0lv1" sourceRef="Gateway_0m8pi2g" targetRef="credit-evaluation" />
<bpmn:sequenceFlow id="Flow_0l53m32" sourceRef="credit-evaluation" targetRef="event-credit-evaluation-completed" />
<bpmn:sequenceFlow id="Flow_1gie2jo" sourceRef="event-credit-evaluation-completed" targetRef="is-automatically-approved" />
<bpmn:sequenceFlow id="Flow_1cnua0l" sourceRef="event-credit-evaluation-complete" targetRef="kyc" />
<bpmn:sequenceFlow id="Flow_0sh7kx6" sourceRef="kyc" targetRef="credit-decision" />
<bpmn:sequenceFlow id="Flow_1fvldyx" sourceRef="event-credit-decision-completed" targetRef="Event_111bwbu" />
<bpmn:sequenceFlow id="Flow_1m7kido" sourceRef="Event_111bwbu" targetRef="offer" />
```

**Exekveringsordning (från sequence flows):**
1. `application` (start event → application)
2. `credit-evaluation` (efter gateway)
3. `kyc` (efter credit-evaluation-complete event)
4. `credit-decision` (efter kyc)
5. `offer` (efter credit-decision-completed event → Event_111bwbu)

**Detta är vad vår app beräknar!** Vi följer sequence flows med DFS (Depth-First Search) för att bestämma i vilken ordning aktiviteter faktiskt körs.

### 3. **XML-ordning** - Irrelevant

**Var:** I vilken ordning elementen är definierade i XML:en  
**Vad:** Strukturell ordning i filen  
**Används av:** Ingen - det är bara hur filen är strukturerad  
**Exempel från mortgage.bpmn:**

```xml
<!-- Rad 12 -->
<bpmn:callActivity id="credit-evaluation" />
<!-- Rad 27 -->
<bpmn:callActivity id="credit-decision" />
<!-- Rad 64 -->
<bpmn:callActivity id="offer" />
<!-- Rad 200 -->
<bpmn:callActivity id="kyc" />
<!-- Rad 253 -->
<bpmn:callActivity id="application" />
```

**XML-ordning:** `credit-evaluation` → `credit-decision` → `offer` → `kyc` → `application`

**Detta spelar INGEN roll!** XML-ordningen påverkar varken visuell ordning eller exekveringsordning.

## Jämförelse för mortgage.bpmn

| Ordningstyp | application | credit-evaluation | kyc | credit-decision | offer |
|------------|-------------|-------------------|-----|----------------|-------|
| **Visuell (DI-koordinater)** | 1 (x=375) | 2 (x=1147) | 3 (x=2340) | 4 (x=2570) | 5 (x=3160) |
| **Exekveringsordning (sequence flows)** | 1 | 2 | 3 | 4 | 5 |
| **XML-ordning** | 5 (rad 253) | 1 (rad 12) | 4 (rad 200) | 2 (rad 27) | 3 (rad 64) |

**I detta fall råkar visuell ordning och exekveringsordning matcha!** Men det är inte alltid så.

## Hur bpmn.io bestämmer visuell ordning

### bpmn.io läser DI-koordinater

**När bpmn.io öppnar en BPMN-fil:**

1. **Läser DI-koordinater** från `<bpmndi:BPMNDiagram>` sektionen
2. **Ritar elementen** på skärmen baserat på x, y koordinater
3. **Visar sequence flows** som pilar mellan elementen

**bpmn.io använder:**
- ✅ **DI-koordinater** (x, y) för att rita elementen
- ✅ **Sequence flows** för att rita pilarna mellan elementen
- ❌ **INTE XML-ordningen** för något
- ❌ **INTE sequence flows** för att bestämma visuell position

### Exempel: Varför ser du korrekt ordning i bpmn.io?

**I mortgage.bpmn:**
- DI-koordinaterna är satta så att elementen ritas i korrekt ordning (vänster → höger)
- Detta är **inte automatiskt** - det är modelleraren (t.ex. Camunda Modeler) som sätter koordinaterna när diagrammet ritas
- Modelleraren försöker göra diagrammet läsbart, så den placerar elementen i en logisk ordning

**Men:**
- Om någon flyttar elementen manuellt i modelleraren kan visuell ordning och exekveringsordning skilja sig åt
- DI-koordinaterna kan vara felaktiga eller förvirrande
- Därför använder vår app **sequence flows** (exekveringsordning) istället för DI-koordinater

## Hur vår app bestämmer ordning

### Vi använder sequence flows, inte DI-koordinater

**Vår app:**
1. **Läser sequence flows** från BPMN XML
2. **Bygger en graf** av elementen baserat på sequence flows
3. **Kör DFS** (Depth-First Search) för att beräkna `orderIndex`
4. **Använder DI-koordinater** endast som fallback (`visualOrderIndex`) när sequence flows saknas

**Varför?**
- ✅ **Sequence flows** är den enda källan till sanning för exekveringsordning
- ✅ **DI-koordinater** kan vara felaktiga eller förvirrande
- ✅ **XML-ordning** är helt irrelevant

## Sammanfattning

### Tre olika ordningar:

1. **Visuell ordning (DI-koordinater)**
   - Vad: x, y koordinater för var elementen ritas
   - Var: `<bpmndi:BPMNDiagram>` sektionen
   - Används av: bpmn.io, Camunda Modeler (för att rita diagrammet)
   - I mortgage.bpmn: `application` → `credit-evaluation` → `kyc` → `credit-decision` → `offer`

2. **Exekveringsordning (sequence flows)**
   - Vad: I vilken ordning aktiviteter faktiskt körs
   - Var: `<bpmn:sequenceFlow>` elementen
   - Används av: Vår app (`calculateOrderFromSequenceFlows`)
   - I mortgage.bpmn: `application` → `credit-evaluation` → `kyc` → `credit-decision` → `offer`

3. **XML-ordning**
   - Vad: I vilken ordning elementen är definierade i XML:en
   - Var: Strukturell ordning i filen
   - Används av: Ingen - helt irrelevant
   - I mortgage.bpmn: `credit-evaluation` → `credit-decision` → `offer` → `kyc` → `application`

### Varför ser du korrekt ordning i bpmn.io?

**bpmn.io visar visuell ordning (DI-koordinater), inte exekveringsordning!**

- bpmn.io läser DI-koordinaterna och ritar elementen där de ska vara
- I mortgage.bpmn råkar DI-koordinaterna matcha exekveringsordningen
- Men det är **inte automatiskt** - det är modelleraren som sätter koordinaterna
- Vår app använder **sequence flows** istället för att vara säker på exekveringsordningen

### Varför använder vår app sequence flows?

**För att vara säker på exekveringsordningen!**

- DI-koordinater kan vara felaktiga eller förvirrande
- XML-ordning är helt irrelevant
- **Sequence flows är den enda källan till sanning** för exekveringsordning
- Vår app beräknar `orderIndex` från sequence flows med DFS

