# Förklaring: Hur bpmn-js fungerar och vad det gör med ordningen

## Viktigt: bpmn-js bestämmer INTE ordningen

**bpmn-js** är ett JavaScript-bibliotek för att:
- **Parsa** BPMN XML-filer
- **Visualisera** BPMN-diagram (rita dem på skärmen)
- **Redigera** BPMN-diagram (i en modellerare)

**bpmn-js bestämmer INTE ordningen** - det läser bara BPMN XML och extraherar data.

## Vad bpmn-js faktiskt gör

### 1. Parsing (Läser BPMN XML)

När vi anropar `this.modeler.importXML(bpmnXml)`:

```typescript
// src/lib/bpmnParser.ts
await this.modeler.importXML(bpmnXml);
const elementRegistry = this.modeler.get('elementRegistry');
const allElements = elementRegistry.getAll();
```

**bpmn-js:**
- Läser BPMN XML-filen
- Bygger en intern modell av alla element
- Extraherar:
  - Element-ID:n
  - Element-namn
  - Element-typer (`bpmn:CallActivity`, `bpmn:UserTask`, etc.)
  - Sequence flows (`sourceRef`, `targetRef`)
  - DI (Diagram Interchange) koordinater (x, y positioner)

### 2. Vad vi extraherar från bpmn-js

**Från vår kod i `src/lib/bpmnParser.ts`:**

```typescript
allElements.forEach((element: any) => {
  const bo = element.businessObject;
  
  // Extraherar element-info
  const bpmnElement: BpmnElement = {
    id: element.id,
    name: bo.name || element.id,
    type: bo.$type,  // t.ex. "bpmn:CallActivity"
    businessObject: bo,
    x,  // DI-koordinat
    y,  // DI-koordinat
  };
  
  // Extraherar sequence flows
  if (bo.$type === 'bpmn:SequenceFlow') {
    sequenceFlows.push({
      id: element.id,
      name: bo.name || element.id,
      sourceRef: bo.sourceRef?.id,
      targetRef: bo.targetRef?.id,
    });
  }
});
```

**bpmn-js ger oss:**
- ✅ Alla element (call activities, tasks, gateways, events)
- ✅ Sequence flows (vilka element som är kopplade)
- ✅ DI-koordinater (x, y positioner för visuell layout)
- ❌ **INTE** ordningen - det måste vi beräkna själva

## Hur ordningen faktiskt bestäms

### Ordningen bestäms av BPMN-specifikationen, inte bpmn-js

**I BPMN:**
- Ordningen definieras av **sequence flows**
- Sequence flows länkar element tillsammans: `sourceRef` → `targetRef`
- Exekveringsordningen följer sequence flows från start event till end event

**Exempel från mortgage.bpmn:**
```xml
<bpmn:sequenceFlow id="Flow_1cnua0l" sourceRef="event-credit-evaluation-complete" targetRef="kyc" />
<bpmn:sequenceFlow id="Flow_0sh7kx6" sourceRef="kyc" targetRef="credit-decision" />
<bpmn:sequenceFlow id="Flow_1m7kido" sourceRef="Event_111bwbu" targetRef="offer" />
```

**Ordningen är:**
1. `event-credit-evaluation-complete` → 
2. `kyc` → 
3. `credit-decision` → 
4. `Event_111bwbu` → 
5. `offer`

**Detta bestäms av BPMN-specifikationen, inte av bpmn-js.**

### Vår kod beräknar ordningen

**Vi använder vår egen kod** (`calculateOrderFromSequenceFlows`) för att:
1. Läsa sequence flows från bpmn-js parse-resultat
2. Bygga en graf (adjacency list)
3. Köra DFS (Depth-First Search) från start-noder
4. Tilldela `orderIndex` baserat på DFS-ordningen

**bpmn-js gör bara parsing - vi gör ordningsberäkningen.**

## Vad bpmn-js används för i vår app

### 1. Parsing (Läsa BPMN XML)

```typescript
// src/lib/bpmnParser.ts
const parser = new BpmnParser();
const result = await parser.parse(bpmnXml);
// result innehåller:
// - elements (alla BPMN-element)
// - sequenceFlows (alla sequence flows)
// - callActivities, userTasks, etc.
```

### 2. Extrahera DI-koordinater (för visualOrderIndex)

```typescript
// bpmn-js ger oss x, y koordinater från BPMN DI
if (element.di?.bounds) {
  x = element.di.bounds.x;
  y = element.di.bounds.y;
}
```

**Vi använder dessa koordinater för `visualOrderIndex`** (fallback när `orderIndex` saknas).

### 3. Visualisering (i BPMN Modeler)

**bpmn-js används också för att:**
- Rita BPMN-diagram på skärmen
- Låta användare redigera diagram
- Exportera ändringar tillbaka till XML

**Men detta används INTE för ordningsberäkning.**

## Sammanfattning

### Vad bpmn-js gör:
- ✅ **Parsar** BPMN XML-filer
- ✅ **Extraherar** element, sequence flows, koordinater
- ✅ **Visualiserar** BPMN-diagram
- ❌ **Bestämmer INTE** ordningen

### Vad vår kod gör:
- ✅ **Läser** sequence flows från bpmn-js parse-resultat
- ✅ **Beräknar** ordningen med DFS-algoritm
- ✅ **Tilldelar** `orderIndex` baserat på sequence flows
- ✅ **Använder** DI-koordinater för `visualOrderIndex` (fallback)

### Ordningen bestäms av:
1. **BPMN-specifikationen** (sequence flows definierar ordningen)
2. **Vår egen kod** (`calculateOrderFromSequenceFlows`) som följer sequence flows
3. **bpmn-js** bara ger oss rådata (sequence flows, element, koordinater)

**bpmn-js är ett verktyg för parsing och visualisering, inte för ordningsberäkning.**


