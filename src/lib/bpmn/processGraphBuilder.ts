import type { BpmnParseResult } from '@/lib/bpmnParser';
import type {
  ProcessGraph,
  ProcessGraphNode,
  ProcessGraphEdge,
  MissingDependency,
  CycleInfo,
} from './processGraph';
import type { BpmnMap } from './bpmnMapLoader';
import { matchCallActivityUsingMap } from './bpmnMapLoader';
import { extractSequenceFlows } from './sequenceFlowExtractor';
import {
  calculateOrderFromSequenceFlows,
  calculateVisualOrderFromCoordinates,
  type OrderInfo,
} from './sequenceOrderHelpers';

export interface ProcessGraphBuilderOptions {
  bpmnMap?: BpmnMap;
  preferredRootProcessId?: string;
}

interface ProcessDefinition {
  id: string;
  name?: string;
  fileName: string;
  bpmnElementId: string;
}

interface RawCallActivity {
  id: string;
  name?: string;
  calledElement?: string;
  fileName: string;
  processId: string;
}

type RawTaskType = 'userTask' | 'serviceTask' | 'businessRuleTask';

interface RawTask {
  id: string;
  name?: string;
  type: RawTaskType;
  fileName: string;
  processId: string;
}

function indexProcesses(parseResults: Map<string, BpmnParseResult>): ProcessDefinition[] {
  const defs: ProcessDefinition[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    const metaProcesses = parse.meta.processes ?? [];
    for (const proc of metaProcesses) {
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

function indexCallActivities(parseResults: Map<string, BpmnParseResult>): RawCallActivity[] {
  const items: RawCallActivity[] = [];

  for (const [fileName, parse] of parseResults.entries()) {
    const metaProcesses = parse.meta.processes ?? [];
    for (const proc of metaProcesses) {
      for (const ca of proc.callActivities ?? []) {
        items.push({
          id: ca.id,
          name: ca.name,
          calledElement: ca.calledElement ?? undefined,
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
    const metaProcesses = parse.meta.processes ?? [];
    for (const proc of metaProcesses) {
      const addTasks = (list: any[] | undefined, type: RawTaskType) => {
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

      // BpmnProcessMeta.tasks innehåller redan samtliga tasks med type,
      // men vi använder de uppdelade listorna när/om de finns.
      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'UserTask'),
        'userTask',
      );
      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'ServiceTask'),
        'serviceTask',
      );
      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'BusinessRuleTask'),
        'businessRuleTask',
      );
    }
  }

  return items;
}

function buildNodes(parseResults: Map<string, BpmnParseResult>): Map<string, ProcessGraphNode> {
  const nodes = new Map<string, ProcessGraphNode>();
  
  // Build a map of elementId -> DI coordinates for quick lookup
  const elementCoordinates = new Map<string, { x: number; y: number }>();
  for (const [fileName, parse] of parseResults.entries()) {
    for (const element of parse.elements) {
      if (element.x !== undefined && element.y !== undefined) {
        elementCoordinates.set(element.id, { x: element.x, y: element.y });
      }
    }
  }

  for (const [fileName, parse] of parseResults.entries()) {
    const metaProcesses = parse.meta.processes ?? [];
    for (const proc of metaProcesses) {
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
        const coords = elementCoordinates.get(ca.id);
        nodes.set(caNodeId, {
          id: caNodeId,
          type: 'callActivity',
          name: ca.name,
          bpmnFile: fileName,
          bpmnElementId: ca.id,
          processId: proc.id,
          metadata: {
            calledElement: ca.calledElement ?? null,
            x: coords?.x,
            y: coords?.y,
          },
        });
      }

      // tasks
      const addTasks = (list: any[] | undefined, type: ProcessGraphNode['type']) => {
        for (const t of list ?? []) {
          const taskNodeId = `${type}:${fileName}:${t.id}`;
          const coords = elementCoordinates.get(t.id);
          nodes.set(taskNodeId, {
            id: taskNodeId,
            type,
            name: t.name,
            bpmnFile: fileName,
            bpmnElementId: t.id,
            processId: proc.id,
            metadata: {
              x: coords?.x,
              y: coords?.y,
            },
          });
        }
      };

      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'UserTask'),
        'userTask',
      );
      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'ServiceTask'),
        'serviceTask',
      );
      addTasks(
        proc.tasks?.filter((t: any) => t.type === 'BusinessRuleTask'),
        'businessRuleTask',
      );
    }
  }

  return nodes;
}

interface SubprocessMatch {
  callActivityNodeId: string;
  callActivityRaw: RawCallActivity;
  targetProcessDef?: ProcessDefinition;
  matchSource: 'bpmn-map' | 'none';
}

function matchSubprocesses(
  callActivities: RawCallActivity[],
  processDefs: ProcessDefinition[],
  bpmnMap?: BpmnMap,
): { matches: SubprocessMatch[]; missing: MissingDependency[] } {
  const matches: SubprocessMatch[] = [];
  const missing: MissingDependency[] = [];


  for (const ca of callActivities) {
    let match: SubprocessMatch | undefined;
    let mapMatched = false; // Track if bpmn-map.json matched (even if file is missing)

    if (bpmnMap) {
      const mapRes = matchCallActivityUsingMap(
        { id: ca.id, name: ca.name, calledElement: ca.calledElement },
        ca.fileName,
        bpmnMap,
      );

      if (mapRes.matchedFileName) {
        mapMatched = true; // bpmn-map.json matched this call activity
        const proc = processDefs.find((p) => p.fileName === mapRes.matchedFileName);
        if (proc) {
          // Perfect match: bpmn-map.json matched AND file exists
          match = {
            callActivityNodeId: `callActivity:${ca.fileName}:${ca.id}`,
            callActivityRaw: ca,
            targetProcessDef: proc,
            matchSource: 'bpmn-map',
          };
        } else {
          // VIKTIGT: Om bpmn-map.json pekar på en fil som saknas, markera det som saknat
          // men fall INTE tillbaka på automatisk matchning - det skulle ge felaktiga resultat
          // Detta är förväntat beteende när filer inte är uppladdade ännu, så använd debug istället för warn
          if (import.meta.env.DEV) {
            console.debug(
              `[matchSubprocesses] Map points to ${mapRes.matchedFileName} but file not found in processDefs.`,
              `Call activity: ${ca.id} in ${ca.fileName}. Marking as missing, NOT falling back to automatic matching.`
            );
          }
          missing.push({
            fromNodeId: `callActivity:${ca.fileName}:${ca.id}`,
            missingFileName: mapRes.matchedFileName,
            context: { reason: 'map-file-not-found' },
          });
          // INTE skapa en match här - låt det vara undefined så att det inte faller tillbaka på automatisk matchning
          // match förblir undefined
        }
      }
    }

    // VIKTIGT: Fallback till automatisk matchning ENDAST om bpmn-map.json INTE matchade alls
    // Om bpmn-map.json matchade men filen saknas, ska vi INTE försöka matcha automatiskt
    // eftersom det skulle ge felaktiga resultat (t.ex. matcha mot fel filer när det bara finns 3 filer)
    if (!match && !mapMatched) {
      // Endast här: försök automatisk matchning om bpmn-map.json inte matchade alls
      missing.push({
        fromNodeId: `callActivity:${ca.fileName}:${ca.id}`,
        missingProcessId: ca.calledElement,
        context: { reason: 'no-match' },
      });
      // INTE skapa en match med targetProcessDef: undefined - det orsakar problem senare
      // Låt match förbli undefined så att den inte pushas till matches
    }

    // VIKTIGT: Pusha bara match om den finns OCH har en targetProcessDef
    // Om match är undefined (bpmn-map matchade men filen saknas) eller saknar targetProcessDef,
    // ska den INTE pushas eftersom den inte kan användas för att bygga edges
    if (match && match.targetProcessDef) {
      matches.push(match);
    }
  }


  return { matches, missing };
}

function buildSubprocessEdges(
  matches: SubprocessMatch[],
  nodes: Map<string, ProcessGraphNode>,
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

function buildSequenceEdgesForFile(
  fileName: string,
  parseResult: BpmnParseResult,
  nodes: Map<string, ProcessGraphNode>,
): ProcessGraphEdge[] {
  const flows = extractSequenceFlows(parseResult);
  const edges: ProcessGraphEdge[] = [];

  for (const flow of flows) {
    const sourceNode = [...nodes.values()].find(
      (n) => n.bpmnFile === fileName && n.bpmnElementId === flow.sourceRef,
    );
    const targetNode = [...nodes.values()].find(
      (n) => n.bpmnFile === fileName && n.bpmnElementId === flow.targetRef,
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

  const dfs = (nodeId: string, path: string[]) => {
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
  };

  for (const rootId of graph.roots) {
    dfs(rootId, []);
  }

  return cycles;
}

function assignLocalOrderForFile(
  fileName: string,
  nodes: ProcessGraphNode[],
  parseResult: BpmnParseResult,
): Map<string, OrderInfo> {
  // Use parseResult.sequenceFlows directly (includes all flows, even via intermediate events)
  // These use element IDs (e.g., "Event_111bwbu", "offer")
  const sequenceFlows = parseResult.sequenceFlows || [];
  
  // Create mapping: element ID → ProcessGraphNode ID
  const elementIdToNodeIdMap = new Map<string, string>();
  nodes.forEach((node) => {
    if (node.bpmnElementId) {
      elementIdToNodeIdMap.set(node.bpmnElementId, node.id);
    }
  });

  const nodeIds = nodes.map((n) => n.id);

  // Use calculateOrderFromSequenceFlows with element IDs and mapping
  const orderMap = calculateOrderFromSequenceFlows(
    sequenceFlows,
    nodeIds,
    elementIdToNodeIdMap,
  );
  
  // Map result back to ProcessGraphNode IDs
  // orderMap may contain both element IDs and ProcessGraphNode IDs
  const nodeOrderMap = new Map<string, OrderInfo>();
  orderMap.forEach((info, key) => {
    // If key is a ProcessGraphNode ID, use it directly
    if (nodeIds.includes(key)) {
      nodeOrderMap.set(key, info);
    } else {
      // If key is an element ID, find corresponding ProcessGraphNode ID
      const nodeId = elementIdToNodeIdMap.get(key);
      if (nodeId) {
        nodeOrderMap.set(nodeId, info);
      }
    }
  });

  if (import.meta.env.DEV && fileName === 'mortgage.bpmn') {
    const total = nodes.length;
    const sequenceRelevant = new Set<string>();
    sequenceFlows.forEach((flow) => {
      sequenceRelevant.add(flow.sourceRef);
      sequenceRelevant.add(flow.targetRef);
    });
    const relevantCount = sequenceRelevant.size;
    // Debug logging disabled for cleaner output
  }

  return nodeOrderMap;
}

export function buildProcessGraph(
  parseResults: Map<string, BpmnParseResult>,
  options: ProcessGraphBuilderOptions = {},
): ProcessGraph {
  const nodes = buildNodes(parseResults);
  const processDefs = indexProcesses(parseResults);
  const callActivities = indexCallActivities(parseResults);
  const { matches, missing } = matchSubprocesses(callActivities, processDefs, options.bpmnMap);

  const edgesArray: ProcessGraphEdge[] = [];

  // Subprocess edges
  edgesArray.push(...buildSubprocessEdges(matches, nodes));

  // Sequence edges per fil
  for (const [fileName, parse] of parseResults.entries()) {
    edgesArray.push(...buildSequenceEdgesForFile(fileName, parse, nodes));
  }

  const edges = new Map<string, ProcessGraphEdge>();
  edgesArray.forEach((e) => edges.set(e.id, e));

  // Roots = process-noder utan inkommande subprocess-kanter
  const processNodeIds = Array.from(nodes.values())
    .filter((n) => n.type === 'process')
    .map((n) => n.id);
  const indegree = new Map<string, number>();
  processNodeIds.forEach((id) => indegree.set(id, 0));

  edgesArray
    .filter((e) => e.type === 'subprocess')
    .forEach((e) => {
      if (indegree.has(e.to)) {
        indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
      }
    });

  let roots = processNodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);

  // Om preferredRootProcessId angiven, försök prioritera den som root
  if (options.preferredRootProcessId) {
    const matchRoot = processNodeIds.find((id) => {
      const node = nodes.get(id);
      if (!node) return false;
      return (
        node.processId === options.preferredRootProcessId ||
        node.bpmnFile === options.preferredRootProcessId ||
        node.name === options.preferredRootProcessId
      );
    });
    if (matchRoot) {
      roots = [matchRoot, ...roots.filter((id) => id !== matchRoot)];
    }
  }

  const graph: ProcessGraph = {
    nodes,
    edges,
    roots,
    cycles: [],
    missingDependencies: missing,
  };

  // Cykeldetektion på subprocess-kanter
  graph.cycles = detectCycles(graph);

  // Lokalt orderIndex per fil
  const nodesByFile = new Map<string, ProcessGraphNode[]>();
  nodes.forEach((n) => {
    const list = nodesByFile.get(n.bpmnFile) ?? [];
    list.push(n);
    nodesByFile.set(n.bpmnFile, list);
  });

  nodesByFile.forEach((nodesInFile, fileName) => {
    // Always use the same function - calculateOrderFromSequenceFlows
    // This will return empty map if no sequence flows or no start nodes
    const parseResult = parseResults.get(fileName);
    if (!parseResult) {
      // Skip if parseResult is not available
      return;
    }
    
    const orderMap = assignLocalOrderForFile(fileName, nodesInFile, parseResult);
    orderMap.forEach((info, nodeId) => {
      const node = nodes.get(nodeId);
      if (!node) return;
      node.metadata = {
        ...node.metadata,
        orderIndex: info.orderIndex,
        branchId: info.branchId,
        scenarioPath: info.scenarioPath,
      };
    });
    
    // Always compute visualOrderIndex for ALL nodes with coordinates
    // Visual order is the primary sorting method, so all nodes need visualOrderIndex
    const nodesWithCoords = nodesInFile.filter(n => {
      const hasCoords = n.metadata.x !== undefined && n.metadata.y !== undefined;
      return hasCoords && n.bpmnElementId !== undefined;
    });
    
    if (nodesWithCoords.length > 0) {
      const parseResult = parseResults.get(fileName);
      if (parseResult) {
        const nodeElementIds = nodesWithCoords
          .map((n) => n.bpmnElementId)
          .filter((id): id is string => id !== undefined);
        
        const visualOrderMap = calculateVisualOrderFromCoordinates(
          parseResult.elements,
          nodeElementIds,
        );
        
        // Debug logging disabled for cleaner output
        
        // Assign visualOrderIndex to ALL nodes with coordinates
        nodesWithCoords.forEach((node) => {
          if (node.bpmnElementId) {
            const visualIndex = visualOrderMap.get(node.bpmnElementId);
            if (visualIndex !== undefined) {
              node.metadata.visualOrderIndex = visualIndex;
            }
          }
        });
      }
    }
  });

  return graph;
}

