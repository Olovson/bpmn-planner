import type { ProcessTreeNode } from '@/lib/processTree';

export type SubprocessNavigationMap = Map<string, string>;

const mapKey = (bpmnFile: string, elementId: string) => `${bpmnFile}:${elementId}`;

/**
 * Build a lookup map from owning BPMN file + call activity ID to the matched subprocess file.
 * Only includes entries where the hierarchy produced a matched subprocess file.
 */
export function buildSubprocessNavigationMap(root?: ProcessTreeNode | null): SubprocessNavigationMap {
  const map: SubprocessNavigationMap = new Map();
  if (!root) return map;

  const walk = (node: ProcessTreeNode) => {
    if (node.type === 'callActivity' && node.bpmnElementId) {
      const link = node.subprocessLink as any;
      const matchedFile: string | undefined =
        node.subprocessFile ||
        (link && typeof link.matchedFileName === 'string' && link.matchedFileName) ||
        undefined;

      if (matchedFile) {
        map.set(mapKey(node.bpmnFile, node.bpmnElementId), matchedFile);
      }
    }
    node.children.forEach(walk);
  };

  walk(root);
  return map;
}
