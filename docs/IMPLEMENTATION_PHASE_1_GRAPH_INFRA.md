# 🟦 FAS 1 — Grafinfrastruktur (vecka 1–2)
### _“Bygg fundamentet: datatyper, sequence flows, deterministisk bpmn-map.”_

## 🎯 Mål för FAS 1
- Definiera **alla officiella typer** för ProcessGraph.  
- Implementera **sequence flow extraction**.  
- Implementera **bpmn-map.json loader + deterministisk matchning**.  
- Skapa en **minimal ProcessGraph skeleton** för tester.  
- Sätta upp **tester** (>= 80 % för nya filer).  
- Inga meta-beroenden i ny kod.

---

## 🧩 1. Skapa ProcessGraph datamodeller

**Fil:** `src/lib/bpmn/processGraph.ts`

```ts
export type ProcessGraphNodeType =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'gateway'
  | 'event'
  | 'dmnDecision';

export interface ProcessGraphNode {
  id: string;
  type: ProcessGraphNodeType;
  name?: string;
  bpmnFile: string;
  bpmnElementId: string;
  processId?: string;
  metadata: Record<string, unknown>;
}

export type ProcessGraphEdgeType =
  | 'subprocess'
  | 'sequence'
  | 'hierarchy';

export interface ProcessGraphEdge {
  id: string;
  from: string;
  to: string;
  type: ProcessGraphEdgeType;
  metadata: Record<string, unknown>;
}

export interface CycleInfo {
  nodes: string[];
  type: 'direct' | 'indirect';
  severity: 'error' | 'warning';
  message?: string;
}

export interface MissingDependency {
  fromNodeId: string;
  missingProcessId?: string;
  missingFileName?: string;
  context?: Record<string, unknown>;
}

export interface ProcessGraph {
  nodes: Map<string, ProcessGraphNode>;
  edges: Map<string, ProcessGraphEdge>;
  roots: string[];
  cycles: CycleInfo[];
  missingDependencies: MissingDependency[];
}
```

---

## 🔄 2. Sequence Flow Extraction

**Fil:** `src/lib/bpmn/sequenceFlowExtractor.ts`

### Funktioner att implementera:

```ts
export interface NormalizedSequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
  condition?: string;
}

export function extractSequenceFlows(parseResult: BpmnParseResult): NormalizedSequenceFlow[] {
  return parseResult.sequenceFlows.map(flow => ({
    id: flow.id,
    sourceRef: flow.sourceRef,
    targetRef: flow.targetRef,
    condition: flow.condition,
  }));
}

export function buildSequenceGraph(
  nodes: ProcessGraphNode[],
  flows: NormalizedSequenceFlow[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const node of nodes) graph.set(node.id, []);

  for (const flow of flows) {
    const sourceNode = nodes.find(n => n.bpmnElementId === flow.sourceRef);
    const targetNode = nodes.find(n => n.bpmnElementId === flow.targetRef);
    if (sourceNode && targetNode) {
      graph.get(sourceNode.id)!.push(targetNode.id);
    }
  }

  return graph;
}

export function findStartNodes(
  nodes: ProcessGraphNode[],
  flows: NormalizedSequenceFlow[]
): string[] {
  const targets = new Set(flows.map(f => f.targetRef));
  return nodes
    .filter(n => !targets.has(n.bpmnElementId))
    .map(n => n.id);
}
```

---

## 📦 3. bpmn-map.json Integration

**Fil:** `src/lib/bpmn/bpmnMapLoader.ts`

### Typer:

```ts
export interface BpmnMap {
  orchestration?: { root_process?: string };
  processes: Array<{
    id: string;
    bpmn_file: string;
    process_id: string;
    call_activities: Array<{
      bpmn_id: string;
      name?: string;
      called_element?: string;
      subprocess_bpmn_file?: string;
    }>;
  }>;
}
```

### Loader:

```ts
export function loadBpmnMap(raw: unknown): BpmnMap {
  if (!raw || typeof raw !== 'object') throw new Error("Invalid bpmn-map.json");
  const map = raw as BpmnMap;
  if (!Array.isArray(map.processes)) throw new Error("Invalid map: processes missing");
  return map;
}
```

### Deterministisk matchning:

```ts
export function matchCallActivityUsingMap(
  callActivity: { id: string; name?: string; calledElement?: string },
  bpmnFile: string,
  bpmnMap: BpmnMap
): { matchedFileName?: string; matchSource: 'bpmn-map' | 'none' } {
  const proc = bpmnMap.processes.find(p => p.bpmn_file === bpmnFile);
  if (!proc) return { matchSource: 'none' };

  const entry = proc.call_activities.find(
    ca =>
      ca.bpmn_id === callActivity.id ||
      ca.name === callActivity.name ||
      ca.called_element === callActivity.calledElement
  );

  if (entry?.subprocess_bpmn_file) {
    return { matchedFileName: entry.subprocess_bpmn_file, matchSource: 'bpmn-map' };
  }

  return { matchSource: 'none' };
}
```

---

## 🧪 4. Minimal ProcessGraph Skeleton

**Fil:** `src/lib/bpmn/processGraphUtils.ts`

```ts
export function createProcessGraphSkeletonFromParseResults(
  parseResults: Map<string, BpmnParseResult>
): ProcessGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    roots: [],
    cycles: [],
    missingDependencies: [],
  };
}
```

Syftet är endast att möjliggöra test av sequence flows och map-matching.

---

## 🧪 5. Tester (>=80 % täckning)

**Testfiler:**

- `sequenceFlowExtractor.mortgage.test.ts`
- `bpmnMapLoader.test.ts`
- `processGraphSkeleton.test.ts`

Dessa ska verifiera:

- Extractor hittar alla flöden  
- StartNodes fungerar  
- Graph adjacency är korrekt  
- bpmn-map hittar rätt subprocess  
- skeleton-graph kompilerar och fungerar som stub  

---

## 🟢 Exit-kriterier för FAS 1

| Krav | Status |
|------|--------|
| ProcessGraph-typer implementerade | ✔️ |
| Sequence flows extraheras korrekt | ✔️ |
| bpmn-map används deterministiskt | ✔️ |
| Tester >80 % täckning | ✔️ |
| Ingen ny kod använder meta | ✔️ |
| Skeleton-graph fungerar | ✔️ |
