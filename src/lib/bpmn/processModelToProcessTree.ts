import type { ProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import type { ProcessModel, ProcessNodeModel } from '@/lib/bpmn/buildProcessModel';

type ArtifactBuilder = (bpmnFile: string, elementId?: string) => NodeArtifact[] | undefined;

const NODE_TYPE_MAP: Record<string, ProcessTreeNode['type']> = {
  userTask: 'userTask',
  serviceTask: 'serviceTask',
  businessRuleTask: 'businessRuleTask',
  task: 'userTask',
};

/**
 * Convert a ProcessModel into the UI-facing ProcessTreeNode structure used by
 * Process Explorer and related views. This helper intentionally mirrors the
 * behaviour of convertProcessHierarchyToTree by:
 * - representing the selected root process as the tree root
 * - flattening intermediate process nodes beneath call activities
 * - creating leaf nodes for task-like BPMN elements
 */
export function buildProcessTreeFromModel(
  model: ProcessModel,
  rootFile: string,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode | null {
  if (!model.hierarchyRoots.length) {
    return null;
  }

  const rootProcess =
    model.hierarchyRoots.find((proc) => proc.bpmnFile === rootFile) ??
    model.hierarchyRoots[0];

  const children = buildChildren(rootProcess, model, artifactBuilder);

  return {
    id: rootProcess.id,
    label: rootProcess.name,
    type: 'process',
    bpmnFile: rootProcess.bpmnFile,
    bpmnElementId: rootProcess.processId,
    orderIndex: rootProcess.primaryPathIndex,
    branchId: rootProcess.branchId,
    scenarioPath: rootProcess.scenarioPath,
    children,
    diagnostics: rootProcess.diagnostics,
  };
}

function buildChildren(
  parent: ProcessNodeModel,
  model: ProcessModel,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode[] {
  const result: ProcessTreeNode[] = [];

  parent.childrenIds.forEach((childId) => {
    const child = model.nodesById.get(childId);
    if (!child) return;

    if (child.kind === 'process') {
      // Flatten process nodes beneath the current parent, mirroring
      // convertProcessHierarchyToTree behaviour.
      result.push(...buildChildren(child, model, artifactBuilder));
      return;
    }

    if (child.kind === 'callActivity') {
      result.push(buildCallActivityNode(child, model, artifactBuilder));
      return;
    }

    if (
      child.kind === 'userTask' ||
      child.kind === 'serviceTask' ||
      child.kind === 'businessRuleTask'
    ) {
      result.push(buildTaskNode(child, artifactBuilder));
    }
  });

  return result;
}

function buildCallActivityNode(
  node: ProcessNodeModel,
  model: ProcessModel,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode {
  const subprocessFile = resolveSubprocessFile(node, model);
  const children = buildChildren(node, model, artifactBuilder);
  const elementId = node.bpmnElementId;

  return {
    id: node.id,
    label: node.name,
    type: 'callActivity',
    bpmnFile: node.bpmnFile,
    bpmnElementId: elementId,
    orderIndex: node.primaryPathIndex,
    branchId: node.branchId,
    scenarioPath: node.scenarioPath,
    children,
    subprocessFile,
    artifacts: artifactBuilder(node.bpmnFile, elementId),
    subprocessLink: node.subprocessLink,
    diagnostics: node.diagnostics,
  };
}

function buildTaskNode(
  node: ProcessNodeModel,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode {
  const elementId = node.bpmnElementId;
  const mappedType =
    NODE_TYPE_MAP[node.kind] ?? ('userTask' as ProcessTreeNode['type']);

  return {
    id: node.id,
    label: node.name,
    type: mappedType,
    bpmnFile: node.bpmnFile,
    bpmnElementId: elementId,
    orderIndex: node.primaryPathIndex,
    branchId: node.branchId,
    scenarioPath: node.scenarioPath,
    children: [],
    artifacts: artifactBuilder(node.bpmnFile, elementId),
    diagnostics: node.diagnostics,
  };
}

function resolveSubprocessFile(node: ProcessNodeModel, model: ProcessModel): string | undefined {
  if (!node.subprocessLink?.matchedProcessId) {
    return undefined;
  }

  // Prefer following the subprocess edge if present, otherwise fall back to
  // looking up the target process node directly by id.
  const edge = model.edges.find(
    (e) => e.kind === 'subprocess' && e.fromId === node.id,
  );
  if (edge) {
    const target = model.nodesById.get(edge.toId);
    return target?.bpmnFile;
  }

  const target = model.nodesById.get(node.subprocessLink.matchedProcessId);
  return target?.bpmnFile;
}
