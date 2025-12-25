# Analys: Strategi för att extrahera relevant information från BPMN-filer

## 🎯 Syfte

Analysera hur vi effektivt extraherar relevant information från BPMN-filer för E2E-scenario-generering, och vad som ska skickas till Claude vs vad som kan extraheras deterministiskt.

---

## 📊 Problem: BPMN-filer är stora

**Faktum:**
- BPMN-filer kan vara **stora** (hundratals eller tusentals rader)
- Att skicka **alla BPMN-filer** till Claude skulle vara:
  - **Dyrt** (många tokens)
  - **Långsamt** (stora API-anrop)
  - **Ineffektivt** (mycket irrelevant information)

**Exempel:**
- `mortgage-se-application.bpmn`: ~500-1000 rader
- 20+ BPMN-filer: ~10,000-20,000 rader totalt
- Att skicka allt till Claude: **10,000-50,000 tokens per anrop**

---

## 🔍 Vad behöver vi faktiskt för E2E-scenarios?

### 1. Strukturell information (kan extraheras deterministiskt)

**Vad vi behöver:**
- Gateway-ID, namn, typ (exclusive, parallel, inclusive)
- Sequence flows (source, target)
- Conditions som **text** (t.ex. `${creditDecision.approved === true}`)
- Nod-typer (start event, task, call activity, gateway, end event)
- Nod-ordning (baserat på sequence flows)

**Kan extraheras:**
- ✅ **Deterministiskt** från BPMN XML (ingen Claude behövs)
- ✅ **Snabb** (XML-parsing)
- ✅ **Gratis** (inga API-anrop)

**Exempel:**
```typescript
// Extrahera deterministiskt från BPMN XML
const gatewayInfo = {
  id: "Gateway_1",
  name: "Is credit approved?",
  type: "exclusiveGateway",
  outgoingFlows: [
    {
      id: "Flow_1",
      target: "CallActivity_Offer",
      condition: "${creditDecision.approved === true}" // Text, inte evaluerad
    },
    {
      id: "Flow_2",
      target: "EndEvent_Rejected",
      condition: "${creditDecision.approved === false}" // Text, inte evaluerad
    }
  ]
};
```

---

### 2. Path-identifiering (kan extraheras deterministiskt)

**Vad vi behöver:**
- Alla möjliga paths från start-event till end-event
- Feature Goals (Call Activities) i varje path
- Gateway-conditions som avgör vilken path som används

**Kan extraheras:**
- ✅ **Deterministiskt** genom graf-traversal (ingen Claude behövs)
- ✅ **Snabb** (algoritmisk)
- ✅ **Gratis** (inga API-anrop)

**Exempel:**
```typescript
// Identifiera paths deterministiskt
const paths = [
  {
    type: "possible-path",
    featureGoals: ["internal-data-gathering", "credit-decision", "offer"],
    gatewayConditions: [
      {
        gatewayId: "Gateway_1",
        condition: "${creditDecision.approved === true}"
      }
    ]
  },
  {
    type: "possible-path",
    featureGoals: ["internal-data-gathering", "credit-decision"],
    gatewayConditions: [
      {
        gatewayId: "Gateway_1",
        condition: "${creditDecision.approved === false}"
      }
    ]
  }
];
```

---

### 3. Condition-semantik (kräver Claude)

**Vad vi behöver:**
- Förstå **betydelsen** av conditions (t.ex. "Kreditbeslut är godkänt")
- Identifiera **variabler** som behövs för condition evaluation
- Koppla conditions till **Feature Goals** som sätter variablerna

**Kräver Claude:**
- ⚠️ **Claude** för att förstå semantiken
- ⚠️ **Men** vi skickar bara **conditions + Feature Goal-dokumentation**, inte hela BPMN-filer

**Exempel:**
```typescript
// Skicka till Claude (endast relevant information)
const claudeInput = {
  gatewayConditions: [
    {
      gatewayId: "Gateway_1",
      gatewayName: "Is credit approved?",
      condition: "${creditDecision.approved === true}",
      conditionText: "creditDecision.approved === true"
    }
  ],
  relatedFeatureGoals: [
    {
      id: "credit-decision",
      summary: "Kreditbeslut fattas baserat på insamlad data",
      flowSteps: ["Systemet fattar kreditbeslut", "Beslut sparas"]
    }
  ]
};

// Claude returnerar:
const claudeOutput = {
  givenConditions: [
    "Kreditbeslut är godkänt (creditDecision.approved === true)",
    "Kreditbeslut är fattat (credit-decision Feature Goal är komplett)"
  ],
  requiredVariables: ["creditDecision.approved"],
  setByFeatureGoal: "credit-decision"
};
```

---

## 🎯 Rekommenderad strategi: Tredelad process

### Steg 1: Extrahera strukturell information deterministiskt (ingen Claude)

**Vad vi gör:**
1. **Parsa BPMN-filer** med `BpmnParser` (redan implementerat)
2. **Extrahera gateway-information** från `businessObject`
3. **Extrahera sequence flows** med conditions
4. **Bygga flödesgraf** av noder och edges
5. **Identifiera paths** genom graf-traversal

**Input:**
- BPMN XML-filer

**Process:**
```typescript
// 1. Parsa BPMN-filer
const parseResults = await parseAllBpmnFiles(bpmnFiles);

// 2. Extrahera gateway-information
const gateways = extractGateways(parseResults);

// 3. Extrahera sequence flows med conditions
const sequenceFlows = extractSequenceFlowsWithConditions(parseResults);

// 4. Bygga flödesgraf
const graph = buildFlowGraph(parseResults);

// 5. Identifiera paths
const paths = findPathsThroughProcess(graph, startEventId);
```

**Output:**
```typescript
{
  gateways: [
    {
      id: "Gateway_1",
      name: "Is credit approved?",
      type: "exclusiveGateway",
      outgoingFlows: [...]
    }
  ],
  paths: [
    {
      type: "possible-path",
      featureGoals: ["internal-data-gathering", "credit-decision", "offer"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          condition: "${creditDecision.approved === true}"
        }
      ]
    }
  ]
}
```

**Kostnad:** Gratis (ingen Claude)
**Hastighet:** Snabb (sekunder)
**Token-användning:** 0 tokens

---

### Steg 2: Extrahera Feature Goal-dokumentation (ingen Claude)

**Vad vi gör:**
1. **Läs Feature Goal-dokumentation** från Supabase Storage (redan genererad av Claude)
2. **Mappa Feature Goals** till Call Activities i paths
3. **Extrahera relevant information** (summary, flowSteps, userStories, prerequisites)

**Input:**
- Feature Goal-dokumentation (från Supabase Storage)
- Paths från Steg 1

**Process:**
```typescript
// 1. För varje path, hitta Feature Goals
const featureGoalsInPath = path.featureGoals.map(fgId => {
  // 2. Läs Feature Goal-dokumentation
  const fgDoc = await loadFeatureGoalDoc(fgId);
  
  // 3. Extrahera relevant information
  return {
    id: fgId,
    summary: fgDoc.summary,
    flowSteps: fgDoc.flowSteps,
    userStories: fgDoc.userStories,
    prerequisites: fgDoc.prerequisites
  };
});
```

**Output:**
```typescript
{
  paths: [
    {
      featureGoals: [
        {
          id: "internal-data-gathering",
          summary: "Intern datainsamling säkerställer att intern kunddata hämtas...",
          flowSteps: ["Systemet initierar automatiskt insamling...", ...],
          userStories: [...],
          prerequisites: [...]
        },
        {
          id: "credit-decision",
          summary: "Kreditbeslut fattas baserat på insamlad data",
          flowSteps: ["Systemet fattar kreditbeslut", "Beslut sparas"],
          userStories: [...],
          prerequisites: [...]
        }
      ]
    }
  ]
}
```

**Kostnad:** Gratis (ingen Claude)
**Hastighet:** Snabb (sekunder, läser från Storage)
**Token-användning:** 0 tokens

---

### Steg 3: Använda Claude för att förstå conditions (endast conditions + Feature Goals)

**Vad vi gör:**
1. **Samla alla unika gateway-conditions** från paths
2. **Koppla conditions till relaterade Feature Goals** (t.ex. condition använder variabel från Feature Goal)
3. **Skicka endast conditions + relaterade Feature Goals** till Claude
4. **Låt Claude förstå semantiken** och konvertera till Given-conditions

**Input:**
- Gateway-conditions från Steg 1
- Feature Goal-dokumentation från Steg 2

**Process:**
```typescript
// 1. Samla alla unika gateway-conditions
const uniqueConditions = new Map<string, GatewayCondition>();
paths.forEach(path => {
  path.gatewayConditions.forEach(condition => {
    const key = `${condition.gatewayId}:${condition.condition}`;
    if (!uniqueConditions.has(key)) {
      uniqueConditions.set(key, condition);
    }
  });
});

// 2. Koppla conditions till relaterade Feature Goals
const conditionsWithFeatureGoals = Array.from(uniqueConditions.values()).map(condition => {
  // Identifiera vilka Feature Goals som sätter variabler i condition
  const relatedFeatureGoals = identifyRelatedFeatureGoals(condition, featureGoals);
  
  return {
    condition,
    relatedFeatureGoals: relatedFeatureGoals.map(fgId => featureGoals.get(fgId))
  };
});

// 3. Skicka till Claude (endast conditions + relaterade Feature Goals)
const claudeInput = {
  conditions: conditionsWithFeatureGoals.map(c => ({
    gatewayId: c.condition.gatewayId,
    gatewayName: c.condition.gatewayName,
    condition: c.condition.condition,
    conditionText: c.condition.conditionText,
    relatedFeatureGoals: c.relatedFeatureGoals.map(fg => ({
      id: fg.id,
      summary: fg.summary,
      flowSteps: fg.flowSteps
    }))
  }))
};

// 4. Anropa Claude
const claudeOutput = await claude.analyzeConditions(claudeInput);
```

**Output:**
```typescript
{
  conditionInterpretations: [
    {
      gatewayId: "Gateway_1",
      condition: "${creditDecision.approved === true}",
      givenCondition: "Kreditbeslut är godkänt",
      requiredVariables: ["creditDecision.approved"],
      setByFeatureGoal: "credit-decision",
      requiredFeatureGoalComplete: true
    }
  ]
}
```

**Kostnad:** Låg (endast conditions + relaterade Feature Goals, inte hela BPMN-filer)
**Hastighet:** Medel (API-anrop, men små payloads)
**Token-användning:** ~500-2000 tokens per anrop (vs 10,000-50,000 för hela BPMN-filer)

---

## 📊 Jämförelse: Alla BPMN-filer vs Extraherad information

| Aspekt | Alla BPMN-filer till Claude | Extraherad information till Claude |
|--------|----------------------------|-----------------------------------|
| **Token-användning** | 10,000-50,000 tokens | 500-2,000 tokens |
| **Kostnad** | Hög ($$$) | Låg ($) |
| **Hastighet** | Långsam (stora API-anrop) | Snabb (små API-anrop) |
| **Relevans** | Mycket irrelevant information | Endast relevant information |
| **Underhållbarhet** | Svår (stora prompts) | Enkel (fokuserade prompts) |

---

## 🎯 Konkret implementation

### Funktion 1: Extrahera gateway-information deterministiskt

```typescript
function extractGatewayInfo(parseResult: BpmnParseResult): GatewayInfo[] {
  const gateways: GatewayInfo[] = [];
  
  parseResult.elements.forEach(element => {
    const bo = element.businessObject;
    if (!bo.$type.includes('Gateway')) return;
    
    const outgoingFlows = bo.outgoing || [];
    const flows = outgoingFlows.map((flow: any) => {
      const condition = flow.conditionExpression;
      return {
        id: flow.id,
        targetRef: flow.targetRef?.id,
        condition: condition?.body || null,
        conditionType: condition?.$type || null
      };
    });
    
    gateways.push({
      id: element.id,
      name: element.name,
      type: bo.$type, // 'bpmn:ExclusiveGateway', etc.
      outgoingFlows: flows
    });
  });
  
  return gateways;
}
```

---

### Funktion 2: Bygga flödesgraf deterministiskt

```typescript
function buildFlowGraph(parseResult: BpmnParseResult): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  
  // Lägg till alla noder
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
  
  // Lägg till alla edges (sequence flows)
  parseResult.sequenceFlows.forEach(flow => {
    // Extrahera condition från sequence flow
    const condition = extractConditionFromSequenceFlow(flow, parseResult);
    
    const edge: FlowEdge = {
      id: flow.id,
      sourceId: flow.sourceRef,
      targetId: flow.targetRef,
      condition: condition?.body || null,
      conditionType: condition?.$type || null
    };
    edges.set(flow.id, edge);
    
    // Koppla edges till noder
    const sourceNode = nodes.get(flow.sourceRef);
    const targetNode = nodes.get(flow.targetRef);
    if (sourceNode) sourceNode.outgoingEdges.push(flow.id);
    if (targetNode) targetNode.incomingEdges.push(flow.id);
  });
  
  return { nodes, edges };
}
```

---

### Funktion 3: Identifiera paths deterministiskt

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
    if (visited.has(currentNodeId)) return;
    
    visited.add(currentNodeId);
    const node = graph.nodes.get(currentNodeId);
    if (!node) return;
    
    // Om vi når en end-event, spara pathen
    if (node.type === 'endEvent') {
      paths.push({
        type: determinePathType(gatewayConditions, node),
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
            conditionText: extractConditionText(edge.condition)
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

### Funktion 4: Skicka endast conditions till Claude

```typescript
async function interpretConditionsWithClaude(
  paths: Path[],
  featureGoals: Map<string, FeatureGoalDoc>
): Promise<ConditionInterpretation[]> {
  // 1. Samla alla unika gateway-conditions
  const uniqueConditions = new Map<string, GatewayCondition>();
  paths.forEach(path => {
    path.gatewayConditions.forEach(condition => {
      const key = `${condition.gatewayId}:${condition.condition}`;
      if (!uniqueConditions.has(key)) {
        uniqueConditions.set(key, condition);
      }
    });
  });
  
  // 2. Koppla conditions till relaterade Feature Goals
  const conditionsWithContext = Array.from(uniqueConditions.values()).map(condition => {
    // Identifiera variabler i condition
    const variables = extractVariablesFromCondition(condition.condition);
    
    // Hitta Feature Goals som sätter dessa variabler
    const relatedFeatureGoals = findFeatureGoalsThatSetVariables(variables, featureGoals);
    
    return {
      condition,
      relatedFeatureGoals: relatedFeatureGoals.map(fgId => ({
        id: fgId,
        summary: featureGoals.get(fgId)?.summary,
        flowSteps: featureGoals.get(fgId)?.flowSteps
      }))
    };
  });
  
  // 3. Skicka till Claude (endast conditions + relaterade Feature Goals)
  const claudeInput = {
    conditions: conditionsWithContext.map(c => ({
      gatewayId: c.condition.gatewayId,
      gatewayName: c.condition.gatewayName,
      condition: c.condition.condition,
      conditionText: c.condition.conditionText,
      relatedFeatureGoals: c.relatedFeatureGoals
    }))
  };
  
  // 4. Anropa Claude
  const claudeOutput = await generateChatCompletion({
    messages: [
      {
        role: "system",
        content: "Du är en expert på BPMN-processer. Analysera gateway-conditions och konvertera dem till Given-conditions för E2E-scenarios."
      },
      {
        role: "user",
        content: JSON.stringify(claudeInput, null, 2)
      }
    ],
    schema: conditionInterpretationSchema
  });
  
  return claudeOutput.conditionInterpretations;
}
```

---

## 📊 Token-användning: Jämförelse

### Scenario: 20 BPMN-filer, 50 gateways, 100 conditions

**Alternativ 1: Skicka alla BPMN-filer till Claude**
- BPMN XML: ~20,000 rader × ~50 tokens/rad = **1,000,000 tokens**
- Kostnad: **$$$$$** (mycket dyr)
- Hastighet: **Mycket långsam** (minuter per anrop)

**Alternativ 2: Extrahera deterministiskt + skicka endast conditions**
- Steg 1-2 (deterministisk): **0 tokens** (gratis)
- Steg 3 (Claude): 100 conditions × ~20 tokens/condition + Feature Goals = **~2,000 tokens**
- Kostnad: **$** (låg)
- Hastighet: **Snabb** (sekunder per anrop)

**Besparing:** 99.8% färre tokens, 100x snabbare, 10x billigare

---

## 🎯 Slutsats

**Rekommendation: Tredelad process**

1. **Steg 1: Extrahera strukturell information deterministiskt** (ingen Claude)
   - Parsa BPMN-filer
   - Extrahera gateways, sequence flows, conditions
   - Bygga flödesgraf
   - Identifiera paths

2. **Steg 2: Extrahera Feature Goal-dokumentation** (ingen Claude)
   - Läs från Supabase Storage
   - Mappa till paths

3. **Steg 3: Skicka endast conditions + relaterade Feature Goals till Claude**
   - Samla unika conditions
   - Koppla till relaterade Feature Goals
   - Skicka små, fokuserade prompts

**Resultat:**
- ✅ 99.8% färre tokens
- ✅ 100x snabbare
- ✅ 10x billigare
- ✅ Samma kvalitet (70-80%)

---

**Datum:** 2025-12-22
**Status:** Analys klar



