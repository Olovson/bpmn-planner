import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

/**
 * Extended ProcessTreeNode with scheduling metadata.
 * These fields are computed and added during scheduling, not part of the original tree structure.
 */
export interface ScheduledNode extends ProcessTreeNode {
  /** Number of leaf nodes (timeline nodes with no timeline node children) in this node's subtree */
  leafCount?: number;
  /** Duration in days. For leaf nodes: 14 days (2 weeks). For non-leaf nodes: leafCount * 14 days. */
  durationDays?: number;
  /** Start date for this node (computed during scheduling) */
  startDate?: Date;
  /** End date for this node (computed during scheduling) */
  endDate?: Date;
}

/**
 * Checks if a node is a timeline node (should appear in the timeline/Gantt chart).
 * Timeline nodes are: callActivity, userTask, serviceTask, businessRuleTask.
 * Note: dmnDecision is not part of ProcessTreeNodeType, so it's excluded here.
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
 * Checks if a node is a leaf node (has no timeline node children).
 * A leaf node is a timeline node that either:
 * - Has no children at all, OR
 * - Has no children that are timeline nodes
 */
function isLeafNode(node: ProcessTreeNode): boolean {
  if (!isTimelineNode(node)) {
    return false; // Only timeline nodes can be leaves
  }
  // Check if any children are timeline nodes
  return !node.children.some((child) => isTimelineNode(child));
}

/**
 * Collects all leaf nodes from a tree in a specific order.
 * Uses the existing visualOrderIndex/orderIndex sorting to maintain consistency.
 */
function collectLeafNodesInOrder(
  node: ProcessTreeNode,
  result: ProcessTreeNode[] = [],
): ProcessTreeNode[] {
  if (isLeafNode(node)) {
    result.push(node);
  } else {
    // Sort children using the same logic as sortCallActivities
    const sortedChildren = [...node.children]
      .filter((child) => isTimelineNode(child))
      .sort((a, b) => {
        const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        if (aVisual !== bVisual) {
          return aVisual - bVisual;
        }
        const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return a.label.localeCompare(b.label);
      });

    // Recursively collect from sorted children
    for (const child of sortedChildren) {
      collectLeafNodesInOrder(child, result);
    }
  }
  return result;
}

/**
 * Computes leafCount and durationDays for all nodes in the tree.
 * Uses post-order traversal (children first, then parent).
 * 
 * Rules:
 * - Leaf nodes: leafCount = 1, durationDays = 14 (2 weeks)
 * - Non-leaf nodes: leafCount = sum of children's leafCounts, durationDays = leafCount * 14
 * 
 * This function mutates the tree by adding leafCount and durationDays properties.
 */
export function computeLeafCountsAndDurations(
  node: ProcessTreeNode,
): ScheduledNode {
  // Post-order: process children first
  const scheduledChildren: ScheduledNode[] = node.children
    .filter((child) => isTimelineNode(child))
    .map((child) => computeLeafCountsAndDurations(child));

  const scheduledNode: ScheduledNode = {
    ...node,
    children: scheduledChildren,
  };

  // Calculate leafCount
  if (isLeafNode(node)) {
    // Leaf node: count itself
    scheduledNode.leafCount = 1;
  } else {
    // Non-leaf node: sum of children's leafCounts
    scheduledNode.leafCount = scheduledChildren.reduce(
      (sum, child) => sum + (child.leafCount ?? 0),
      0,
    );
  }

  // Calculate durationDays
  // For all nodes: duration = leafCount * 14 days (2 weeks per leaf)
  scheduledNode.durationDays = (scheduledNode.leafCount ?? 0) * 14;

  return scheduledNode;
}

/**
 * Schedules all nodes in the tree by assigning startDate and endDate.
 * 
 * Algorithm:
 * 1. Collect all leaf nodes in order
 * 2. Schedule leaf nodes sequentially (each starts when previous ends)
 * 3. Propagate dates upward: parent's startDate = min of children's startDates,
 *    parent's endDate = max of children's endDates
 * 
 * @param rootNode - Root node of the tree (must be a ScheduledNode with leafCount/durationDays computed)
 * @param projectStartDate - Start date for the first leaf node
 * @returns The tree with all nodes scheduled (startDate and endDate assigned)
 */
export function scheduleTree(
  rootNode: ScheduledNode,
  projectStartDate: Date = new Date('2026-01-01'),
): ScheduledNode {
  // Step 1: Collect all leaf nodes in order
  const leafNodes = collectLeafNodesInOrder(rootNode);

  // Step 2: Schedule leaf nodes sequentially
  // Each leaf node gets 2 weeks, starting when the previous one ends
  const leafSchedules = new Map<string, { start: Date; end: Date }>();
  let currentDate = new Date(projectStartDate);

  for (const leaf of leafNodes) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 14); // 2 weeks

    leafSchedules.set(leaf.id, { start: startDate, end: endDate });
    currentDate = new Date(endDate); // Next leaf starts when this one ends
  }

  // Step 3: Propagate dates upward from leaves to parents
  const scheduleNode = (node: ScheduledNode): ScheduledNode => {
    const scheduledChildren = node.children.map((child) =>
      scheduleNode(child as ScheduledNode),
    );

    const scheduledNode: ScheduledNode = {
      ...node,
      children: scheduledChildren,
    };

    if (isLeafNode(node)) {
      // Leaf node: use the pre-computed schedule
      const schedule = leafSchedules.get(node.id);
      if (schedule) {
        scheduledNode.startDate = schedule.start;
        scheduledNode.endDate = schedule.end;
      }
    } else {
      // Non-leaf node: min start, max end from children
      const childDates = scheduledChildren
        .filter((child) => child.startDate && child.endDate)
        .map((child) => ({
          start: child.startDate!,
          end: child.endDate!,
        }));

      if (childDates.length > 0) {
        scheduledNode.startDate = new Date(
          Math.min(...childDates.map((d) => d.start.getTime())),
        );
        scheduledNode.endDate = new Date(
          Math.max(...childDates.map((d) => d.end.getTime())),
        );
      }
    }

    return scheduledNode;
  };

  return scheduleNode(rootNode);
}


