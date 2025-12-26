# Säkerställa att alla leaf nodes analyseras för E2E-scenarios

## 🎯 Syfte

Analysera hur vi säkerställer att alla leaf nodes (end events) i BPMN-processen analyseras för att skapa E2E-scenarios korrekt, även utan konkreta API:er och GUI.

---

## 📊 Vad är en leaf node i BPMN?

### Definition

**Leaf node:** En nod som inte har några utgående edges (sequence flows), dvs. en slutpunkt i processen.

**I BPMN:**
- **End Events** (normala slutpunkter)
- **Error Events** (error-slutpunkter)
- **Terminate Events** (terminate-slutpunkter)

**Exempel:**
```xml
<bpmn:endEvent id="Event_0j4buhs" name="Application complete" />
<bpmn:endEvent id="application-rejected" name="Application rejected">
  <bpmn:errorEventDefinition errorRef="Error_08o6vkh" />
</bpmn:endEvent>
```

---

## 🔍 Problem: Hur säkerställer vi att alla leaf nodes analyseras?

### Problem 1: Identifiera alla leaf nodes

**Vad vi behöver:**
- Identifiera alla end events i BPMN-processen
- Identifiera alla error events
- Identifiera alla terminate events
- Identifiera alla paths som leder till varje leaf node

**Nuvarande implementation:**
```typescript
// src/lib/bpmnFlowExtractor.ts
export function findEndEvents(graph: FlowGraph): FlowNode[] {
  const endEvents: FlowNode[] = [];
  graph.nodes.forEach(node => {
    if (node.type === 'endEvent') {
      endEvents.push(node);
    }
  });
  return endEvents;
}
```

**Problem:**
- ✅ Identifierar end events korrekt
- ❌ Identifierar inte error events separat
- ❌ Identifierar inte terminate events separat
- ❌ Identifierar inte alla paths till varje leaf node

---

### Problem 2: Säkerställa att alla paths till leaf nodes analyseras

**Vad vi behöver:**
- Identifiera alla möjliga paths från start-event till varje leaf node
- Säkerställa att varje path har ett E2E-scenario
- Identifiera saknade paths (gaps i coverage)

**Nuvarande implementation:**
```typescript
// src/lib/bpmnFlowExtractor.ts
export function findPathsThroughProcess(
  graph: FlowGraph,
  startEventId: string
): ProcessPath[] {
  // Traverserar från start-event till end-events
  // Men identifierar inte om alla leaf nodes har paths
}
```

**Problem:**
- ✅ Identifierar paths från start-event till end-events
- ❌ Säkerställer inte att alla leaf nodes har paths
- ❌ Identifierar inte saknade paths (gaps i coverage)

---

### Problem 3: Använda beskrivningar från Feature Goals

**Vad vi behöver:**
- Använda Feature Goal-beskrivningar för att skapa scenarios
- Använda `flowSteps`, `userStories`, `prerequisites` från Feature Goals
- Skapa scenarios även utan konkreta API:er och GUI

**Nuvarande implementation:**
- ✅ Feature Goals har `flowSteps`, `userStories`, `prerequisites`
- ✅ Kan användas för att skapa scenarios
- ❌ Används inte systematiskt för att säkerställa coverage

---

## 💡 Lösning: Systematisk analys av alla leaf nodes

### Steg 1: Identifiera alla leaf nodes

**Vad vi gör:**
1. Extrahera alla end events från BPMN
2. Extrahera alla error events
3. Extrahera alla terminate events
4. Kategorisera leaf nodes (normal, error, terminate)

**Implementation:**
```typescript
export interface LeafNode {
  id: string;
  name: string;
  type: 'endEvent' | 'errorEvent' | 'terminateEvent';
  errorRef?: string; // För error events
  paths: ProcessPath[]; // Alla paths som leder till denna leaf node
}

export function identifyAllLeafNodes(graph: FlowGraph): LeafNode[] {
  const leafNodes: LeafNode[] = [];
  
  graph.nodes.forEach(node => {
    if (node.type === 'endEvent') {
      // Kolla om det är ett error event
      const isErrorEvent = node.name?.toLowerCase().includes('error') || 
                          node.name?.toLowerCase().includes('rejected');
      
      leafNodes.push({
        id: node.id,
        name: node.name,
        type: isErrorEvent ? 'errorEvent' : 'endEvent',
        paths: [] // Fylls i senare
      });
    }
  });
  
  return leafNodes;
}
```

---

### Steg 2: Identifiera alla paths till varje leaf node

**Vad vi gör:**
1. För varje leaf node, hitta alla paths från start-event
2. Identifiera Feature Goals i varje path
3. Identifiera gateway-conditions i varje path
4. Kategorisera paths (happy-path, alt-path, error)

**Implementation:**
```typescript
export function findPathsToLeafNode(
  graph: FlowGraph,
  startEventId: string,
  leafNodeId: string
): ProcessPath[] {
  const paths: ProcessPath[] = [];
  const visited = new Set<string>();
  
  function traverse(
    currentNodeId: string,
    currentPath: string[],
    gatewayConditions: GatewayCondition[]
  ) {
    if (visited.has(currentNodeId)) return;
    
    visited.add(currentNodeId);
    const node = graph.nodes.get(currentNodeId);
    if (!node) {
      visited.delete(currentNodeId);
      return;
    }
    
    // Om vi når target leaf node, spara pathen
    if (currentNodeId === leafNodeId) {
      const featureGoals = currentPath.filter(id => {
        const n = graph.nodes.get(id);
        return n?.type === 'callActivity';
      });
      
      paths.push({
        type: determinePathType(gatewayConditions, node),
        startEvent: startEventId,
        endEvent: leafNodeId,
        featureGoals,
        gatewayConditions,
        nodeIds: [...currentPath, currentNodeId]
      });
      visited.delete(currentNodeId);
      return;
    }
    
    // Fortsätt traversera...
    // (samma logik som findPathsThroughProcess)
  }
  
  traverse(startEventId, [], []);
  return paths;
}
```

---

### Steg 3: Säkerställa coverage för alla leaf nodes

**Vad vi gör:**
1. För varje leaf node, identifiera alla paths
2. För varje path, skapa E2E-scenario
3. Identifiera saknade paths (gaps i coverage)
4. Generera scenarios med Claude baserat på Feature Goals

**Implementation:**
```typescript
export interface LeafNodeCoverage {
  leafNode: LeafNode;
  paths: ProcessPath[];
  scenarios: E2eScenario[];
  coverage: {
    totalPaths: number;
    coveredPaths: number;
    coveragePercentage: number;
    missingPaths: ProcessPath[];
  };
}

export function analyzeLeafNodeCoverage(
  graph: FlowGraph,
  startEventId: string,
  existingScenarios: E2eScenario[]
): LeafNodeCoverage[] {
  const leafNodes = identifyAllLeafNodes(graph);
  const coverage: LeafNodeCoverage[] = [];
  
  leafNodes.forEach(leafNode => {
    // Hitta alla paths till denna leaf node
    const paths = findPathsToLeafNode(graph, startEventId, leafNode.id);
    
    // Matcha befintliga scenarios mot paths
    const coveredPaths = paths.filter(path => {
      return existingScenarios.some(scenario => 
        matchesPath(scenario, path)
      );
    });
    
    const missingPaths = paths.filter(path => 
      !coveredPaths.includes(path)
    );
    
    coverage.push({
      leafNode,
      paths,
      scenarios: existingScenarios.filter(s => 
        s.bpmnProcess === leafNode.id
      ),
      coverage: {
        totalPaths: paths.length,
        coveredPaths: coveredPaths.length,
        coveragePercentage: (coveredPaths.length / paths.length) * 100,
        missingPaths
      }
    });
  });
  
  return coverage;
}
```

---

### Steg 4: Använda Feature Goal-beskrivningar för saknade paths

**Vad vi gör:**
1. För varje saknad path, identifiera Feature Goals
2. Läs Feature Goal-dokumentation (redan genererad)
3. Använd `flowSteps`, `userStories`, `prerequisites` för att skapa scenario
4. Generera scenario med Claude baserat på Feature Goals

**Implementation:**
```typescript
export async function generateScenarioForPath(
  path: ProcessPath,
  featureGoalDocs: Map<string, FeatureGoalDoc>
): Promise<E2eScenario> {
  // 1. Identifiera Feature Goals i pathen
  const featureGoals = path.featureGoals.map(fgId => {
    return featureGoalDocs.get(fgId);
  }).filter(Boolean);
  
  // 2. Bygg context för Claude
  const claudeContext = {
    path: {
      startEvent: path.startEvent,
      endEvent: path.endEvent,
      featureGoals: featureGoals.map(fg => ({
        id: fg.id,
        summary: fg.summary,
        flowSteps: fg.flowSteps,
        userStories: fg.userStories,
        prerequisites: fg.prerequisites,
        outputs: fg.outputs
      })),
      gatewayConditions: path.gatewayConditions
    }
  };
  
  // 3. Anropa Claude för att generera scenario
  const claudeResponse = await claude.generateScenario(claudeContext);
  
  // 4. Returnera genererat scenario
  return {
    id: generateScenarioId(path),
    name: claudeResponse.name,
    summary: claudeResponse.summary,
    given: claudeResponse.given,
    when: claudeResponse.when,
    then: claudeResponse.then,
    bankProjectTestSteps: claudeResponse.bankProjectTestSteps,
    subprocessSteps: claudeResponse.subprocessSteps,
    // ... andra fält
  };
}
```

---

## 📊 Exempel: Analys av leaf nodes

### Exempel 1: Identifiera alla leaf nodes

**BPMN-process:**
```xml
<bpmn:endEvent id="Event_0j4buhs" name="Application complete" />
<bpmn:endEvent id="application-rejected" name="Application rejected">
  <bpmn:errorEventDefinition errorRef="Error_08o6vkh" />
</bpmn:endEvent>
<bpmn:endEvent id="Event_07jlrhu" name="Object rejected">
  <bpmn:errorEventDefinition errorRef="Error_1pe398g" />
</bpmn:endEvent>
```

**Identifierade leaf nodes:**
```typescript
[
  {
    id: "Event_0j4buhs",
    name: "Application complete",
    type: "endEvent",
    paths: []
  },
  {
    id: "application-rejected",
    name: "Application rejected",
    type: "errorEvent",
    errorRef: "Error_08o6vkh",
    paths: []
  },
  {
    id: "Event_07jlrhu",
    name: "Object rejected",
    type: "errorEvent",
    errorRef: "Error_1pe398g",
    paths: []
  }
]
```

---

### Exempel 2: Identifiera paths till leaf node

**Leaf node:** `Event_0j4buhs` (Application complete)

**Paths:**
```typescript
[
  {
    type: "happy-path",
    startEvent: "Event_0isinbn",
    endEvent: "Event_0j4buhs",
    featureGoals: ["internal-data-gathering", "object", "credit-decision"],
    gatewayConditions: [
      {
        gatewayId: "is-purchase",
        gatewayName: "Is purchase?",
        condition: "Yes"
      },
      {
        gatewayId: "is-automatically-approved",
        gatewayName: "Automatically approved?",
        condition: "Yes"
      }
    ]
  }
]
```

---

### Exempel 3: Säkerställa coverage

**Leaf node coverage:**
```typescript
{
  leafNode: {
    id: "Event_0j4buhs",
    name: "Application complete",
    type: "endEvent"
  },
  paths: [
    // Path 1: happy-path
    // Path 2: alt-path (manuell godkännande)
    // Path 3: alt-path (med review)
  ],
  scenarios: [
    // E2E_BR001: Happy path
    // E2E_BR002: Alt path (manuell godkännande)
  ],
  coverage: {
    totalPaths: 3,
    coveredPaths: 2,
    coveragePercentage: 66.7,
    missingPaths: [
      // Path 3: alt-path (med review) - saknas scenario
    ]
  }
}
```

---

### Exempel 4: Generera scenario för saknad path

**Saknad path:**
```typescript
{
  type: "alt-path",
  startEvent: "Event_0isinbn",
  endEvent: "Event_0j4buhs",
  featureGoals: ["internal-data-gathering", "object", "credit-decision"],
  gatewayConditions: [
    {
      gatewayId: "is-automatically-approved",
      gatewayName: "Automatically approved?",
      condition: "No" // Manuell godkännande
    }
  ]
}
```

**Feature Goal-dokumentation:**
```typescript
{
  "credit-decision": {
    summary: "Kreditbeslut fattas baserat på insamlad data",
    flowSteps: [
      "Systemet utvärderar kredit automatiskt",
      "Om automatisk godkännande misslyckas, eskaleras till handläggare",
      "Handläggare granskar och fattar beslut"
    ],
    userStories: [
      {
        role: "Handläggare",
        goal: "Jag vill granska kreditansökan",
        value: "Så att jag kan fatta ett informerat beslut",
        acceptanceCriteria: "Handläggare kan granska alla relevanta data och fatta beslut"
      }
    ]
  }
}
```

**Genererat scenario (med Claude):**
```typescript
{
  id: "E2E_BR002",
  name: "E2E-BR-002: Manuell kreditgodkännande (Alt Path)",
  type: "alt-path",
  given: "Ansökan är klar för kreditevaluering. Automatisk godkännande misslyckas (is-automatically-approved = No).",
  when: "Systemet eskaleras till handläggare. Handläggare granskar kreditansökan och fattar beslut.",
  then: "Kreditbeslut är godkänt av handläggare. Processen fortsätter till Offer.",
  bankProjectTestSteps: [
    {
      bpmnNodeId: "credit-decision",
      action: "Handläggare granskar kreditansökan och fattar beslut",
      // Claude kan generera detta från Feature Goal userStories
      // Även utan konkreta API:er och GUI
    }
  ]
}
```

---

## 🎯 Slutsats: Hur säkerställer vi att alla leaf nodes analyseras?

### Steg 1: Identifiera alla leaf nodes ✅

**Vad vi gör:**
- Extrahera alla end events, error events, terminate events
- Kategorisera leaf nodes (normal, error, terminate)

**Implementation:**
- `identifyAllLeafNodes()` - identifierar alla leaf nodes

---

### Steg 2: Identifiera alla paths till varje leaf node ✅

**Vad vi gör:**
- För varje leaf node, hitta alla paths från start-event
- Identifiera Feature Goals och gateway-conditions i varje path

**Implementation:**
- `findPathsToLeafNode()` - identifierar alla paths till en leaf node

---

### Steg 3: Säkerställa coverage ✅

**Vad vi gör:**
- För varje leaf node, identifiera alla paths
- Matcha befintliga scenarios mot paths
- Identifiera saknade paths (gaps i coverage)

**Implementation:**
- `analyzeLeafNodeCoverage()` - analyserar coverage för alla leaf nodes

---

### Steg 4: Använda Feature Goal-beskrivningar ✅

**Vad vi gör:**
- För varje saknad path, identifiera Feature Goals
- Läs Feature Goal-dokumentation (redan genererad)
- Använd `flowSteps`, `userStories`, `prerequisites` för att skapa scenario
- Generera scenario med Claude baserat på Feature Goals

**Implementation:**
- `generateScenarioForPath()` - genererar scenario för saknad path med Claude

---

## 💡 Viktigt: Använda beskrivningar från Feature Goals

**Även utan konkreta API:er och GUI kan vi:**

1. ✅ **Använda `flowSteps`** för att beskriva vad som händer
   - Exempel: "Systemet hämtar kundinformation"
   - Exempel: "Systemet utvärderar kredit automatiskt"

2. ✅ **Använda `userStories`** för att beskriva användarinteraktioner
   - Exempel: "Kunden fyller i ansökan"
   - Exempel: "Handläggare granskar kreditansökan"

3. ✅ **Använda `prerequisites`** för att beskriva Given-conditions
   - Exempel: "Kund är identifierad"
   - Exempel: "Intern data är tillgänglig"

4. ✅ **Använda `outputs`** för att beskriva Then-assertions
   - Exempel: "Application.status = 'COMPLETE'"
   - Exempel: "Kreditbeslut är godkänt"

**Claude kan använda dessa beskrivningar för att skapa scenarios, även utan konkreta API:er och GUI.**

---

**Datum:** 2025-12-22
**Status:** Analys klar - Systematisk approach för att säkerställa leaf node coverage







