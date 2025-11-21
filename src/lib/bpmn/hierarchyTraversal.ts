import type { HierarchyNode, SubprocessLink } from '@/lib/bpmn/types';
import type { NormalizedProcessDefinition } from '@/lib/bpmn/buildProcessHierarchy';

export function resolveProcessFileName(
  node: HierarchyNode,
  processes: Map<string, NormalizedProcessDefinition>,
): string | undefined {
  const direct = processes.get(node.nodeId);
  if (direct?.fileName) return direct.fileName;

  if (node.processId) {
    for (const process of processes.values()) {
      if (process.id === node.processId) {
        return process.fileName;
      }
    }
  }

  return undefined;
}

export function resolveProcessFileNameByInternalId(
  internalId: string,
  processes: Map<string, NormalizedProcessDefinition>,
): string | undefined {
  return processes.get(internalId)?.fileName;
}

export type TraversedHierarchyNode = {
  node: HierarchyNode;
  owningFile: string;
  link?: SubprocessLink;
};

export function traverseHierarchy(
  root: HierarchyNode,
  processes: Map<string, NormalizedProcessDefinition>,
  visitor: (entry: TraversedHierarchyNode, parent?: TraversedHierarchyNode) => void,
): void {
  const rootFile = resolveProcessFileName(root, processes);
  if (!rootFile) return;

  const walk = (current: HierarchyNode, owningFile: string, parent?: TraversedHierarchyNode) => {
    const entry: TraversedHierarchyNode = { node: current, owningFile, link: current.link };
    visitor(entry, parent);

    if (current.bpmnType === 'process') {
      const nextFile = resolveProcessFileName(current, processes) ?? owningFile;
      current.children.forEach((child) => walk(child, nextFile, entry));
      return;
    }

    if (current.bpmnType === 'callActivity') {
      const matchedFile = current.link?.matchedProcessId
        ? resolveProcessFileNameByInternalId(current.link.matchedProcessId, processes)
        : undefined;
      const nextFile = matchedFile ?? owningFile;
      current.children.forEach((child) => walk(child, nextFile, entry));
      return;
    }

    current.children.forEach((child) => walk(child, owningFile, entry));
  };

  walk(root, rootFile);
}


