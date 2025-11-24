import type { ProcessGraph, ProcessGraphNode } from './processGraph';
import type {
  ProcessTreeNode,
  ArtifactBuilder,
  SubprocessLink,
  DiagnosticsEntry,
  NodeArtifact,
  ProcessTreeNodeType,
} from './processTreeTypes';

export interface BuildTreeOptions {
  rootProcessId?: string;
  preferredRootFile?: string;
  artifactBuilder?: ArtifactBuilder;
}

const defaultArtifactBuilder: ArtifactBuilder = () => [];

export function buildProcessTreeFromGraph(
  graph: ProcessGraph,
  options: BuildTreeOptions = {},
): ProcessTreeNode {
  const artifactBuilder = options.artifactBuilder ?? defaultArtifactBuilder;

  const rootProcessNode = pickRootProcessNode(graph, options);
  if (!rootProcessNode) {
    throw new Error('No root process node found for ProcessTree');
  }

  const visitedProcesses = new Set<string>();

  return buildProcessNodeRecursive(
    graph,
    rootProcessNode,
    visitedProcesses,
    artifactBuilder,
  );
}

function pickRootProcessNode(
  graph: ProcessGraph,
  options: BuildTreeOptions,
): ProcessGraphNode | undefined {
  const allNodes = [...graph.nodes.values()];
  const processNodes = allNodes.filter((n) => n.type === 'process');

  if (options.rootProcessId) {
    const byPid = processNodes.find((n) => n.processId === options.rootProcessId);
    if (byPid) return byPid;
  }

  if (options.preferredRootFile) {
    const byFile = processNodes.find((n) => n.bpmnFile === options.preferredRootFile);
    if (byFile) return byFile;
  }

  for (const rootId of graph.roots) {
    const node = graph.nodes.get(rootId);
    if (node?.type === 'process') return node;
  }

  return processNodes[0];
}

function getProcessChildren(
  graph: ProcessGraph,
  processNode: ProcessGraphNode,
): { callActivities: ProcessGraphNode[]; tasks: ProcessGraphNode[] } {
  const allNodes = [...graph.nodes.values()];

  const callActivities = allNodes.filter(
    (n) =>
      n.type === 'callActivity' &&
      n.processId === processNode.processId &&
      n.bpmnFile === processNode.bpmnFile,
  );

  const tasks = allNodes.filter(
    (n) =>
      (n.type === 'userTask' ||
        n.type === 'serviceTask' ||
        n.type === 'businessRuleTask') &&
      n.processId === processNode.processId &&
      n.bpmnFile === processNode.bpmnFile,
  );

  return { callActivities, tasks };
}

function getSubprocessTarget(
  graph: ProcessGraph,
  callActivityNode: ProcessGraphNode,
): ProcessGraphNode | undefined {
  const edgesFromThis = [...graph.edges.values()].filter(
    (e) => e.type === 'subprocess' && e.from === callActivityNode.id,
  );
  if (edgesFromThis.length === 0) return undefined;
  const targetId = edgesFromThis[0].to;
  return graph.nodes.get(targetId);
}

function sortByOrderIndex<T extends ProcessGraphNode>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const ao = (a.metadata.orderIndex as number | undefined) ?? Number.POSITIVE_INFINITY;
    const bo = (b.metadata.orderIndex as number | undefined) ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  });
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
      return 'process';
  }
}

function baseTreeNodeFromGraphNode(
  graphNode: ProcessGraphNode,
  children: ProcessTreeNode[],
  artifacts: NodeArtifact[],
  diagnostics?: DiagnosticsEntry[],
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

function buildProcessNodeRecursive(
  graph: ProcessGraph,
  processNode: ProcessGraphNode,
  visitedProcesses: Set<string>,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode {
  const processKey = `${processNode.bpmnFile}:${
    processNode.processId ?? processNode.bpmnElementId
  }`;

  const diagnostics: DiagnosticsEntry[] = [];

  if (visitedProcesses.has(processKey)) {
    diagnostics.push({
      severity: 'error',
      code: 'CYCLE_DETECTED',
      message: `Process ${
        processNode.name ?? processNode.processId ?? processKey
      } is part of a cycle`,
      context: { processKey },
    });

    return baseTreeNodeFromGraphNode(
      processNode,
      [],
      artifactBuilder(processNode.bpmnFile, processNode.bpmnElementId),
      diagnostics,
    );
  }

  visitedProcesses.add(processKey);

  const { callActivities, tasks } = getProcessChildren(graph, processNode);

  const callActivitiesSorted = sortByOrderIndex(callActivities);
  const tasksSorted = sortByOrderIndex(tasks);

  const children: ProcessTreeNode[] = [];

  for (const ca of callActivitiesSorted) {
    const subprocessTarget = getSubprocessTarget(graph, ca);

    let subprocessDiagnostics: DiagnosticsEntry[] | undefined;
    let subprocessFile: string | undefined;
    let subprocessLink: SubprocessLink | undefined;
    const artifacts = artifactBuilder(ca.bpmnFile, ca.bpmnElementId);

    if (!subprocessTarget) {
      // Try to find missing dependency info from graph
      const missingDep = graph.missingDependencies.find(
        (m) => m.fromNodeId === ca.id
      );
      const missingFileName = missingDep?.missingFileName;

      subprocessDiagnostics = [
        {
          severity: 'warning',
          code: 'MISSING_SUBPROCESS',
          message: `CallActivity ${ca.name ?? ca.bpmnElementId} has no matched subprocess`,
          context: {
            callActivityId: ca.id,
            bpmnFile: ca.bpmnFile,
            missingFileName,
            reason: missingDep?.context?.reason,
          },
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

    if (subprocessTarget) {
      const subprocessTree = buildProcessNodeRecursive(
        graph,
        subprocessTarget,
        visitedProcesses,
        artifactBuilder,
      );

      callActivityTreeNode.children.push(...subprocessTree.children);
    }

    children.push(callActivityTreeNode);
  }

  for (const t of tasksSorted) {
    const artifacts = artifactBuilder(t.bpmnFile, t.bpmnElementId);
    const taskNode = baseTreeNodeFromGraphNode(t, [], artifacts);
    children.push(taskNode);
  }

  visitedProcesses.delete(processKey);

  const processArtifacts = artifactBuilder(
    processNode.bpmnFile,
    processNode.processId ?? processNode.bpmnElementId,
  );

  return baseTreeNodeFromGraphNode(
    processNode,
    children,
    processArtifacts,
    diagnostics.length ? diagnostics : undefined,
  );
}

