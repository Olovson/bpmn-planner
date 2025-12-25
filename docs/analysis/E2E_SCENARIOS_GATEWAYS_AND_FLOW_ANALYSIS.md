# Analys: Gateways och BPMN-logik för E2E-scenarios

## 🎯 Syfte

Analysera hur gateways och annan BPMN-logik (sequence flows, conditions, error events) avgör vilka subprocesser som används, och hur denna information kan användas för att generera bra E2E-tester.

---

## 📊 Vad är en Gateway i BPMN?

En **Gateway** är en nod som styr flödet i en BPMN-process:

**Typer av Gateways:**
- **Exclusive Gateway (XOR)**: Väljer **en** path baserat på condition
- **Parallel Gateway (AND)**: Kör **alla** paths parallellt
- **Inclusive Gateway (OR)**: Kör **en eller flera** paths baserat på conditions
- **Event-based Gateway**: Väljer path baserat på events

**Exempel:**
```xml
<bpmn:exclusiveGateway id="Gateway_1" name="Is credit approved?">
  <bpmn:outgoing>Flow_1</bpmn:outgoing>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
</bpmn:exclusiveGateway>

<bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_1" targetRef="CallActivity_Offer">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
    ${creditDecision.approved === true}
  </bpmn:conditionExpression>
</bpmn:sequenceFlow>

<bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="EndEvent_Rejected">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
    ${creditDecision.approved === false}
  </bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

**Betydelse för E2E-scenarios:**
- Gateway avgör **vilka Feature Goals** (Call Activities) som används i olika flöden
- Conditions avgör **när** varje path används
- Olika paths = olika E2E-scenarios

---

## 🔍 Vad behöver vi extrahera från BPMN?

### 1. Gateway-information

**Vad vi behöver:**
- Gateway-ID och namn
- Gateway-typ (exclusive, parallel, inclusive, event-based)
- Outgoing sequence flows från gateway
- Conditions för varje outgoing flow

**Exempel:**
```typescript
{
  id: "Gateway_1",
  name: "Is credit approved?",
  type: "exclusiveGateway",
  outgoingFlows: [
    {
      id: "Flow_1",
      targetRef: "CallActivity_Offer",
      condition: "${creditDecision.approved === true}",
      conditionType: "tFormalExpression"
    },
    {
      id: "Flow_2",
      targetRef: "EndEvent_Rejected",
      condition: "${creditDecision.approved === false}",
      conditionType: "tFormalExpression"
    }
  ]
}
```

---

### 2. Sequence Flow-information

**Vad vi behöver:**
- Sequence flow-ID
- Source (från vilken nod)
- Target (till vilken nod)
- Condition (om det finns)

**Exempel:**
```typescript
{
  id: "Flow_1",
  sourceRef: "Gateway_1",
  targetRef: "CallActivity_Offer",
  condition: "${creditDecision.approved === true}",
  conditionType: "tFormalExpression"
}
```

---

### 3. Path-information (flöden genom processen)

**Vad vi behöver:**
- Start-event → End-event paths
- Feature Goals (Call Activities) i varje path
- Gateway-conditions som avgör vilken path som används

**Exempel:**
```typescript
{
  type: "happy-path",
  startEvent: "StartEvent_1",
  endEvent: "EndEvent_Success",
  featureGoals: [
    "internal-data-gathering",
    "external-data-gathering",
    "credit-decision",
    "offer" // Bara om creditDecision.approved === true
  ],
  gatewayConditions: [
    {
      gatewayId: "Gateway_1",
      gatewayName: "Is credit approved?",
      condition: "${creditDecision.approved === true}",
      path: "approved"
    }
  ]
}
```

---

## 🔄 Hur extraherar vi denna information?

### Steg 1: Parsa BPMN-filen

**Vad vi redan har:**
- ✅ `BpmnParser` parsar BPMN-filer
- ✅ `BpmnParseResult` innehåller `sequenceFlows`
- ✅ `BpmnElement` innehåller `businessObject` med all BPMN-data

**Vad vi behöver lägga till:**
- ❌ Extrahera gateway-information från `businessObject`
- ❌ Extrahera conditions från sequence flows
- ❌ Bygga en graf av noder och flows

**Exempel:**
```typescript
function extractGatewayInfo(element: BpmnElement): GatewayInfo | null {
  if (!element.businessObject.$type.includes('Gateway')) {
    return null;
  }
  
  const bo = element.businessObject;
  const outgoingFlows = bo.outgoing || [];
  
  return {
    id: element.id,
    name: element.name,
    type: bo.$type, // 'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', etc.
    outgoingFlows: outgoingFlows.map((flow: any) => ({
      id: flow.id,
      targetRef: flow.targetRef?.id,
      condition: flow.conditionExpression?.body,
      conditionType: flow.conditionExpression?.$type
    }))
  };
}
```

---

### Steg 2: Bygga en flödesgraf

**Vad vi behöver:**
- Bygga en graf av noder (start events, tasks, call activities, gateways, end events)
- Koppla sequence flows mellan noder
- Identifiera paths från start till end

**Exempel:**
```typescript
interface FlowGraph {
  nodes: Map<string, FlowNode>;
  edges: Map<string, FlowEdge>;
}

interface FlowNode {
  id: string;
  type: 'startEvent' | 'task' | 'callActivity' | 'gateway' | 'endEvent';
  name: string;
  outgoingEdges: string[]; // Edge IDs
  incomingEdges: string[]; // Edge IDs
}

interface FlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  condition?: string;
  conditionType?: string;
}

function buildFlowGraph(parseResult: BpmnParseResult): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  
  // 1. Lägg till alla noder
  parseResult.elements.forEach(element => {
    if (isFlowNode(element)) {
      nodes.set(element.id, {
        id: element.id,
        type: getNodeType(element),
        name: element.name,
        outgoingEdges: [],
        incomingEdges: []
      });
    }
  });
  
  // 2. Lägg till alla edges (sequence flows)
  parseResult.sequenceFlows.forEach(flow => {
    const edge: FlowEdge = {
      id: flow.id,
      sourceId: flow.sourceRef,
      targetId: flow.targetRef,
      condition: extractCondition(flow),
      conditionType: extractConditionType(flow)
    };
    edges.set(flow.id, edge);
    
    // 3. Koppla edges till noder
    const sourceNode = nodes.get(flow.sourceRef);
    const targetNode = nodes.get(flow.targetRef);
    if (sourceNode) sourceNode.outgoingEdges.push(flow.id);
    if (targetNode) targetNode.incomingEdges.push(flow.id);
  });
  
  return { nodes, edges };
}
```

---

### Steg 3: Identifiera paths genom processen

**Vad vi behöver:**
- Hitta alla paths från start-event till end-event
- För varje path: identifiera Feature Goals (Call Activities) och gateway-conditions

**Exempel:**
```typescript
function findPathsThroughProcess(
  graph: FlowGraph,
  startEventId: string
): Path[] {
  const paths: Path[] = [];
  const visited = new Set<string>();
  
  function traverse(
    currentNodeId: string,
    currentPath: string[],
    gatewayConditions: GatewayCondition[]
  ) {
    if (visited.has(currentNodeId)) {
      return; // Avoid cycles
    }
    
    visited.add(currentNodeId);
    const node = graph.nodes.get(currentNodeId);
    if (!node) return;
    
    // Om vi når en end-event, spara pathen
    if (node.type === 'endEvent') {
      paths.push({
        type: determinePathType(gatewayConditions),
        startEvent: startEventId,
        endEvent: currentNodeId,
        featureGoals: currentPath.filter(id => 
          graph.nodes.get(id)?.type === 'callActivity'
        ),
        gatewayConditions
      });
      visited.delete(currentNodeId);
      return;
    }
    
    // Om vi når en gateway, följ alla outgoing edges
    if (node.type === 'gateway') {
      node.outgoingEdges.forEach(edgeId => {
        const edge = graph.edges.get(edgeId);
        if (!edge) return;
        
        const newConditions = [...gatewayConditions];
        if (edge.condition) {
          newConditions.push({
            gatewayId: currentNodeId,
            gatewayName: node.name,
            condition: edge.condition,
            path: edgeId
          });
        }
        
        traverse(edge.targetId, [...currentPath, currentNodeId], newConditions);
      });
    } else {
      // För övriga noder, följ första outgoing edge
      if (node.outgoingEdges.length > 0) {
        const edge = graph.edges.get(node.outgoingEdges[0]);
        if (edge) {
          traverse(edge.targetId, [...currentPath, currentNodeId], gatewayConditions);
        }
      }
    }
    
    visited.delete(currentNodeId);
  }
  
  traverse(startEventId, [], []);
  return paths;
}
```

---

## 🎯 Hur använder vi denna information för E2E-scenarios?

### 1. Generera E2E-scenarios från paths

**Process:**
1. **Identifiera paths** genom processen (happy-path, error-path)
2. **För varje path**: Skapa en E2E-scenario
3. **För varje Feature Goal i pathen**: Lägg till ett steg
4. **För varje gateway-condition**: Lägg till Given-conditions

**Exempel:**
```typescript
function generateE2eScenariosFromPaths(
  paths: Path[],
  featureGoals: Map<string, FeatureGoalDoc>
): E2eScenario[] {
  return paths.map((path, index) => {
    const steps = path.featureGoals.map((fgId, stepIndex) => {
      const fg = featureGoals.get(fgId);
      if (!fg) return null;
      
      return {
        order: stepIndex + 1,
        featureGoal: fgId,
        action: fg.flowSteps[0], // Första flowStep
        assertion: fg.userStories[0]?.acceptanceCriteria[0] || "Feature Goal completed",
        prerequisites: fg.prerequisites,
        gatewayConditions: path.gatewayConditions.filter(gc => 
          // Hitta conditions som måste vara uppfyllda för att nå denna Feature Goal
          isConditionRequiredForFeatureGoal(gc, fgId, path)
        )
      };
    }).filter(Boolean);
    
    return {
      id: `e2e-${path.type}-${index + 1}`,
      name: `${path.type === 'happy-path' ? 'Happy Path' : 'Error Path'} - ${path.featureGoals.join(' → ')}`,
      type: path.type,
      priority: path.type === 'error-path' ? 'P0' : 'P1',
      bpmnProcess: path.bpmnProcess,
      featureGoals: path.featureGoals,
      steps,
      gatewayConditions: path.gatewayConditions
    };
  });
}
```

---

### 2. Använda gateway-conditions som Given-conditions

**Process:**
- Gateway-conditions blir **Given-conditions** i E2E-scenarios
- T.ex. om en gateway har condition `${creditDecision.approved === true}`, blir Given: "Kreditbeslut är godkänt"

**Exempel:**
```typescript
function convertGatewayConditionToGiven(condition: string): string {
  // Konvertera BPMN condition till Given-text
  // T.ex. "${creditDecision.approved === true}" → "Kreditbeslut är godkänt"
  
  // Enkel regex-baserad konvertering (kan förbättras med Claude)
  if (condition.includes('approved === true')) {
    return "Kreditbeslut är godkänt";
  }
  if (condition.includes('approved === false')) {
    return "Kreditbeslut är avvisat";
  }
  if (condition.includes('amount >')) {
    const match = condition.match(/amount > (\d+)/);
    if (match) {
      return `Lånebelopp är större än ${match[1]}`;
    }
  }
  
  // Fallback: använd condition som Given
  return condition.replace(/\$\{|\}/g, '').replace(/===|!==|>|<|>=|<=/g, 'är');
}
```

---

### 3. Identifiera error paths

**Process:**
- Identifiera paths som slutar i **error events**
- Dessa blir **error-path** E2E-scenarios

**Exempel:**
```typescript
function identifyErrorPaths(paths: Path[], graph: FlowGraph): Path[] {
  return paths.filter(path => {
    const endNode = graph.nodes.get(path.endEvent);
    return endNode?.type === 'endEvent' && 
           endNode.name?.toLowerCase().includes('error') ||
           endNode.id?.toLowerCase().includes('error');
  });
}
```

---

## 📊 Vad kan vi faktiskt extrahera från BPMN?

### Vad vi KAN extrahera (90-100%)

**1. Gateway-struktur:**
- ✅ Gateway-ID och namn
- ✅ Gateway-typ (exclusive, parallel, inclusive)
- ✅ Outgoing sequence flows

**2. Sequence Flow-struktur:**
- ✅ Source och target noder
- ✅ Sequence flow-ID

**3. Path-struktur:**
- ✅ Paths från start-event till end-event
- ✅ Feature Goals (Call Activities) i varje path
- ✅ Ordning på Feature Goals i pathen

---

### Vad vi INTE kan extrahera direkt (0-30%)

**1. Conditions (semantik):**
- ⚠️ Conditions finns i XML som `${creditDecision.approved === true}`
- ⚠️ Men vi kan inte förstå **semantiken** utan att analysera koden
- ⚠️ Vi kan extrahera **texten**, men inte **betydelsen**

**2. Business logic:**
- ❌ Vad som faktiskt händer när en condition är true/false
- ❌ Hur data flödar mellan Feature Goals
- ❌ Vad som händer vid error events

---

## 🎯 Rekommenderad approach

### 1. Extrahera strukturell information från BPMN

**Vad vi gör:**
1. **Parsa BPMN-filen** för att hitta gateways, sequence flows, conditions
2. **Bygga en flödesgraf** av noder och edges
3. **Identifiera paths** från start-event till end-event
4. **Extrahera conditions** som text (t.ex. `${creditDecision.approved === true}`)

**Output:**
```typescript
{
  paths: [
    {
      type: "happy-path",
      featureGoals: ["internal-data-gathering", "credit-decision", "offer"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === true}",
          conditionText: "creditDecision.approved === true"
        }
      ]
    },
    {
      type: "error-path",
      featureGoals: ["internal-data-gathering", "credit-decision"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === false}",
          conditionText: "creditDecision.approved === false"
        }
      ],
      errorEvent: "EndEvent_Rejected"
    }
  ]
}
```

---

### 2. Använda Claude för att förstå conditions

**Vad vi gör:**
1. **Skicka conditions till Claude** tillsammans med Feature Goal-dokumentation
2. **Låt Claude förstå semantiken** och konvertera till Given-conditions
3. **Låt Claude identifiera** vilka Feature Goals som behövs för varje condition

**Exempel:**
```typescript
const context = {
  gatewayConditions: [
    {
      gatewayId: "Gateway_1",
      gatewayName: "Is credit approved?",
      condition: "${creditDecision.approved === true}",
      conditionText: "creditDecision.approved === true"
    }
  ],
  featureGoals: {
    "credit-decision": {
      summary: "Kreditbeslut fattas baserat på insamlad data",
      flowSteps: ["Systemet fattar kreditbeslut", "Beslut sparas"],
      userStories: [...]
    }
  }
};

const claudeResponse = await claude.analyze({
  prompt: "Konvertera BPMN gateway-conditions till Given-conditions för E2E-scenarios",
  context
});

// Claude returnerar:
// {
//   givenConditions: [
//     "Kreditbeslut är godkänt (creditDecision.approved === true)",
//     "Kreditbeslut är fattat (credit-decision Feature Goal är komplett)"
//   ]
// }
```

---

### 3. Generera E2E-scenarios med gateway-information

**Process:**
1. **För varje path**: Skapa en E2E-scenario
2. **För varje Feature Goal i pathen**: Lägg till ett steg
3. **För varje gateway-condition**: Lägg till Given-conditions (från Claude)
4. **För error paths**: Lägg till error event-information

**Output:**
```typescript
{
  id: "e2e-happy-path-1",
  name: "Happy Path - Köp bostadsrätt",
  type: "happy-path",
  priority: "P1",
  bpmnProcess: "mortgage-se-application.bpmn",
  featureGoals: [
    "internal-data-gathering",
    "credit-decision",
    "offer"
  ],
  steps: [
    {
      order: 1,
      featureGoal: "internal-data-gathering",
      action: "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata",
      assertion: "Intern kunddata är hämtad och kvalitetssäkrad",
      prerequisites: [
        "Kreditansökan har registrerats i systemet",
        "Grundläggande kund- och ansökningsdata är validerade"
      ]
    },
    {
      order: 2,
      featureGoal: "credit-decision",
      action: "Systemet fattar kreditbeslut baserat på insamlad data",
      assertion: "Kreditbeslut är fattat och tillgängligt",
      prerequisites: [
        "Intern och extern kreditdata är hämtad och validerad"
      ],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === true}",
          givenCondition: "Kreditbeslut är godkänt" // Från Claude
        }
      ]
    },
    {
      order: 3,
      featureGoal: "offer",
      action: "Systemet skapar erbjudande baserat på kreditbeslut",
      assertion: "Erbjudande är skapat och tillgängligt",
      prerequisites: [
        "Kreditbeslut är godkänt",
        "Kreditbeslut är fattat"
      ]
    }
  ]
}
```

---

## 📝 Slutsats

**Vad vi KAN göra:**
- ✅ Extrahera gateway-struktur från BPMN (90-100%)
- ✅ Identifiera paths genom processen (90-100%)
- ✅ Extrahera conditions som text (90-100%)
- ✅ Använda Claude för att förstå conditions (70-80%)

**Vad vi INTE kan göra direkt:**
- ❌ Förstå conditions semantik utan Claude (0-30%)
- ❌ Förstå business logic utan Feature Goal-dokumentation (0-30%)

**Rekommendation:**
- **Extrahera strukturell information** från BPMN (gateways, paths, conditions)
- **Använd Claude** för att förstå conditions och konvertera till Given-conditions
- **Kombinera BPMN-struktur med Feature Goal-dokumentation** för att generera E2E-scenarios

---

**Datum:** 2025-12-22
**Status:** Analys klar

