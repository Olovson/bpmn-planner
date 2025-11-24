import type { BpmnElement, BpmnParseResult } from '@/lib/bpmnParser';
import {
  buildProcessHierarchy,
  type NormalizedProcessDefinition,
  type ProcessHierarchyResult,
} from '@/lib/bpmn/buildProcessHierarchy';
import type {
  HierarchyNode,
  ProcessDefinition,
  SubprocessLink,
  DiagnosticsEntry,
} from '@/lib/bpmn/types';
import {
  resolveProcessFileName,
  resolveProcessFileNameByInternalId,
  traverseHierarchy,
  type TraversedHierarchyNode,
} from '@/lib/bpmn/hierarchyTraversal';

export type ProcessNodeKind =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'subProcess'
  | 'gateway'
  | 'event';

export interface ProcessNodeModel {
  /**
   * Stable identifier for this logical node.
   * For process nodes we use the internal process id, for element based nodes
   * we use the "file:elementId" convention used elsewhere in the app.
   */
  id: string;
  kind: ProcessNodeKind;
  name: string;
  /** BPMN file this node belongs to. */
  bpmnFile: string;
  /** BPMN element id when this node represents a concrete element. */
  bpmnElementId?: string;
  /** BPMN process id for process nodes. */
  processId?: string;
  /** Optional parent node id in the logical hierarchy. */
  parentId?: string;
  /** Child node ids in the logical hierarchy. */
  childrenIds: string[];
  /** Subprocess link metadata if this node represents a Call Activity. */
  subprocessLink?: SubprocessLink;
  /** Aggregated diagnostics associated with this node. */
  diagnostics?: DiagnosticsEntry[];
  /**
   * Optional execution ordering metadata. For now this is populated using
   * a simple depth-first traversal of the logical hierarchy. Future
   * iterations can enrich this with sequence-flow based ordering.
   */
  primaryPathIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
}

export interface ProcessEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: 'hierarchy' | 'subprocess' | 'sequence';
}

export interface ProcessOrderInfo {
  maxDepth: number;
}

export interface ProcessModel {
  /** Root nodes of the logical process hierarchy (usually process-level nodes). */
  hierarchyRoots: ProcessNodeModel[];
  /** All nodes indexed by id. */
  nodesById: Map<string, ProcessNodeModel>;
  /** Logical edges between nodes (currently hierarchy + subprocess). */
  edges: ProcessEdge[];
  /** Basic aggregate information about the model. */
  orderInfo: ProcessOrderInfo;
}

export interface ProcessModelInputFile {
  fileName: string;
  definitions: ProcessDefinition[];
}

export interface BuildProcessModelOptions {
  /**
   * Preferred root BPMN file name. When provided, processes belonging to this
   * file are treated as preferred roots.
   */
  preferredRootFile?: string;
  /**
   * Optional real parse results keyed by BPMN file name. When provided, the
   * model can derive execution ordering based on sequence flows instead of
   * relying solely on hierarchy traversal.
   */
  parseResultsByFile?: Map<string, BpmnParseResult>;
}

/**
 * Build a normalized ProcessModel from a set of ProcessDefinitions.
 *
 * This is a thin abstraction on top of the existing buildProcessHierarchy
 * function and is intentionally conservative: it does not change hierarchy
 * shape or ordering compared to current behaviour. Future iterations can
 * enrich the model with sequence-flow based ordering and additional node
 * kinds without impacting callers.
 */
export function buildProcessModelFromDefinitions(
  inputFiles: ProcessModelInputFile[],
  options: BuildProcessModelOptions = {},
): ProcessModel {
  const allDefinitions: ProcessDefinition[] = inputFiles.flatMap((file) =>
    file.definitions.map((def) => ({
      ...def,
      fileName: file.fileName,
    })),
  );

  if (!allDefinitions.length) {
    return {
      hierarchyRoots: [],
      nodesById: new Map(),
      edges: [],
      orderInfo: { maxDepth: 0 },
    };
  }

  const preferredRootProcessIds =
    options.preferredRootFile != null
      ? new Set(
          allDefinitions
            .filter((def) => def.fileName === options.preferredRootFile)
            .map((def) => def.id),
        )
      : undefined;

  const hierarchy = buildProcessHierarchy(allDefinitions, {
    preferredRootProcessIds,
  });

  const model = buildProcessModelFromHierarchy(hierarchy);

  if (options.parseResultsByFile) {
    assignExecutionOrderFromSequenceFlows(options.parseResultsByFile, model);
  }

  return model;
}

/**
 * Convert an existing ProcessHierarchyResult into the new ProcessModel shape.
 * This helper is used internally by buildProcessModelFromDefinitions and can
 * also be reused by other callers that already rely on buildProcessHierarchy.
 */
export function buildProcessModelFromHierarchy(
  hierarchy: ProcessHierarchyResult,
): ProcessModel {
  const nodesById = new Map<string, ProcessNodeModel>();
  const edges: ProcessEdge[] = [];

  const registerNode = (node: ProcessNodeModel) => {
    const existing = nodesById.get(node.id);
    if (existing) {
      // Merge children and diagnostics conservatively if the node is seen again
      const childrenIds = Array.from(
        new Set([...(existing.childrenIds ?? []), ...node.childrenIds]),
      );
      const diagnostics = [
        ...(existing.diagnostics ?? []),
        ...(node.diagnostics ?? []),
      ];
      nodesById.set(node.id, {
        ...existing,
        childrenIds,
        diagnostics: diagnostics.length ? diagnostics : undefined,
      });
      return nodesById.get(node.id)!;
    }
    nodesById.set(node.id, node);
    return node;
  };

  const processRoots: ProcessNodeModel[] = [];

  const visit = (
    entry: TraversedHierarchyNode,
    parent?: TraversedHierarchyNode,
  ) => {
    const { node, owningFile } = entry;

    if (node.bpmnType === 'process') {
      const processId = node.processId ?? node.nodeId;
      const id = node.nodeId;

      const modelNode = registerNode({
        id,
        kind: 'process',
        name: node.displayName,
        bpmnFile: owningFile,
        processId,
        parentId: parent ? getNodeModelId(parent, owningFile) : undefined,
        childrenIds: [],
        diagnostics: node.diagnostics,
      });

      if (!parent) {
        processRoots.push(modelNode);
      }

      if (parent) {
        const parentId = getNodeModelId(parent, owningFile);
        edges.push({
          id: `${parentId}->${modelNode.id}`,
          fromId: parentId,
          toId: modelNode.id,
          kind: 'hierarchy',
        });
      }

      return;
    }

    if (node.bpmnType === 'callActivity') {
      const elementId =
        node.link?.callActivityId ?? extractElementIdFromNodeId(node.nodeId);
      const id = `${owningFile}:${elementId}`;

      const modelNode = registerNode({
        id,
        kind: 'callActivity',
        name: node.displayName,
        bpmnFile: owningFile,
        bpmnElementId: elementId,
        parentId: parent ? getNodeModelId(parent, owningFile) : undefined,
        childrenIds: [],
        subprocessLink: node.link,
        diagnostics: node.diagnostics,
      });

      if (parent) {
        const parentId = getNodeModelId(parent, owningFile);
        edges.push({
          id: `${parentId}->${modelNode.id}`,
          fromId: parentId,
          toId: modelNode.id,
          kind: 'hierarchy',
        });
      }

      if (node.link?.matchedProcessId) {
        const targetFile = resolveProcessFileNameByInternalId(
          node.link.matchedProcessId,
          hierarchy.processes,
        );
        if (targetFile) {
          const targetId = node.link.matchedProcessId;
          edges.push({
            id: `${modelNode.id}=>${targetId}`,
            fromId: modelNode.id,
            toId: targetId,
            kind: 'subprocess',
          });
        }
      }

      return;
    }

    if (
      node.bpmnType === 'userTask' ||
      node.bpmnType === 'serviceTask' ||
      node.bpmnType === 'businessRuleTask' ||
      node.bpmnType === 'task'
    ) {
      const elementId = extractElementIdFromNodeId(node.nodeId);
      const id = `${owningFile}:${elementId}`;
      const kind: ProcessNodeKind =
        node.bpmnType === 'userTask'
          ? 'userTask'
          : node.bpmnType === 'serviceTask'
          ? 'serviceTask'
          : node.bpmnType === 'businessRuleTask'
          ? 'businessRuleTask'
          : 'userTask';

      const modelNode = registerNode({
        id,
        kind,
        name: node.displayName,
        bpmnFile: owningFile,
        bpmnElementId: elementId,
        parentId: parent ? getNodeModelId(parent, owningFile) : undefined,
        childrenIds: [],
        diagnostics: node.diagnostics,
      });

      if (parent) {
        const parentId = getNodeModelId(parent, owningFile);
        edges.push({
          id: `${parentId}->${modelNode.id}`,
          fromId: parentId,
          toId: modelNode.id,
          kind: 'hierarchy',
        });
      }
    }
  };

  for (const root of hierarchy.roots) {
    traverseHierarchy(root, hierarchy.processes, (entry, parent) => {
      visit(entry, parent);
    });
  }

  // Populate childrenIds based on hierarchy edges
  for (const edge of edges) {
    if (edge.kind !== 'hierarchy') continue;
    const parent = nodesById.get(edge.fromId);
    if (!parent) continue;
    if (!parent.childrenIds.includes(edge.toId)) {
      parent.childrenIds.push(edge.toId);
    }
  }

  const maxDepth = computeMaxDepth(processRoots, nodesById);

  // Assign a simple deterministic preorder index for consumers that want a
  // stable ordering but do not yet rely on sequence-flow semantics.
  assignPreorderIndices(processRoots, nodesById);

  return {
    hierarchyRoots: processRoots,
    nodesById,
    edges,
    orderInfo: {
      maxDepth,
    },
  };
}

function extractElementIdFromNodeId(nodeId: string): string {
  const segments = nodeId.split(':');
  return segments[segments.length - 1];
}

function getNodeModelId(entry: TraversedHierarchyNode, owningFile: string): string {
  const { node } = entry;
  if (node.bpmnType === 'process') {
    return node.nodeId;
  }
  if (node.bpmnType === 'callActivity') {
    const elementId =
      node.link?.callActivityId ?? extractElementIdFromNodeId(node.nodeId);
    return `${owningFile}:${elementId}`;
  }
  const elementId = extractElementIdFromNodeId(node.nodeId);
  return `${owningFile}:${elementId}`;
}

function computeMaxDepth(
  roots: ProcessNodeModel[],
  nodesById: Map<string, ProcessNodeModel>,
): number {
  let maxDepth = 0;

  const walk = (node: ProcessNodeModel, depth: number) => {
    if (depth > maxDepth) {
      maxDepth = depth;
    }
    node.childrenIds.forEach((childId) => {
      const child = nodesById.get(childId);
      if (child) {
        walk(child, depth + 1);
      }
    });
  };

  roots.forEach((root) => walk(root, 1));

  return maxDepth;
}

function assignPreorderIndices(
  roots: ProcessNodeModel[],
  nodesById: Map<string, ProcessNodeModel>,
): void {
  let counter = 0;

  const walk = (node: ProcessNodeModel, branchId: string, scenarioPath: string[]) => {
    // Only assign an index once per node id
    if (node.primaryPathIndex == null) {
      node.primaryPathIndex = counter;
      node.branchId = branchId;
      node.scenarioPath = scenarioPath;
      counter += 1;
    }
    node.childrenIds.forEach((childId) => {
      const child = nodesById.get(childId);
      if (child) {
        walk(child, branchId, scenarioPath);
      }
    });
  };

  roots.forEach((root, index) => {
    const branchId = index === 0 ? 'main' : `root-${index + 1}`;
    const scenarioPath = [branchId];
    walk(root, branchId, scenarioPath);
  });
}

function assignExecutionOrderFromSequenceFlows(
  parseResultsByFile: Map<string, BpmnParseResult>,
  model: ProcessModel,
): void {
  const nodesByFile = new Map<string, ProcessNodeModel[]>();

  for (const node of model.nodesById.values()) {
    if (!node.bpmnFile || !node.bpmnElementId) continue;
    const list = nodesByFile.get(node.bpmnFile) ?? [];
    list.push(node);
    nodesByFile.set(node.bpmnFile, list);
  }

  nodesByFile.forEach((nodes, fileName) => {
    const parseResult = parseResultsByFile.get(fileName);
    if (!parseResult) return;

    const { sequenceFlows, elements } = parseResult;
    if (!sequenceFlows || sequenceFlows.length === 0) {
      return;
    }

    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();

    for (const flow of sequenceFlows) {
      const sourceId = flow.sourceRef;
      const targetId = flow.targetRef;
      if (!sourceId || !targetId) continue;

      if (!successors.has(sourceId)) successors.set(sourceId, []);
      successors.get(sourceId)!.push(targetId);

      if (!predecessors.has(targetId)) predecessors.set(targetId, []);
      predecessors.get(targetId)!.push(sourceId);
    }

    const startEvents = elements
      .filter((el) => el.type === 'bpmn:StartEvent')
      .map((el) => el.id);
    const allIds = new Set<string>([
      ...Array.from(successors.keys()),
      ...Array.from(predecessors.keys()),
    ]);
    const startCandidates =
      startEvents.length > 0
        ? startEvents
        : Array.from(allIds).filter((id) => !predecessors.has(id));

    if (!startCandidates.length) return;

    const nodesByElementId = new Map<string, ProcessNodeModel[]>();
    for (const node of nodes) {
      const elementId = node.bpmnElementId;
      if (!elementId) continue;
      const list = nodesByElementId.get(elementId) ?? [];
      list.push(node);
      nodesByElementId.set(elementId, list);
    }

    let counter = 0;
    const visitedPerBranch = new Map<string, number>();
    const maxVisitsPerNode = 2;

    startCandidates.forEach((startId, index) => {
      const branchId = index === 0 ? 'main' : `entry-${index + 1}`;
      const scenarioPath = [branchId];
      type StackFrame = { elementId: string; branchId: string; scenarioPath: string[] };
      const stack: StackFrame[] = [{ elementId: startId, branchId, scenarioPath }];

      while (stack.length > 0) {
        const { elementId, branchId: currentBranchId, scenarioPath: currentScenario } = stack.pop()!;
        const branchKey = `${currentBranchId}:${elementId}`;
        const visits = (visitedPerBranch.get(branchKey) ?? 0) + 1;
        if (visits > maxVisitsPerNode) continue;
        visitedPerBranch.set(branchKey, visits);

        const modelNodes = nodesByElementId.get(elementId) ?? [];
        modelNodes.forEach((node) => {
          node.primaryPathIndex = counter;
          node.branchId = currentBranchId;
          node.scenarioPath = currentScenario;
        });
        if (modelNodes.length) {
          counter += 1;
        }

        const next = successors.get(elementId) ?? [];
        if (!next.length) continue;

        if (next.length === 1) {
          stack.push({
            elementId: next[0],
            branchId: currentBranchId,
            scenarioPath: currentScenario,
          });
          continue;
        }

        const [first, ...others] = next;
        others.forEach((target, idx) => {
          const subBranchId = `${currentBranchId}-branch-${idx + 1}`;
          const subScenarioPath = [...currentScenario, subBranchId];
          stack.push({
            elementId: target,
            branchId: subBranchId,
            scenarioPath: subScenarioPath,
          });
        });

        stack.push({
          elementId: first,
          branchId: currentBranchId,
          scenarioPath: currentScenario,
        });
      }
    });
  });
}
