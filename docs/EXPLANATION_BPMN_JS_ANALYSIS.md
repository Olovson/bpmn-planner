# Förklaring: Analyserar bpmn-js ordningen?

## Kort svar: NEJ

**bpmn-js analyserar INTE ordningen.** Den extraherar bara rådata (sequence flows) som vi sedan analyserar med vår egen kod.

## Vad bpmn-js faktiskt gör

### 1. Parsing (Läser BPMN XML)

```typescript
// src/lib/bpmnParser.ts
await this.modeler.importXML(bpmnXml);
const elementRegistry = this.modeler.get('elementRegistry');
const allElements = elementRegistry.getAll();
```

**bpmn-js:**
- ✅ Läser BPMN XML-filen
- ✅ Bygger en intern modell av alla element
- ✅ Extraherar element-ID:n, namn, typer
- ✅ Extraherar sequence flows (`sourceRef`, `targetRef`)
- ✅ Extraherar DI-koordinater (x, y positioner)

### 2. Extraherar rådata (INGEN analys)

```typescript
// Vad vi får från bpmn-js:
if (bo.$type === 'bpmn:SequenceFlow') {
  sequenceFlows.push({
    id: element.id,
    name: bo.name || '',
    sourceRef: bo.sourceRef?.id || '',  // ← Bara rådata
    targetRef: bo.targetRef?.id || '',  // ← Bara rådata
  });
}
```

**bpmn-js ger oss:**
- ✅ Lista av sequence flows
- ✅ Varje sequence flow har `sourceRef` och `targetRef`
- ❌ **INGEN analys** av ordningen
- ❌ **INGEN traversering** av sequence flows
- ❌ **INGEN graf-byggande**
- ❌ **INGEN DFS eller annan algoritm**

## Vad bpmn-js INTE gör

### bpmn-js gör INTE:
- ❌ Analyserar ordningen
- ❌ Traverserar sequence flows
- ❌ Bygger graf från sequence flows
- ❌ Kör DFS eller annan algoritm
- ❌ Beräknar exekveringsordning
- ❌ Tilldelar orderIndex

**bpmn-js är bara ett parsing-bibliotek - det läser XML och ger oss rådata.**

## Vår kod analyserar ordningen

### Vi gör analysen med vår egen kod:

```typescript
// src/lib/bpmn/sequenceOrderHelpers.ts
export function calculateOrderFromSequenceFlows(
  sequenceFlows: BpmnSequenceFlow[],  // ← Från bpmn-js (rådata)
  nodeIds: string[],
  elementIdToNodeIdMap?: Map<string, string>,
): Map<string, OrderInfo> {
  // 1. Bygger graf från sequence flows
  const adjacency = new Map<string, string[]>();
  sequenceFlows.forEach((flow) => {
    // Bygger adjacency list
  });
  
  // 2. Hittar start-noder (inga inkommande kanter)
  const startNodes = Array.from(allNodeIds).filter(
    (id) => (incoming.get(id) ?? 0) === 0,
  );
  
  // 3. Kör DFS (Depth-First Search)
  const dfs = (nodeId: string, branchId: string, scenarioPath: string[]) => {
    // Traverserar grafen
    // Tilldelar orderIndex
  };
  
  // 4. Returnerar orderIndex för varje nod
  return orderMap;
}
```

**Vår kod:**
- ✅ Bygger graf från sequence flows (från bpmn-js)
- ✅ Traverserar grafen med DFS
- ✅ Analyserar ordningen
- ✅ Tilldelar `orderIndex`

## Sammanfattning

### bpmn-js:
- ✅ **Extraherar** rådata (sequence flows, element, koordinater)
- ❌ **Analyserar INTE** ordningen

### Vår kod:
- ✅ **Analyserar** ordningen (från rådata från bpmn-js)
- ✅ **Bygger graf** från sequence flows
- ✅ **Traverserar** med DFS
- ✅ **Tilldelar** `orderIndex`

**bpmn-js är ett verktyg för parsing - vi gör analysen.**


