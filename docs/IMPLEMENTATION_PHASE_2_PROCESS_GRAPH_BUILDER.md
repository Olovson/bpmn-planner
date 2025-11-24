# 🟩 FAS 2 – ProcessGraph Builder
### _“Bygg den riktiga grafen: processer, callActivities, tasks, edges, cykler, order.”_

## 🎯 Mål för FAS 2

Utifrån det som gjordes i **FAS 1** ska vi nu:

1. Implementera en **ProcessGraphBuilder** som:
   - läser `BpmnParseResult`
   - skapar **ProcessGraphNode** för process, callActivity, userTask, serviceTask, businessRuleTask
   - skapar **ProcessGraphEdge** för `subprocess` (callActivity → subprocess-process) och `sequence`
   - fyller `roots`, `missingDependencies`

2. Implementera **cykeldetektion** på subprocess-länkar.

3. Implementera **lokal sekvensordning** per fil:
   - lägga in `orderIndex`, `branchId`, `scenarioPath` i `node.metadata`

4. Ha **tester** som verifierar Mortgage-caset, cykler och matchning.

---

## 📂 ProcessGraphBuilder-modul

**Fil:** `src/lib/bpmn/processGraphBuilder.ts`

### Publikt API

```ts
import type { BpmnMap } from './bpmnMapLoader';
import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from './processGraph';
import type { BpmnParseResult } from './bpmnParserTypes';

export interface ProcessGraphBuilderOptions {
  bpmnMap?: BpmnMap;
  preferredRootProcessId?: string;
}

export function buildProcessGraph(
  parseResults: Map<string, BpmnParseResult>,
  options: ProcessGraphBuilderOptions = {}
): ProcessGraph {
  // TODO: implement
}
```

---

## 🧩 1. Indexering av processer, callActivities, tasks

```ts
interface ProcessDefinition {
  id: string;       // processId
  name?: string;
  fileName: string;
  bpmnElementId: string;
}

function indexProcesses(parseResults: Map<string, BpmnParseResult>): ProcessDefinition[] {
  const defs: ProcessDefinition[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    for (const proc of parse.processes) {
      defs.push({
        id: proc.id,
        name: proc.name,
        fileName,
        bpmnElementId: proc.id,
      });
    }
  }

  return defs;
}

interface RawCallActivity {
  id: string;
  name?: string;
  calledElement?: string;
  fileName: string;
  processId: string;
}

interface RawTask {
  id: string;
  name?: string;
  type: 'userTask' | 'serviceTask' | 'businessRuleTask';
  fileName: string;
  processId: string;
}

function indexCallActivities(parseResults: Map<string, BpmnParseResult>): RawCallActivity[] {
  const items: RawCallActivity[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    for (const proc of parse.processes) {
      for (const ca of proc.callActivities ?? []) {
        items.push({
          id: ca.id,
          name: ca.name,
          calledElement: ca.calledElement,
          fileName,
          processId: proc.id,
        });
      }
    }
  }

  return items;
}

function indexTasks(parseResults: Map<string, BpmnParseResult>): RawTask[] {
  const items: RawTask[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    for (const proc of parse.processes) {
      const addTasks = (list: any[] | undefined, type: RawTask['type']) => {
        for (const t of list ?? []) {
          items.push({
            id: t.id,
            name: t.name,
            type,
            fileName,
            processId: proc.id,
          });
        }
      };

      addTasks(proc.userTasks, 'userTask');
      addTasks(proc.serviceTasks, 'serviceTask');
      addTasks(proc.businessRuleTasks, 'businessRuleTask');
    }
  }

  return items;
}
```

---

## 🧩 2. Bygg ProcessGraph-noder

```ts
function buildNodes(
  parseResults: Map<string, BpmnParseResult>
): Map<string, ProcessGraphNode> {
  const nodes = new Map<string, ProcessGraphNode>();

  for (const [fileName, parse] of parseResults.entries()) {
    for (const proc of parse.processes) {
      const processNodeId = `process:${fileName}:${proc.id}`;

      nodes.set(processNodeId, {
        id: processNodeId,
        type: 'process',
        name: proc.name,
        bpmnFile: fileName,
        bpmnElementId: proc.id,
        processId: proc.id,
        metadata: {},
      });

      for (const ca of proc.callActivities ?? []) {
        const caNodeId = `callActivity:${fileName}:${ca.id}`;
        nodes.set(caNodeId, {
          id: caNodeId,
          type: 'callActivity',
          name: ca.name,
          bpmnFile: fileName,
          bpmnElementId: ca.id,
          processId: proc.id,
          metadata: {
            calledElement: ca.calledElement,
          },
        });
      }

      const addTasks = (list: any[] | undefined, type: ProcessGraphNode['type']) => {
        for (const t of list ?? []) {
          const taskNodeId = `${type}:${fileName}:${t.id}`;
          nodes.set(taskNodeId, {
            id: taskNodeId,
            type,
            name: t.name,
            bpmnFile: fileName,
            bpmnElementId: t.id,
            processId: proc.id,
            metadata: {},
          });
        }
      };

      addTasks(proc.userTasks, 'userTask');
      addTasks(proc.serviceTasks, 'serviceTask');
      addTasks(proc.businessRuleTasks, 'businessRuleTask');
    }
  }

  return nodes;
}
```

---

## 🧩 3. Subprocess-matchningar via bpmn-map

```ts
import { matchCallActivityUsingMap } from './bpmnMapLoader';
import type { MissingDependency } from './processGraph';

interface SubprocessMatch {
  callActivityNodeId: string;
  callActivityRaw: RawCallActivity;
  targetProcessDef?: ProcessDefinition;
  matchSource: 'bpmn-map' | 'none'; // fuzzy kan läggas till senare
}

function matchSubprocesses(
  callActivities: RawCallActivity[],
  processDefs: ProcessDefinition[],
  bpmnMap?: BpmnMap
): { matches: SubprocessMatch[]; missing: MissingDependency[] } {
  const matches: SubprocessMatch[] = [];
  const missing: MissingDependency[] = [];

  for (const ca of callActivities) {
    let match: SubprocessMatch | undefined;

    if (bpmnMap) {
      const mapRes = matchCallActivityUsingMap(
        { id: ca.id, name: ca.name, calledElement: ca.calledElement },
        ca.fileName,
        bpmnMap
      );

      if (mapRes.matchedFileName) {
        const proc = processDefs.find(p => p.fileName === mapRes.matchedFileName);
        if (proc) {
          match = {
            callActivityNodeId: `callActivity:${ca.fileName}:${ca.id}`,
            callActivityRaw: ca,
            targetProcessDef: proc,
            matchSource: 'bpmn-map',
          };
        } else {
          missing.push({
            fromNodeId: `callActivity:${ca.fileName}:${ca.id}`,
            missingFileName: mapRes.matchedFileName,
            context: { reason: 'map-file-not-found' },
          });
        }
      }
    }

    if (!match) {
      missing.push({
        fromNodeId: `callActivity:${ca.fileName}:${ca.id}`,
        missingProcessId: ca.calledElement,
        context: { reason: 'no-match' },
      });
      match = {
        callActivityNodeId: `callActivity:${ca.fileName}:${ca.id}`,
        callActivityRaw: ca,
        targetProcessDef: undefined,
        matchSource: 'none',
      };
    }

    matches.push(match);
  }

  return { matches, missing };
}

function buildSubprocessEdges(
  matches: SubprocessMatch[],
  nodes: Map<string, ProcessGraphNode>
): ProcessGraphEdge[] {
  const edges: ProcessGraphEdge[] = [];

  for (const m of matches) {
    if (!m.targetProcessDef) continue;

    const fromId = m.callActivityNodeId;
    const toId = `process:${m.targetProcessDef.fileName}:${m.targetProcessDef.id}`;

    if (!nodes.has(fromId) || !nodes.has(toId)) continue;

    const edgeId = `subprocess:${fromId}->${toId}`;

    edges.push({
      id: edgeId,
      from: fromId,
      to: toId,
      type: 'subprocess',
      metadata: {
        matchSource: m.matchSource,
      },
    });
  }

  return edges;
}
```

---

## 🧩 4. Sequence-edges per fil

```ts
import { extractSequenceFlows } from './sequenceFlowExtractor';

function buildSequenceEdgesForFile(
  fileName: string,
  parseResult: BpmnParseResult,
  nodes: Map<string, ProcessGraphNode>
): ProcessGraphEdge[] {
  const flows = extractSequenceFlows(parseResult);
  const edges: ProcessGraphEdge[] = [];

  for (const flow of flows) {
    const sourceNode = [...nodes.values()].find(
      n => n.bpmnFile === fileName && n.bpmnElementId === flow.sourceRef
    );
    const targetNode = [...nodes.values()].find(
      n => n.bpmnFile === fileName && n.bpmnElementId === flow.targetRef
    );

    if (!sourceNode || !targetNode) continue;

    const edgeId = `sequence:${fileName}:${flow.id}`;
    edges.push({
      id: edgeId,
      from: sourceNode.id,
      to: targetNode.id,
      type: 'sequence',
      metadata: {
        sequenceFlowId: flow.id,
        condition: flow.condition,
      },
    });
  }

  return edges;
}
```

---

## ⚠️ 5. Cykeldetektion på subprocess-kedjan

```ts
function detectCycles(graph: ProcessGraph): CycleInfo[] {
  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  const edgesByFrom = new Map<string, ProcessGraphEdge[]>();
  for (const edge of graph.edges.values()) {
    if (edge.type !== 'subprocess') continue;
    const list = edgesByFrom.get(edge.from) ?? [];
    list.push(edge);
    edgesByFrom.set(edge.from, list);
  }

  function dfs(nodeId: string, path: string[]) {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycleNodes = cycleStart >= 0 ? path.slice(cycleStart) : [nodeId];

      cycles.push({
        nodes: cycleNodes,
        type: cycleNodes.length === 1 ? 'direct' : 'indirect',
        severity: 'warning',
        message: 'Subprocess cycle detected',
      });
      return;
    }

    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);

    for (const edge of edgesByFrom.get(nodeId) ?? []) {
      dfs(edge.to, [...path, nodeId]);
    }

    stack.delete(nodeId);
  }

  for (const rootId of graph.roots) {
    dfs(rootId, []);
  }

  return cycles;
}
```

---

## ⏱️ 6. Lokal sekvensordning (orderIndex per fil)

```ts
interface OrderInfo {
  orderIndex: number;
  branchId: string;
  scenarioPath: string[];
}

function assignLocalOrderForFile(
  fileName: string,
  nodes: ProcessGraphNode[],
  edges: ProcessGraphEdge[]
): Map<string, OrderInfo> {
  const sequenceEdges = edges.filter(e => e.type === 'sequence');
  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  for (const n of nodes) {
    adjacency.set(n.id, []);
    incoming.set(n.id, 0);
  }

  for (const e of sequenceEdges) {
    if (!adjacency.has(e.from) || !adjacency.has(e.to)) continue;
    adjacency.get(e.from)!.push(e.to);
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }

  const startNodes = nodes.filter(n => (incoming.get(n.id) ?? 0) === 0);
  const orderMap = new Map<string, OrderInfo>();
  const visited = new Set<string>();
  let globalOrder = 0;

  function dfs(nodeId: string, branchId: string, scenarioPath: string[]) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    orderMap.set(nodeId, {
      orderIndex: globalOrder++,
      branchId,
      scenarioPath,
    });

    const succ = adjacency.get(nodeId) ?? [];
    if (succ.length === 0) return;

    if (succ.length === 1) {
      dfs(succ[0], branchId, scenarioPath);
    } else {
      const [first, ...rest] = succ;
      dfs(first, branchId, scenarioPath);

      rest.forEach((id, idx) => {
        const newBranchId = `${branchId}-branch-${idx + 1}`;
        const newScenarioPath = [...scenarioPath, newBranchId];
        dfs(id, newBranchId, newScenarioPath);
      });
    }
  }

  startNodes.forEach((n, idx) => {
    const branchId = idx === 0 ? 'main' : `entry-${idx + 1}`;
    const path = [branchId];
    dfs(n.id, branchId, path);
  });

  return orderMap;
}
```

Applicera sedan `orderIndex`, `branchId`, `scenarioPath` på `node.metadata`.

---

## 🧪 7. Tester för FAS 2

Exempel på testfiler:

- `processGraphBuilder.mortgage.test.ts`
- `processGraphBuilder.cycles.test.ts`

Testfall:

1. **Mortgage-case**
   - parse mortgage BPMN
   - bygg ProcessGraph
   - förvänta root-process, subprocess-edges, rimligt antal noder/edges

2. **Cykel-fixture**
   - A → B → A
   - förvänta minst en `CycleInfo`

3. **Map mismatch**
   - felaktig bpmn-map
   - förvänta `missingDependencies` med rätt context

4. **Sekvensordning**
   - enkel process med 3 tasks i rad
   - förvänta `orderIndex` = 0,1,2 på rätt noder

---

## ✅ Exit-kriterier för FAS 2

| Krav | Beskrivning |
|------|-------------|
| ProcessGraphBuilder bygger noder + edges | Mortgage-case fungerar |
| Subprocess-matchning via bpmn-map | Korrekt matchning eller missingDependencies |
| Cykeldetektion fungerar | Cykel-fixture flaggas |
| Lokal orderIndex per fil | Tasks sorteras korrekt |
| Tester täcker Mortgage, cycles, map-mismatch, ordning | Alla gröna |
