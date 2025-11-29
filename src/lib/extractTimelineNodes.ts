import type { ProcessTreeNode } from '@/lib/processTree';

/**
 * Checks if a node is a timeline node (should appear in the timeline/Gantt chart).
 * Timeline nodes are: callActivity, userTask, serviceTask, businessRuleTask.
 */
function isTimelineNode(node: ProcessTreeNode): boolean {
  return (
    node.type === 'callActivity' ||
    node.type === 'userTask' ||
    node.type === 'serviceTask' ||
    node.type === 'businessRuleTask'
  );
}

/**
 * Extracts all timeline nodes recursively from a ProcessTree.
 * Returns a flat list of all nodes that should appear in the timeline.
 */
export function extractAllTimelineNodes(node: ProcessTreeNode | null): ProcessTreeNode[] {
  if (!node) return [];

  const result: ProcessTreeNode[] = [];

  if (isTimelineNode(node)) {
    result.push(node);
  }

  // Recursively extract from children
  node.children.forEach((child) => {
    result.push(...extractAllTimelineNodes(child));
  });

  return result;
}

