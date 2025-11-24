import type { ProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import type {
  BpmnProcessGraph,
  BpmnProcessNode,
  BpmnNodeType,
} from '@/lib/bpmnProcessGraph';

export type ArtifactBuilder = (bpmnFile: string, elementId?: string) => NodeArtifact[] | undefined;

const INCLUDED_NODE_TYPES: BpmnNodeType[] = [
  'process',
  'callActivity',
  'userTask',
  'serviceTask',
  'businessRuleTask',
];

const mapNodeType = (type: BpmnNodeType): ProcessTreeNode['type'] => {
  switch (type) {
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
      // Övriga typer (gateway, event, dmnDecision, subProcess) visas inte explicit
      // i processträdet utan flattenas genom sina barn.
      return 'userTask';
  }
};

const findRootProcessNode = (
  graph: BpmnProcessGraph,
  rootProcessId: string,
): BpmnProcessNode => {
  // 1) Försök matcha på filnamn
  if (graph.root.bpmnFile === rootProcessId) {
    return graph.root;
  }

  // 2) Försök matcha på process-id
  if (graph.root.bpmnElementId === rootProcessId) {
    return graph.root;
  }

  // 3) Försök matcha på label
  if (graph.root.name === rootProcessId) {
    return graph.root;
  }

  for (const node of graph.allNodes.values()) {
    if (node.type !== 'process') continue;
    if (
      node.bpmnFile === rootProcessId ||
      node.bpmnElementId === rootProcessId ||
      node.name === rootProcessId
    ) {
      return node;
    }
  }

  // Fallback: använd alltid graph.root
  return graph.root;
};

const convertChildren = (
  node: BpmnProcessNode,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode[] => {
  const result: ProcessTreeNode[] = [];

  node.children.forEach((child) => {
    const convertedChildren = convertChildren(child, artifactBuilder);

    if (!INCLUDED_NODE_TYPES.includes(child.type)) {
      // Flatten gateways, events, subProcess, dmnDecision etc – deras barn
      // blir direkta barn i processträdet.
      result.push(...convertedChildren);
      return;
    }

    const elementId = child.bpmnElementId || child.id;

    const treeNode: ProcessTreeNode = {
      id: child.id,
      label: child.name,
      type: mapNodeType(child.type),
      bpmnFile: child.bpmnFile,
      bpmnElementId: elementId,
      orderIndex: child.orderIndex,
      branchId: child.branchId ?? null,
      scenarioPath: child.scenarioPath,
      subprocessFile: child.subprocessFile,
      children: convertedChildren,
      artifacts: artifactBuilder(child.bpmnFile, elementId),
    };

    result.push(treeNode);
  });

  return result;
};

export function buildProcessTreeFromGraph(
  graph: BpmnProcessGraph,
  rootProcessId: string,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode {
  const rootProcessNode = findRootProcessNode(graph, rootProcessId);

  const root: ProcessTreeNode = {
    id: rootProcessNode.id,
    label: rootProcessNode.name,
    type: 'process',
    bpmnFile: rootProcessNode.bpmnFile,
    bpmnElementId: rootProcessNode.bpmnElementId,
    orderIndex: rootProcessNode.orderIndex,
    branchId: rootProcessNode.branchId ?? null,
    scenarioPath: rootProcessNode.scenarioPath,
    children: convertChildren(rootProcessNode, artifactBuilder),
    artifacts: artifactBuilder(rootProcessNode.bpmnFile, rootProcessNode.bpmnElementId),
  };

  return root;
}

