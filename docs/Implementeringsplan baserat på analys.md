📘 Innehåll

Introduktion

Övergripande mål

Arkitektur – Target Model

Fas 0 – Förberedelser

Fas 1 – Grafinfrastruktur

Fas 2 – ProcessGraph Builder

Fas 3 – ProcessTree Builder

Fas 4 – Produktintegration

Fas 5 – Testning & Observability

Fas 6 – Debug Tools & CLI

Risker & Mitigering

Bilaga A: Prompt för Fas 1

Bilaga B: BPMN-Domänkrav

🧭 Introduktion

BPMN-Planner bygger upp en kreditprocessmodell bestående av många BPMN-filer.
Varje fil representerar en subprocess, och callActivities knyter samman modellen.

Historiskt har projektet använt:

bpmn_files.meta (Supabase)

ad-hoc hierarki-logik

fuzzy-matching istället för determinism

en blandning av graf, meta och träd

Det har lett till:

felaktiga hierarkier

mismatch mellan client/server

icke-deterministisk matching

förlorad data mellan modeller

ingen global sekvensordning

Den här planen definierar en komplett end-to-end refaktorering där:

ProcessGraph blir enda sanning
ProcessTree blir presentationslagret
All matching blir deterministisk via bpmn-map.json
Sekvensordning stöder projektplanering och dokument/test-generering

🎯 Övergripande mål

Single Source of Truth → ProcessGraph

Full hierarki över alla BPMN-filer

Global sekvensordning, inte lokal per fil

Deterministiska subprocess-matchningar

Robust cykelhantering

Konsistenta artefakter (test, doc, DoR/DoD)

Server/edge och klient använder samma modell

Hela processen ska vara reproducerbar och testbar

🏛️ Arkitektur – Target Model
┌──────────────────────────────────────┐
│  Application Layer                   │
│  - Process Explorer                  │
│  - Documentation Generator           │
│  - Test Generator                    │
│  - Ledger / Registry                 │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Process Tree Layer                  │
│  buildProcessTreeFromGraph           │
│  (rekursiv expansion + flattening)   │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Process Graph Layer                 │
│  buildProcessGraph                   │
│  (parse + map-match + sequence flow) │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Parser Layer                         │
│  BpmnParser, BpmnMeta, File Loader   │
└──────────────────────────────────────┘

FAS 1 — Grafinfrastruktur (vecka 1–2)
“Bygg fundamentet: datatyper, sequence flows, deterministisk bpmn-map.”
🎯 Mål för FAS 1

Definiera alla officiella typer för ProcessGraph.

Implementera sequence flow extraction.

Implementera bpmn-map.json loader + deterministisk matchning.

Skapa en minimal ProcessGraph skeleton för tester.

Sätta upp tester (>= 80 % för nya filer).

Inga meta-beroenden i ny kod.

🧩 1. Skapa ProcessGraph datamodeller

Fil: src/lib/bpmn/processGraph.ts

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

🔄 2. Sequence Flow Extraction

Fil: src/lib/bpmn/sequenceFlowExtractor.ts

Funktioner att implementera:
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

📦 3. bpmn-map.json Integration

Fil: src/lib/bpmn/bpmnMapLoader.ts

Typer:
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

Loader:
export function loadBpmnMap(raw: unknown): BpmnMap {
  if (!raw || typeof raw !== 'object') throw new Error("Invalid bpmn-map.json");
  const map = raw as BpmnMap;
  if (!Array.isArray(map.processes)) throw new Error("Invalid map: processes missing");
  return map;
}

Deterministisk matchning:
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

🧪 4. Minimal ProcessGraph Skeleton

Fil: src/lib/bpmn/processGraphUtils.ts

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


Syftet är endast att möjliggöra test av sequence flows och map-matching.

🧪 5. Tester (>=80 % täckning)

Testfiler:

sequenceFlowExtractor.mortgage.test.ts

bpmnMapLoader.test.ts

processGraphSkeleton.test.ts

Dessa ska verifiera:

Extractor hittar alla flöden

StartNodes fungerar

Graph adjacency är korrekt

bpmn-map hittar rätt subprocess

skeleton-graph kompilerar och fungerar som stub

🟢 Exit-kriterier för FAS 1
Krav	Status
ProcessGraph-typer implementerade	✔️
Sequence flows extraheras korrekt	✔️
bpmn-map används deterministiskt	✔️
Tester >80 % täckning	✔️
Ingen ny kod använder meta	✔️
Skeleton-graph fungerar	✔️













FAS 2 – ProcessGraph Builder
“Bygg den riktiga grafen: processer, callActivities, tasks, edges, cykler, order.”

Den här filen är tänkt att kunna sparas som t.ex.
IMPLEMENTATION_PHASE_2_PROCESS_GRAPH_BUILDER.md
och/eller användas som promptunderlag i Cursor/Codex.

🎯 Mål för FAS 2

Utifrån det som gjordes i FAS 1 (typer + sequenceFlowExtractor + bpmnMapLoader) ska vi nu:

Implementera en ProcessGraphBuilder som:

läser BpmnParseResult (från BpmnParser)

skapar ProcessGraphNode för:

process

callActivity

userTask

serviceTask

businessRuleTask

skapar ProcessGraphEdge för:

subprocess (callActivity → subprocess process)

sequence (sequence flows)

fyller roots, missingDependencies

Implementera cykeldetektion på subprocess-länkar:

upptäcka direkta & indirekta cykler

flagga dem i graph.cycles

Implementera global sekvensordning:

per fil via sequence flows

justera subprocess-ordning relativt sin callActivity

lägga in orderIndex, branchId, scenarioPath i node.metadata

Ha tester som verifierar:

Mortgage-case ger stabil graf

Cykler detekteras i cykliska fixtures

Global ordning är rimlig

📂 Förutsättningar från FAS 1

Följande antas redan finnas:

ProcessGraph, ProcessGraphNode, ProcessGraphEdge, CycleInfo, MissingDependency
→ src/lib/bpmn/processGraph.ts

NormalizedSequenceFlow, extractSequenceFlows, buildSequenceGraph, findStartNodes
→ src/lib/bpmn/sequenceFlowExtractor.ts

BpmnMap, loadBpmnMap, matchCallActivityUsingMap
→ src/lib/bpmn/bpmnMapLoader.ts

BpmnParseResult/BpmnMeta från BpmnParser
→ existerande kodbas

🧩 1. Skapa ProcessGraphBuilder-modul

Fil: src/lib/bpmn/processGraphBuilder.ts

1.1. Publikt API

Börja med ett tydligt interface:

import type { BpmnMap } from './bpmnMapLoader';
import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from './processGraph';
import type { BpmnParseResult } from './bpmnParserTypes'; // anpassa till era faktiska typer

export interface ProcessGraphBuilderOptions {
  bpmnMap?: BpmnMap;
  preferredRootProcessId?: string;     // t.ex. "Mortgage"
}

export function buildProcessGraph(
  parseResults: Map<string, BpmnParseResult>,
  options: ProcessGraphBuilderOptions = {}
): ProcessGraph {
  // TODO: implement
}

1.2. Interna helpers – indexering

Skapa hjälpfunktioner (internt i samma fil):

interface ProcessDefinition {
  id: string;             // processId
  name?: string;
  fileName: string;
  bpmnElementId: string;
}

function indexProcesses(parseResults: Map<string, BpmnParseResult>): ProcessDefinition[] {
  const defs: ProcessDefinition[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    // Antag en eller flera processer per fil (lägg till loop)
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


Liknande för callActivities och tasks:

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

1.3. Skapa noder

Generera ProcessGraphNode för:

process

callActivity

tasks

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

      // callActivities
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

      // tasks
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

1.4. Skapa edges – subprocess-länkar

Använd bpmn-map.json i första hand:

import { matchCallActivityUsingMap } from './bpmnMapLoader';

interface SubprocessMatch {
  callActivityNodeId: string;
  callActivityRaw: RawCallActivity;
  targetProcessDef?: ProcessDefinition;
  matchSource: 'bpmn-map' | 'fuzzy' | 'none';
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

    // TODO (valfritt i FAS 2): fuzzy fallback här
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

1.5. Skapa edges – sequence flows

Här använder vi extractSequenceFlows och knyter dem till nodes:

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


Sammanställ allt i buildProcessGraph.

⚠️ 2. Cykeldetektion

Vi vill detektera cykler i subprocess-kedjan (process → callActivity → process → ...).

Lägg till i processGraphBuilder.ts:

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


I slutet av buildProcessGraph:

graph.cycles = detectCycles(graph);

⏱️ 3. Global sekvensordning

Vi vill ge varje nod:

orderIndex

branchId

scenarioPath

i node.metadata.

Detta görs i två steg:

per fil: sortera noder via sequence flows

över filer: justera subprocess-processers ordning så de “läggs in” efter callActivity

3.1. Per fil – orderIndex

I en ny helper, t.ex. sequenceOrderCalculator.ts eller i samma fil:

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
  // build sequenceGraph: nodeId -> successors
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

  // start nodes = indegree 0
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


Efter detta: applicera orderIndex, branchId, scenarioPath på node.metadata.

3.2. Över filer – parent-child offset

För FAS 2 räcker det att:

ha lokal orderIndex per fil

spara orderIndex i metadata

använda det senare i trädbyggaren för att sortera barn

Full “global” ordning (inklusive offset) kan göras i FAS 3 om det blir för tungt nu.

🧪 4. Tester för FAS 2

Skapa t.ex.:

src/lib/bpmn/__tests__/processGraphBuilder.mortgage.test.ts

src/lib/bpmn/__tests__/processGraphBuilder.cycles.test.ts

Testfall att täcka:

Mortgage-case:

parse all mortgage*.bpmn

bygg ProcessGraph

förvänta:

roots innehåller Mortgage-processen

subprocess-edges för Application/Object/Signing/Disbursement etc.

sequence-edges ≈ antal sequence flows

missingDependencies tom eller endast för medvetet saknade

nodes innehåller tasks (e.g. “Fetch fastighets-information”)

Cykel-fixture:

process A callActivity → process B

process B callActivity → process A

förvänta:

cycles.length >= 1

cycles[0].nodes innehåller båda processerna

bpmn-map mismatch:

medvetet felaktig map-entry

förvänta:

missingDependencies med map-file-not-found

Sekvensordning per fil:

en enkel process med 3 tasks i rad

orderIndex ska vara 0,1,2 i rimlig ordning

✅ Exit-kriterier för FAS 2
Krav	Beskrivning	Klar när…
ProcessGraphBuilder	Bygger noder + edges utifrån parseResults	Mortgage-case fungerar
Subprocess-matchning	Använder bpmn-map först	Alla callActivities mappas rätt eller hamnar i missingDependencies
Cykeldetektion	Cykler i subprocess-kedjan flaggas	Cykel-fixture ger CycleInfo
Lokalt orderIndex	Per fil, baserat på sequence flows	Lokala sekvenser är testade
Tester	Enhetstester täcker Mortgage, cycles, map-mismatch	Tester gröna, rimlig täckning





FAS 3 – ProcessTree Builder
“Bygg den hierarkiska modellen från grafen: ProcessTreeNode från ProcessGraph.”

Den här filen kan sparas som t.ex.
IMPLEMENTATION_PHASE_3_PROCESS_TREE_BUILDER.md
eller användas direkt som prompt i Cursor/Codex.

🎯 Mål för FAS 3

Utifrån FAS 1 (grafinfrastruktur) och FAS 2 (ProcessGraphBuilder) ska vi nu:

Definiera och stabilisera ProcessTreeNode-typen (det officiella trädformatet).

Implementera buildProcessTreeFromGraph:

start från root-process (t.ex. Mortgage)

expandera callActivities → respektive subprocess

inkludera relevanta tasks

använda orderIndex/branchId/scenarioPath från grafen för sortering

Integrera en artifactBuilder-hook:

så test/doc/DoR/DoD kan kopplas på per nod

Implementera valideringslager:

missing subprocess

cykler

ofullständiga matchningar

Göra det möjligt för Process Explorer + generators att konsumera ProcessTreeNode direkt.

📂 Förutsättningar från tidigare faser

Vi antar att detta redan finns:

ProcessGraph, ProcessGraphNode, ProcessGraphEdge, CycleInfo, MissingDependency
→ src/lib/bpmn/processGraph.ts

buildProcessGraph(parseResults, options)
→ src/lib/bpmn/processGraphBuilder.ts

orderIndex, branchId, scenarioPath (åtminstone lokalt per fil)
→ lagrat i node.metadata i ProcessGraph

BpmnParseResult, BpmnParser
→ existerande parserlager

🧩 1. Definiera ProcessTreeNode

Fil: src/lib/bpmn/processTreeTypes.ts (ny)
(eller buildProcessTreeFromGraph.ts om ni vill hålla det nära)

export type ProcessTreeNodeType =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask';

export interface NodeArtifact {
  kind: 'test' | 'doc' | 'dor' | 'dod' | string;
  id: string;
  label?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

export interface DiagnosticsEntry {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface SubprocessLink {
  callActivityId: string;
  callActivityName?: string;
  matchedProcessId?: string;
  matchedFileName?: string;
  matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  matchSource?: 'bpmn-map' | 'fuzzy' | 'calledElement' | 'none';
}

export interface ProcessTreeNode {
  // identitet
  id: string;               // unikt inom trädet (t.ex. "process:mortgage.bpmn:Mortgage" eller "userTask:mortgage-se-application.bpmn:Task_1")
  label: string;            // visningsnamn (node.name eller liknande)
  type: ProcessTreeNodeType;

  // BPMN-referens
  bpmnFile: string;
  bpmnElementId?: string;   // BPMN-elementets id
  processId?: string;       // process-id för process/nod

  // ordning
  orderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];

  // subprocess-länk (för callActivities)
  subprocessFile?: string;
  subprocessLink?: SubprocessLink;

  // hierarki
  children: ProcessTreeNode[];

  // artefakter (test/doc/DoR/DoD etc)
  artifacts?: NodeArtifact[];

  // diagnostik (cykler, missing, ambiguous, etc)
  diagnostics?: DiagnosticsEntry[];
}

export type ArtifactBuilder = (bpmnFile: string, bpmnElementId?: string) => NodeArtifact[];

🧩 2. Grundstruktur för buildProcessTreeFromGraph

Fil: src/lib/bpmn/buildProcessTreeFromGraph.ts

import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from './processGraph';
import type { ProcessTreeNode, ArtifactBuilder, SubprocessLink, DiagnosticsEntry } from './processTreeTypes';

export interface BuildTreeOptions {
  rootProcessId?: string;       // t.ex. "Mortgage"
  preferredRootFile?: string;   // t.ex. "mortgage.bpmn"
  artifactBuilder?: ArtifactBuilder;
}

const defaultArtifactBuilder: ArtifactBuilder = () => [];

export function buildProcessTreeFromGraph(
  graph: ProcessGraph,
  options: BuildTreeOptions = {}
): ProcessTreeNode {
  const artifactBuilder = options.artifactBuilder ?? defaultArtifactBuilder;

  const rootProcessNode = pickRootProcessNode(graph, options);
  if (!rootProcessNode) {
    throw new Error('No root process node found for ProcessTree');
  }

  const visitedProcesses = new Set<string>(); // för cykelhantering i rekursion

  return buildProcessNodeRecursive(
    graph,
    rootProcessNode,
    visitedProcesses,
    artifactBuilder
  );
}


Vi behöver nu implementera:

pickRootProcessNode

buildProcessNodeRecursive

helper-funktioner för:

hämta subprocess-barn

hämta tasks

sortering efter orderIndex

injicera diagnostik

🔍 3. Välj root-process
function pickRootProcessNode(
  graph: ProcessGraph,
  options: BuildTreeOptions
): ProcessGraphNode | undefined {
  const allNodes = [...graph.nodes.values()];
  const processNodes = allNodes.filter(n => n.type === 'process');

  // 1. försök med explicit processId
  if (options.rootProcessId) {
    const byPid = processNodes.find(n => n.processId === options.rootProcessId);
    if (byPid) return byPid;
  }

  // 2. försök med preferredRootFile
  if (options.preferredRootFile) {
    const byFile = processNodes.find(n => n.bpmnFile === options.preferredRootFile);
    if (byFile) return byFile;
  }

  // 3. använd graph.roots, om de pekar på process-noder
  for (const rootId of graph.roots) {
    const node = graph.nodes.get(rootId);
    if (node?.type === 'process') return node;
  }

  // 4. fallback: första process-noden
  return processNodes[0];
}

🌳 4. Rekursiv byggnad av trädet
4.1. Hämta barn för en process

Vi behöver två typer av barn:

callActivities (som leder till subprocess-processer)

tasks (userTask, serviceTask, businessRuleTask)

Vi använder graph.edges och graph.nodes.

function getProcessChildren(
  graph: ProcessGraph,
  processNode: ProcessGraphNode
): { callActivities: ProcessGraphNode[]; tasks: ProcessGraphNode[] } {
  const allNodes = [...graph.nodes.values()];

  const callActivities = allNodes.filter(
    n =>
      n.type === 'callActivity' &&
      n.processId === processNode.processId &&
      n.bpmnFile === processNode.bpmnFile
  );

  const tasks = allNodes.filter(
    n =>
      (n.type === 'userTask' ||
        n.type === 'serviceTask' ||
        n.type === 'businessRuleTask') &&
      n.processId === processNode.processId &&
      n.bpmnFile === processNode.bpmnFile
  );

  return { callActivities, tasks };
}

4.2. Hitta subprocess-target för en callActivity
function getSubprocessTarget(
  graph: ProcessGraph,
  callActivityNode: ProcessGraphNode
): ProcessGraphNode | undefined {
  const edgesFromThis = [...graph.edges.values()].filter(
    e => e.type === 'subprocess' && e.from === callActivityNode.id
  );
  if (edgesFromThis.length === 0) return undefined;
  const targetId = edgesFromThis[0].to;
  return graph.nodes.get(targetId);
}

4.3. Sortering per orderIndex
function sortByOrderIndex<T extends ProcessGraphNode>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const ao = (a.metadata.orderIndex as number | undefined) ?? Number.POSITIVE_INFINITY;
    const bo = (b.metadata.orderIndex as number | undefined) ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  });
}

4.4. Konvertera ProcessGraphNode → ProcessTreeNode

Helper:

function baseTreeNodeFromGraphNode(
  graphNode: ProcessGraphNode,
  children: ProcessTreeNode[],
  artifacts: NodeArtifact[],
  diagnostics?: DiagnosticsEntry[]
): ProcessTreeNode {
  const orderIndex = graphNode.metadata.orderIndex as number | undefined;
  const branchId = graphNode.metadata.branchId as string | undefined;
  const scenarioPath = graphNode.metadata.scenarioPath as string[] | undefined;

  return {
    id: graphNode.id,
    label: graphNode.name ?? graphNode.bpmnElementId ?? graphNode.id,
    type: mapGraphNodeTypeToTreeType(graphNode),
    bpmnFile: graphNode.bpmnFile,
    bpmnElementId: graphNode.bpmnElementId,
    processId: graphNode.processId,
    orderIndex,
    branchId,
    scenarioPath,
    children,
    artifacts,
    diagnostics,
  };
}

function mapGraphNodeTypeToTreeType(node: ProcessGraphNode): ProcessTreeNodeType {
  switch (node.type) {
    case 'process':
      return 'process';
    case 'callActivity':
      return 'callActivity';
    case 'userTask':
      return 'userTask';
    case 'serviceTask':
      return 'serviceTask';
    case 'businessRuleTask':
      return 'businessRuleTask';
    default:
      // gateways, events, dmnDecision flattenas normalt bort på tree-nivå
      return 'process'; // fallback (alternativ: kasta fel eller skapa separat typ)
  }
}

4.5. Rekursiv funktion – processnivå
function buildProcessNodeRecursive(
  graph: ProcessGraph,
  processNode: ProcessGraphNode,
  visitedProcesses: Set<string>,
  artifactBuilder: ArtifactBuilder
): ProcessTreeNode {
  const processKey = `${processNode.bpmnFile}:${processNode.processId ?? processNode.bpmnElementId}`;

  const diagnostics: DiagnosticsEntry[] = [];

  if (visitedProcesses.has(processKey)) {
    diagnostics.push({
      severity: 'error',
      code: 'CYCLE_DETECTED',
      message: `Process ${processNode.name ?? processNode.processId ?? processKey} is part of a cycle`,
      context: { processKey },
    });

    // returnera nod utan barn, men med diagnostik
    return baseTreeNodeFromGraphNode(processNode, [], artifactBuilder(processNode.bpmnFile, processNode.bpmnElementId), diagnostics);
  }

  visitedProcesses.add(processKey);

  const { callActivities, tasks } = getProcessChildren(graph, processNode);

  const callActivitiesSorted = sortByOrderIndex(callActivities);
  const tasksSorted = sortByOrderIndex(tasks);

  const children: ProcessTreeNode[] = [];

  // 1. callActivities + deras subprocesser
  for (const ca of callActivitiesSorted) {
    const subprocessTarget = getSubprocessTarget(graph, ca);

    let subprocessDiagnostics: DiagnosticsEntry[] | undefined;
    let subprocessFile: string | undefined;
    let subprocessLink: SubprocessLink | undefined;
    const artifacts = artifactBuilder(ca.bpmnFile, ca.bpmnElementId);

    if (!subprocessTarget) {
      subprocessDiagnostics = [
        {
          severity: 'warning',
          code: 'MISSING_SUBPROCESS',
          message: `CallActivity ${ca.name ?? ca.bpmnElementId} has no matched subprocess`,
          context: { callActivityId: ca.id, bpmnFile: ca.bpmnFile },
        },
      ];
    } else {
      subprocessFile = subprocessTarget.bpmnFile;
      subprocessLink = {
        callActivityId: ca.bpmnElementId,
        callActivityName: ca.name,
        matchedProcessId: subprocessTarget.processId,
        matchedFileName: subprocessTarget.bpmnFile,
        matchStatus: 'matched',
        matchSource: (ca.metadata.matchSource as any) ?? 'bpmn-map',
      };
    }

    const callActivityTreeNode: ProcessTreeNode = {
      ...baseTreeNodeFromGraphNode(ca, [], artifacts, subprocessDiagnostics),
      subprocessFile,
      subprocessLink,
    };

    // expandera subprocessens BARN (vi kan välja att inte lägga in processen själv som nodnivå)
    if (subprocessTarget) {
      const subprocessTree = buildProcessNodeRecursive(
        graph,
        subprocessTarget,
        visitedProcesses,
        artifactBuilder
      );

      // val 1: lägg subprocess-processen som eget child
      // callActivityTreeNode.children.push(subprocessTree);

      // val 2: flattena och bara visa subprocessens barn:
      callActivityTreeNode.children.push(...subprocessTree.children);
    }

    children.push(callActivityTreeNode);
  }

  // 2. tasks (löv)
  for (const t of tasksSorted) {
    const artifacts = artifactBuilder(t.bpmnFile, t.bpmnElementId);
    const taskNode = baseTreeNodeFromGraphNode(t, [], artifacts);
    children.push(taskNode);
  }

  visitedProcesses.delete(processKey);

  const processArtifacts = artifactBuilder(processNode.bpmnFile, processNode.processId ?? processNode.bpmnElementId);

  return baseTreeNodeFromGraphNode(processNode, children, processArtifacts, diagnostics.length ? diagnostics : undefined);
}

⚙️ 5. Validering & diagnostik

Utöver cykel + missing subprocess (i rekursionslogiken) kan vi:

injicera diagnostik från graph.cycles och graph.missingDependencies in i rot-noden

alt. skapa en “diagnostics-nod” som syskon

Minimal variant i FAS 3:

Cykler hanteras via visitedProcesses i rekursion

Missing subprocess hanteras i getSubprocessTarget (ingen match → diagnostic på callActivity)

En mer avancerad variant kan komma i FAS 5 (observability).

🧪 6. Tester för FAS 3

Skapa t.ex.:

src/lib/bpmn/__tests__/buildProcessTreeFromGraph.mortgage.test.ts

src/lib/bpmn/__tests__/buildProcessTreeFromGraph.missingSubprocess.test.ts

src/lib/bpmn/__tests__/buildProcessTreeFromGraph.cycles.test.ts

Testfall att täcka:

Mortgage “happy path”

bygg ProcessGraph från mortgage-fixtures

bygg ProcessTree med rootProcessId = Mortgage

förvänta:

root.type === 'process'

children innehåller callActivities: Application, Object, Signing, Disbursement …

under Application finns tasks i ordning (via orderIndex)

inga diagnostik entries av severity 'error'

Missing subprocess

en callActivity utan match i bpmn-map eller processDefs

förvänta:

callActivity-nod finns i tree

den har diagnostics med code 'MISSING_SUBPROCESS'

Cycle

A → B → A

förvänta:

minst en process-nod får diagnostics med 'CYCLE_DETECTED'

rekursion stoppas, dvs. trädet är ändligt

ArtifactBuilder

injicera en dummy artifactBuilder som returnerar t.ex. [{ kind: 'test', id: 'T-1' }]

förvänta:

artifacts finns på process- och tasknoder

✅ Exit-kriterier för FAS 3
Krav	Beskrivning	Klar när…
ProcessTreeNode-typ	Stabil, dokumenterad typ för trädet	Alla tree-konsumenter använder den
buildProcessTreeFromGraph	Bygger korrekt träd från ProcessGraph	Mortgage-case fungerar, tester gröna
Rekursiv expansion	callActivities expanderas till subprocesser	Djup > 1 stöds
Sorting/ordning	Barn sorteras via orderIndex	Tasks i Application visas i rätt ordning
Artifact-hook	artifactBuilder används	Minst ett test använder den
Diagnostik	Missing subprocess & cykler markeras	Tester för MISSING_SUBPROCESS & CYCLE_DETECTED är gröna





FAS 4 – Produktintegration (vecka 7–8)
“Koppla samman nya Graph/Tree-modellen med Process Explorer, generators och Edge Functions.”

Den här filen kan sparas som:
IMPLEMENTATION_PHASE_4_PRODUCT_INTEGRATION.md

🎯 Mål för FAS 4

Nu när FAS 1–3 är klara (grafen, sekvenslogik och trädet) är fokus:

Koppla in ProcessTree som enda datakälla i

Process Explorer UI

Dokumentationsgeneratorn

Testgeneratorn

DoR/DoD-generatorn

Uppdatera Edge Functions

build-process-tree

generate-artifacts

Migrera bort all meta-baserad logik

Säkerställa att hela flödet:
BPMN → Graph → Tree → UI & Generators
fungerar deterministiskt och konsekvent.

Det här är refaktoreringsfasen där appen “byter motor”.

📦 Filer och moduler som berörs i FAS 4
Front-end

src/hooks/useProcessTree.ts

src/pages/ProcessExplorer.tsx

src/components/ProcessTreeD3.tsx

Alla ställen där ProcessNodeModel, HierarchyNode, ProcessDefinition, collectProcessDefinitionsFromMeta fortfarande används

Back-end / Edge Functions

supabase/functions/build-process-tree

supabase/functions/generate-artifacts

Tidigare meta-relaterad kod:

bpmn_files.meta

bpmn_dependencies

Artefaktkoppling:

test-generation

documentation-generation

ledger (node registry)

BPMN Generation / Artifacts

src/lib/bpmnGenerators.ts

src/lib/bpmn/artifactBuilder.ts (skapas i Fas 3 eller här)

🧭 Steg 1 — Uppdatera useProcessTree()
🎯 Mål

Låt React-klienten använda endast ProcessGraph → ProcessTree, inte gamla meta.

Ta bort alla anrop till:

buildProcessHierarchy

buildProcessModelFromDefinitions

collectProcessDefinitionsFromMeta

buildProcessTreeFromModel

📄 Ny struktur

Före (förenklat):

const { files, dependencies } = useMeta();
const defs = collectProcessDefinitionsFromMeta(files);
const model = buildProcessModelFromDefinitions(defs);
const tree = buildProcessTree(model);
return tree;


Efter (graf-baserat):

const parseResults = await loadAllBpmnFilesFromStorage();
const graph = buildProcessGraph(parseResults, { map, fuzzy: true });
const tree = buildProcessTreeFromGraph(graph, {
  rootProcessId,
  artifactBuilder,
});
return tree;

🎯 Effekter

Process Explorer blir helt deterministiskt.

Ändringar i BPMN avspeglas direkt.

Ingen “meta drift” kan uppstå.

🧭 Steg 2 — Uppdatera Process Explorer UI
🎯 Mål

ProcessTreeNode ska användas direkt av UI.

Uppgifter:

Ersätt gamla typer

Ta bort:

ProcessNodeModel

HierarchyNode

Introducera:

ProcessTreeNode

Uppdatera node rendering

node.label

node.type

node.orderIndex

node.branchId

node.scenarioPath

Uppdatera navigering

Klick på callActivity → expandera children

Klick på process → collapsa/expandera

Klick på task → visa artifacts

Lägg in diagnostik badges

Missing subprocess

Cycle detected

Ambiguous match

Low confidence

Håll allt utan meta

Visa:

node.bpmnFile

node.bpmnElementId

Exempel på rendering:
<div className={`node ${node.type}`}>
  <span>{node.label}</span>
  <span className="order">{node.orderIndex}</span>
  {node.diagnostics?.map(d => (
    <Badge key={d.code} variant={d.severity}>{d.code}</Badge>
  ))}
</div>

🧭 Steg 3 — Integrera ProcessTree i dokumentationsgeneratorn
🎯 Mål

Generera dokumentation direkt från ProcessTree:

testscenarier

feature docs

epics

DoR/DoD

processbeskrivningar

Åtgärder
1. Uppdatera all generator-kod:

Före:

generateDocsFromModel(processModel)


Efter:

generateDocsFromTree(processTree)

2. Exportera strukturer som:

Steg-1 → Mortgage

Steg-2 → Application

Steg-3 → Tasks under Application

3. Använd branchId + scenarioPath:

bra för parallella flöden

tydliga tester per gren

🧭 Steg 4 — Integrera ProcessTree i testgeneratorn
🎯 Mål

Testgeneratorn ska bygga specifikationer som speglar verklig flödesordning.

Uppgifter:

Varje ProcessTreeNode genererar:

describe-block (process, callActivity)

it-block (tasks)

scenarioPath → test-scenario-identifierare

Använd orderIndex globalt

testnummer = orderIndex

ArtefaktBuilder sköter metadata:

const artifacts = artifactBuilder(node.bpmnFile, node.bpmnElementId);


Ta bort allt som bygger på meta

inga egna matchningar i generatorn

inga lokala flödesmodeller

🧭 Steg 5 — Uppdatera Edge Functions
🎯 5.1 build-process-tree (den stora)

Före:

Den funktion du har idag bygger ett meta-baserat tree.

Tar aldrig hänsyn till graf/sekvenser.

Beroende av bpmn_files.meta.

Efter:

Baserad på:

Läs BPMN-filer from storage

Parse alla filer → BpmnParseResult

Bygg ProcessGraph

Utvärdera sekvensordning

Bygg ProcessTree

Returnera JSON

Exempelstruktur (pseudokod):
const parseResults = await loadAllFiles();
const bpmnMap = await loadBpmnMap();
const graph = buildProcessGraph(parseResults, { bpmnMap });
const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

return Response.json(tree);

Avlägsna:

all metaByFile kod

all parsing av bpmn_files.meta

matchCallActivityToProcesses(meta)

parseTaskNodesFromMeta(meta)

🎯 5.2 generate-artifacts

Byt ut:

processModel → processTree

🧭 Steg 6 — “Meta purge” (städa bort allt meta-relaterat)
Ta bort:

bpmn_files.meta

processDefinitions

collectProcessDefinitionsFromMeta

buildProcessModelFromDefinitions

HierarchyNode

buildProcessHierarchy

convertProcessModelChildren

buildProcessTreeFromModel

Rensa UI och serversidor:

ersätt alla koddelar som läser meta

rensa cache och storage av meta

Resultat = ren kodbas där BPMN → Graph → Tree är den enda vägen.

🔍 Steg 7 — Sanity checks innan vi fortsätter

När integrationen är klar, kör:

✓ Mortgage end-to-end-test

scrolla Process Explorer → ser alla noder

inga fel

sekvensordning korrekt

✓ Dokumentation genererad

epics i rätt ordning

✓ Tests genererade

describe-hierarkin matchar trädet

✓ Edge Functions returnerar rätt träd
🧪 Tester i FAS 4

Integrationstest för Process Explorer (smoke)

Regressionstest på mortgage-process-tree JSON (snapshot)

Integrationstest: bygg-process-tree edge → test på faktisk output

Migrationstest: dokument, DoR/DoD, test-generation → snapshot jämfört med förväntad struktur

🟢 Exit-kriterier för FAS 4
Krav	Status
Process Explorer använder ProcessTree	✔️
Dokumentation använder ProcessTree	✔️
Testgenerator använder ProcessTree	✔️
build-process-tree edge använder Graph+Tree	✔️
Inga meta-beroenden kvar	✔️
Mortgage e2e fungerar i UI	✔️
Snapshot av processTree stabil	✔️







FAS 5 – Testning & Observability
“Gör hela BPMN-kedjan testbar, mätbar och felsökbar.”

Spara t.ex. som
IMPLEMENTATION_PHASE_5_TESTING_AND_OBSERVABILITY.md
eller använd direkt som prompt i Cursor/Codex.

🎯 Mål för FAS 5

När FAS 1–4 är klara har ni:

Parser → ProcessGraph → ProcessTree

UI (Process Explorer) som använder ProcessTree

Generators (docs/tests/DoR/DoD) på ProcessTree

Edge functions uppkopplade mot Graph/Tree

FAS 5 handlar om att:

Bygga en systematisk testmatris (unit + integration + e2e).

Införa snapshot-baserade regressions-tester för hela Mortgage-processen.

Lägg till observability:

logging för cykler, missing dependencies, matchningsproblem

möjlighet att inspektera Graph/Tree-resultat från server-sidan.

Målet är att framtida förändringar i BPMN, Graph eller Tree inte ska kunna smyga in regressions utan att ni ser det direkt.

🧱 Del 1 – Testmatris (Unit, Integration, E2E)
1.1. Definiera testmatrisen

Skapa ett dokument (om du vill) TEST_STRATEGY.md (kan göras av AI), men tekniskt handlar det om:

Testnivåer:

Unit tests

processGraph.ts

sequenceFlowExtractor.ts

bpmnMapLoader.ts

processGraphBuilder.ts

buildProcessTreeFromGraph.ts

Integrationstester

parse → graph → tree på Mortgage-fixtures

generate-docs-from-tree

generate-tests-from-tree

E2E / UI smoke

ladda Process Explorer

navigera i trädet

se att nodantal, labels, ordning är rimliga

1.2. Unit tests – komplettera och hårdna

Gå igenom:

src/lib/bpmn/__tests__/*.test.ts

Säkerställ att ni har täckning för:

a) sequenceFlowExtractor

enkel linjär process

branch med gateway (2 parallella flöden)

loop (om relevant)

b) processGraphBuilder

korrekta noder (process, callActivity, tasks)

subprocess-edges korrekt via bpmn-map

missingDependencies fylls vid mismatch

c) buildProcessTreeFromGraph

korrekt hierarki

expansionslogik för callActivity

cycles → tree-diagnostics

missing subprocess → diagnostics på callActivity

✅ Mål: Hög täckning (men inte perfektion), särskilt runt edge cases.

1.3. Integrationstester – mortgage end-to-end som kod, inte UI

Skapa t.ex.:

src/lib/bpmn/__tests__/mortgage.e2e.test.ts

Testa pipeline:

// pseudokod
const parseResults = loadMortgageFixturesAndParse();
const bpmnMap = loadMortgageMap();
const graph = buildProcessGraph(parseResults, { bpmnMap });
const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

// assertions
expect(tree.label).toBe('Mortgage'); // eller motsv.
expect(tree.children.some(c => c.label.includes('Application'))).toBe(true);
// osv.


Fokusera på:

antal noder (ungefärlig nivå)

root label/type

att centrala subprocesser finns (Application, Object, Signing, Disbursement, etc.)

inga errors i diagnostics på “happy path”

1.4. E2E smoke – Process Explorer

Beroende på stack (Playwright, Cypress, Vitest + jsdom etc):

Starta dev/mocked backend eller kör mot local Supabase/edge.

Öppna Process Explorer.

Vänta tills trädet laddats.

Kontrollera:

att root-noden visas

att minst X noder finns i renderad DOM

att ett klick på “Application” expanderar dess children

att inga konsol-errors uppstår

Syftet här är inte 100 % UI-coverage utan “fångar vi att något är totalt trasigt?”.

🧾 Del 2 – Snapshot-regressioner

Snapshot-tester är extremt värdefulla för just en processmodell som kumulativt byggs från BPMN.

2.1. Snapshot av ProcessTree för Mortgage

Skapa test:

src/lib/bpmn/__tests__/mortgage.tree.snapshot.test.ts

Pseudokod:

it('matches Mortgage ProcessTree snapshot', () => {
  const parseResults = loadMortgageFixturesAndParse();
  const bpmnMap = loadMortgageMap();
  const graph = buildProcessGraph(parseResults, { bpmnMap });
  const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

  expect(tree).toMatchSnapshot();
});


Första körningen skapar snapshot-filen.
Efter det:

Varje ändring i BPMN eller builderkoden som ändrar output kräver aktivt godkännande (update snapshot) → ni ser exakt vad som förändras.

Obs:
För att undvika över-spammade diffar:

se till att era noder inte innehåller tidsstämplar eller nondeterministiska fält

d.v.s. håll DiagnosticsEntry.timestamp etc. utanför trädet, eller mocka dem

2.2. Snapshot av genererade artefakter (valfritt men rekommenderas)

För exempel:

genererade testfiler (text)

genererade dokument (markdown/HTML)

genererade DoR/DoD-data

Skapa t.ex.:

src/lib/bpmn/__tests__/mortgage.tests.snapshot.test.ts

src/lib/bpmn/__tests__/mortgage.docs.snapshot.test.ts

Dessa:

tar ProcessTree

kör generatorn

snapshot:ar resultatet (som string eller strukturerad JSON)

Det ger er:

en tydlig bild när genererad output ändras

en “safety net” när ni uppdaterar generators eller ProcessTree-datastrukturen

👀 Del 3 – Observability (logging + serverinspektion)

Nu handlar det om att få insyn när något är fel – inte bara “testerna failar”.

Vi fokuserar på:

logging från edge functions

möjlighet att via en debug-endpoint få ut Graph/Tree + diagnostik

3.1. Logging i Edge Functions

Ta t.ex. supabase/functions/build-process-tree.

Lägg in strukturerad loggning:

console.log(
  JSON.stringify({
    level: 'info',
    event: 'build-process-tree.start',
    rootProcessId,
    fileCount: parseResults.size,
  })
);

// efter graph-build
console.log(
  JSON.stringify({
    level: 'info',
    event: 'build-process-tree.graphBuilt',
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.size,
    cycles: graph.cycles,
    missingDependencies: graph.missingDependencies,
  })
);

// efter tree-build
console.log(
  JSON.stringify({
    level: 'info',
    event: 'build-process-tree.treeBuilt',
    rootLabel: tree.label,
    totalNodes: countTreeNodes(tree),
    diagnosticsSummary: summarizeDiagnostics(tree),
  })
);


Hjälpfunktioner:

function countTreeNodes(root: ProcessTreeNode): number {
  return 1 + root.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
}

function summarizeDiagnostics(root: ProcessTreeNode): Record<string, number> {
  const counts: Record<string, number> = {};

  function visit(node: ProcessTreeNode) {
    (node.diagnostics ?? []).forEach(d => {
      const key = `${d.severity}:${d.code}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    node.children.forEach(visit);
  }

  visit(root);
  return counts;
}


Det gör att ni t.ex. via Supabase logs eller liknande snabbt ser:

hur många noder

hur många cykler

hur många missing subprocess-per körning

3.2. Debug-endpoint för Graph/Tree (server-side)

I supabase/functions/build-process-tree kan ni lägga till t.ex. en query-flag:

?debug=graph

?debug=tree

Pseudokod:

const debugMode = url.searchParams.get('debug');

if (debugMode === 'graph') {
  return Response.json({
    nodes: [...graph.nodes.values()],
    edges: [...graph.edges.values()],
    cycles: graph.cycles,
    missingDependencies: graph.missingDependencies,
  });
}

if (debugMode === 'tree') {
  return Response.json(tree);
}


Det här är guld när:

AI-agenten jobbar “blind” på kodsidan

du vill inspektera resultatet live i browsern

du vill jämföra output före/efter en förändring

3.3. UI-hook för diagnostik

I Process Explorer (eller särskild debug-sida):

visa:

<div>
  <h3>Diagnostics summary</h3>
  <ul>
    <li>Error: MISSING_SUBPROCESS: {count}</li>
    <li>Warning: CYCLE_DETECTED: {count}</li>
    {/* etc */}
  </ul>
</div>


Du kan t.ex. ha en liten panel i sidfoten:

“Diagnostics: 0 errors, 3 warnings, 0 info”

Det gör att man direkt ser om modellen är frisk.

📊 Del 4 – Monitoring-light

Om du vill gå ett snäpp längre (inte nödvändigt men nice):

logga build-process-tree.durationMs

logga “size”:

nodes

edges

treeNodes

Det kan användas för:

performance-regressioner

threshold (t.ex. varna om > Nms eller > X noder)

✅ Exit-kriterier för FAS 5
Krav	Beskrivning
Unit-testmatris täcker Graph + Tree + Map + Sequence	Ja
Mortgage end-to-end integrationstest finns och är grönt	Ja
Snapshot-test för Mortgage ProcessTree är på plats	Ja
Snapshot-test för minst en generator (doc/test) finns	Ja (rekommenderat)
Edge Function logging ger insyn i cycles/missing deps	Ja
Debug-endpoint (graph/tree) finns och fungerar	Ja
UI visar någon form av diagnostics-sammanfattning	Ja (minst på debug-sida)









FAS 6 – Debug Tools & CLI
“Gör Graph & Tree lätta att inspektera för både dig och AI-agenten.”

Spara gärna som
IMPLEMENTATION_PHASE_6_DEBUG_TOOLS_AND_CLI.md
eller använd direkt som prompt i Cursor/Codex.

🎯 Mål för FAS 6

När FAS 1–5 är klara har ni:

Parser → Graph → Tree

UI & generators som använder Tree

Tester + snapshots

Grundläggande logging/observability

FAS 6 handlar om att skapa aktiva verktyg som gör det:

lätt att se ProcessGraph & ProcessTree

lätt att debugga matchningsproblem

lätt att experimentera med olika root-processer, map-filer, BPMN-set

Vi fokuserar på:

En ProcessGraph Debug UI (läsa & visualisera grafen).

En ProcessTree Debug UI (inspektera trädet).

Ett CLI-verktyg (t.ex. npm run graph:inspect mortgage).

🧱 Del 1 – ProcessGraph Debug UI
🎯 Syfte

En utvecklar-/debug-sida där du (och AI:n) enkelt kan:

se alla noder i ProcessGraph

se alla edges

se cycles & missingDependencies

filtrera på fil, process, typ

klicka sig fram mellan noder

🔧 1.1. Ny sida: ProcessGraphDebugPage

Filförslag:
src/pages/ProcessGraphDebug.tsx

Struktur:

import React, { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';

export function ProcessGraphDebugPage() {
  const [graph, setGraph] = useState<ProcessGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();
      const g = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: 'Mortgage' });
      setGraph(g);
    }
    load();
  }, []);

  if (!graph) return <div>Laddar ProcessGraph…</div>;

  const nodes = [...graph.nodes.values()];
  const edges = [...graph.edges.values()];

  const selectedNode = selectedNodeId
    ? nodes.find(n => n.id === selectedNodeId) ?? null
    : null;

  const outgoingEdges = selectedNode
    ? edges.filter(e => e.from === selectedNode.id)
    : [];
  const incomingEdges = selectedNode
    ? edges.filter(e => e.to === selectedNode.id)
    : [];

  return (
    <div className="graph-debug">
      <aside className="graph-debug-sidebar">
        <h2>Nodes ({nodes.length})</h2>
        <ul>
          {nodes.map(n => (
            <li key={n.id}>
              <button onClick={() => setSelectedNodeId(n.id)}>
                [{n.type}] {n.name ?? n.bpmnElementId} ({n.bpmnFile})
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="graph-debug-main">
        <section>
          <h2>Graph Info</h2>
          <pre>
            roots: {JSON.stringify(graph.roots, null, 2)}
            cycles: {JSON.stringify(graph.cycles, null, 2)}
            missingDependencies: {JSON.stringify(graph.missingDependencies, null, 2)}
          </pre>
        </section>

        {selectedNode && (
          <section>
            <h2>Selected Node</h2>
            <pre>{JSON.stringify(selectedNode, null, 2)}</pre>

            <h3>Outgoing edges</h3>
            <pre>{JSON.stringify(outgoingEdges, null, 2)}</pre>

            <h3>Incoming edges</h3>
            <pre>{JSON.stringify(incomingEdges, null, 2)}</pre>
          </section>
        )}
      </main>
    </div>
  );
}

🔧 1.2. Data-loading (lokalt)

Skapa en enkel loader för debug:

Fil: src/lib/bpmn/debugDataLoader.ts

import type { BpmnParseResult } from './bpmnParserTypes';
import type { BpmnMap } from './bpmnMapLoader';
// Importera BpmnParser etc beroende på er kodbas

export async function loadAllBpmnParseResults(): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();

  // TODO: implementera:
  // 1. Läs in BPMN-filer (antingen från disk i dev-läge, eller från fixtures).
  // 2. Kör BpmnParser på varje fil.
  // 3. Lägg i map: fileName -> parseResult.

  return results;
}

export async function loadBpmnMap(): Promise<BpmnMap | undefined> {
  // TODO: ladda bpmn-map.json från fixtures eller public
  return undefined;
}


I runtime/produktion kan detta istället kopplas till edge-funktioner, men för debug-läget är lokala fixtures okej.

🌳 Del 2 – ProcessTree Debug UI
🎯 Syfte

En sida för att:

se ProcessTree som hierarki

inspektera ordning (orderIndex)

se diagnostik per nod

få en snabb känsla för “är trädet rimligt?”

🔧 2.1. Ny sida: ProcessTreeDebugPage

Fil: src/pages/ProcessTreeDebug.tsx

import React, { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

export function ProcessTreeDebugPage() {
  const [root, setRoot] = useState<ProcessTreeNode | null>(null);

  useEffect(() => {
    async function load() {
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();
      const graph = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: 'Mortgage' });
      const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });
      setRoot(tree);
    }
    load();
  }, []);

  if (!root) return <div>Laddar ProcessTree…</div>;

  return (
    <div className="tree-debug">
      <h2>ProcessTree Debug</h2>
      <TreeNodeView node={root} depth={0} />
    </div>
  );
}

interface TreeNodeViewProps {
  node: ProcessTreeNode;
  depth: number;
}

function TreeNodeView({ node, depth }: TreeNodeViewProps) {
  const indent = { paddingLeft: depth * 16 };

  return (
    <div style={indent} className={`tree-node tree-node--${node.type}`}>
      <div className="tree-node-header">
        <span className="tree-node-label">
          [{node.type}] {node.label}
        </span>
        {typeof node.orderIndex === 'number' && (
          <span className="tree-node-order">#{node.orderIndex}</span>
        )}
        {node.branchId && (
          <span className="tree-node-branch">branch: {node.branchId}</span>
        )}
      </div>

      <div className="tree-node-meta">
        <span className="tree-node-file">
          {node.bpmnFile}#{node.bpmnElementId}
        </span>
        {node.scenarioPath && (
          <span className="tree-node-scenario">
            scenario: {node.scenarioPath.join(' / ')}
          </span>
        )}
      </div>

      {node.diagnostics && node.diagnostics.length > 0 && (
        <ul className="tree-node-diagnostics">
          {node.diagnostics.map((d, i) => (
            <li key={i} className={`diag diag--${d.severity}`}>
              {d.code}: {d.message}
            </li>
          ))}
        </ul>
      )}

      {node.children.map(child => (
        <TreeNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}


Du kan koppla denna sida till en route, t.ex. /debug/tree.

💻 Del 3 – CLI-verktyg: graph:inspect
🎯 Syfte

Ett kommandoradsverktyg (Node/TS) som:

kan köras lokalt: npm run graph:inspect mortgage

skriver ut:

sammanfattning av ProcessGraph

sammanfattning av ProcessTree

ev. diagnostics

Det här är superbra för:

snabb felsökning

AI-assistenten kan läsa CLI-output

CI-checks (ex. maxantal noder, inga errors etc.)

🔧 3.1. Scriptstruktur

Fil: scripts/graph-inspect.ts (eller src/scripts/graphInspect.ts)

#!/usr/bin/env node
import { buildProcessGraph } from '../src/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '../src/lib/bpmn/buildProcessTreeFromGraph';
import { loadAllBpmnParseResults, loadBpmnMap } from '../src/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '../src/lib/bpmn/processTreeTypes';

async function main() {
  const rootProcessId = process.argv[2] || 'Mortgage';

  console.log(`Inspecting process graph for root: ${rootProcessId}`);

  const parseResults = await loadAllBpmnParseResults();
  const bpmnMap = await loadBpmnMap();

  const graph = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: rootProcessId });

  console.log(`Graph: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
  console.log(`Roots: ${JSON.stringify(graph.roots, null, 2)}`);
  console.log(`Cycles: ${JSON.stringify(graph.cycles, null, 2)}`);
  console.log(`Missing deps: ${JSON.stringify(graph.missingDependencies, null, 2)}`);

  const tree = buildProcessTreeFromGraph(graph, { rootProcessId });

  const totalNodes = countTreeNodes(tree);
  console.log(`\nProcessTree: ${totalNodes} nodes`);
  console.log(`Root: [${tree.type}] ${tree.label}`);

  const diagSummary = summarizeDiagnostics(tree);
  console.log(`Diagnostics summary: ${JSON.stringify(diagSummary, null, 2)}`);

  // Optional: print a limited depth of the tree
  printTree(tree, 0, 3);
}

function countTreeNodes(root: ProcessTreeNode): number {
  return 1 + root.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
}

function summarizeDiagnostics(root: ProcessTreeNode): Record<string, number> {
  const counts: Record<string, number> = {};

  function visit(node: ProcessTreeNode) {
    (node.diagnostics ?? []).forEach(d => {
      const key = `${d.severity}:${d.code}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    node.children.forEach(visit);
  }

  visit(root);
  return counts;
}

function printTree(node: ProcessTreeNode, depth: number, maxDepth: number) {
  if (depth > maxDepth) return;
  const indent = ' '.repeat(depth * 2);
  console.log(
    `${indent}- [${node.type}] ${node.label} (file: ${node.bpmnFile}#${node.bpmnElementId}, order: ${node.orderIndex})`
  );
  node.children.forEach(child => printTree(child, depth + 1, maxDepth));
}

main().catch(err => {
  console.error('graph:inspect failed:', err);
  process.exit(1);
});

🔧 3.2. package.json-script

Lägg till:

{
  "scripts": {
    "graph:inspect": "ts-node scripts/graph-inspect.ts"
  }
}


Eller transpila till JS och kör med node.

🧪 Del 4 – Tester för debug-tools (lättviktigt)

Det behöver inte vara supertungt testat, men:

enhetstest på printTree() (ytterst enkelt)

enhetstest på summarizeDiagnostics()

ev. snapshot-test på CLI-output i “testmode” med fixtures

Exempel:

it('summarizeDiagnostics counts correctly', () => {
  const tree: ProcessTreeNode = {
    id: 'root',
    label: 'Root',
    type: 'process',
    bpmnFile: 'mortgage.bpmn',
    children: [],
    diagnostics: [
      { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'x' },
      { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'y' },
    ],
  };

  const summary = summarizeDiagnostics(tree);
  expect(summary['warning:MISSING_SUBPROCESS']).toBe(2);
});

✅ Exit-kriterier för FAS 6
Krav	Beskrivning
ProcessGraph Debug UI finns	Sida som visar noder, edges, cycles, missingDeps
ProcessTree Debug UI finns	Sida som visar hierarki, orderIndex, diagnostics
CLI graph:inspect fungerar	Kan köras lokalt mot Mortgage och andra processer
Minst enklare tester för debug-utils	t.ex. summarizeDiagnostics