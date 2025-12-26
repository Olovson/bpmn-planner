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
 * - Leaf nodes: leafCount = 1, durationDays = calculated from durationCalculator
 * - Non-leaf nodes with sequential children: leafCount = sum, durationDays = sum
 * - Non-leaf nodes with parallel children: leafCount = sum, durationDays = max (of parallel groups)
 * 
 * @param node - The node to compute durations for
 * @param durationCalculator - Function that calculates duration in days for a node
 * @returns ScheduledNode with leafCount and durationDays computed
 */
export function computeLeafCountsAndDurations(
  node: ProcessTreeNode,
  durationCalculator?: (node: ProcessTreeNode) => number,
): ScheduledNode {
  // Post-order: process children first
  const scheduledChildren: ScheduledNode[] = node.children
    .filter((child) => isTimelineNode(child))
    .map((child) => computeLeafCountsAndDurations(child, durationCalculator));

  const scheduledNode: ScheduledNode = {
    ...node,
    children: scheduledChildren,
  };

  // Calculate leafCount (always sum, regardless of parallel/sequential)
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
  if (isLeafNode(node)) {
    // Leaf node: use duration calculator or default to 14 days
    scheduledNode.durationDays = durationCalculator ? durationCalculator(node) : 14;
  } else {
    // Non-leaf node: check if children are parallel
    const siblingsAreParallel = areSiblingsParallel(scheduledChildren);
    
    if (siblingsAreParallel && scheduledChildren.length > 1) {
      // Parallel children: duration = max of children's durations
      scheduledNode.durationDays = Math.max(
        ...scheduledChildren.map((child) => child.durationDays ?? 0),
        0,
      );
      
      if (import.meta.env.DEV) {
        console.log(
          `[computeLeafCountsAndDurations] Node "${node.label}" has parallel children, using max duration: ${scheduledNode.durationDays} days`,
          scheduledChildren.map(c => ({ label: c.label, durationDays: c.durationDays }))
        );
      }
    } else {
      // Sequential children: duration = sum of children's durations
      scheduledNode.durationDays = scheduledChildren.reduce(
        (sum, child) => sum + (child.durationDays ?? 0),
        0,
      );
    }
  }

  return scheduledNode;
}

/**
 * Determines if sibling nodes should be scheduled in parallel.
 * 
 * Rules:
 * - If siblings have the same branchId and similar visualOrderIndex (within 5), they're likely parallel
 * - If siblings have different branchIds, they're likely sequential
 * - If siblings have very different visualOrderIndex (>20 difference), they're likely sequential
 * 
 * @param siblings - Array of sibling nodes to check
 * @returns true if siblings should be scheduled in parallel
 */
function areSiblingsParallel(siblings: ProcessTreeNode[]): boolean {
  if (siblings.length <= 1) {
    return false; // Need at least 2 siblings to be parallel
  }

  // Check if all siblings have the same branchId
  const branchIds = new Set(siblings.map(s => s.branchId ?? 'main'));
  if (branchIds.size === 1) {
    // Same branchId - check visualOrderIndex differences
    const visualIndices = siblings
      .map(s => s.visualOrderIndex ?? Number.MAX_SAFE_INTEGER)
      .filter(idx => idx !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a - b);
    
    if (visualIndices.length >= 2) {
      // If visual indices are close (within 5), likely parallel
      const maxDiff = Math.max(...visualIndices) - Math.min(...visualIndices);
      if (maxDiff <= 5) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Schedules all nodes in the tree by assigning startDate and endDate.
 * 
 * Improved algorithm:
 * 1. Schedule nodes hierarchically (parent-first approach)
 * 2. For siblings: determine if they should be parallel or sequential
 *    - Parallel: same branchId and similar visualOrderIndex → schedule simultaneously
 *    - Sequential: different branchId or large visualOrderIndex difference → schedule one after another
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
  // NEW APPROACH: Schedule hierarchically (top-down)
  // Parent and children start together (parent starts when first child starts)
  // Only siblings can be sequential or parallel
  
  const scheduleNode = (
    node: ScheduledNode,
    startDate: Date = new Date(projectStartDate),
  ): { scheduled: ScheduledNode; nextStartDate: Date } => {
    // IMPORTANT: Only process timeline node children, not all children
    const timelineChildren = node.children.filter((child) => isTimelineNode(child));
    
    if (isLeafNode(node)) {
      // Leaf node: schedule directly with computed duration
      const durationDays = node.durationDays ?? 14;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
      
      const scheduledNode: ScheduledNode = {
        ...node,
        startDate: new Date(startDate),
        endDate,
      };
      
      if (import.meta.env.DEV) {
        console.log(
          `[timelineScheduling] Scheduled leaf "${node.label}"`,
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            durationDays,
          }
        );
      }
      
      return { scheduled: scheduledNode, nextStartDate: new Date(endDate) };
    }

    // Non-leaf node: schedule children first (hierarchical approach)
    // Parent starts when first child starts (they're together, not sequential)
    const scheduledChildren: ScheduledNode[] = [];
    let currentStartDate = new Date(startDate);
    
    // Check if siblings should be scheduled in parallel
    const siblingsAreParallel = areSiblingsParallel(timelineChildren);
    
    if (siblingsAreParallel && timelineChildren.length > 1) {
      // Schedule siblings in parallel (all start at the same time)
      if (import.meta.env.DEV) {
        console.log(
          `[timelineScheduling] Scheduling ${timelineChildren.length} siblings in parallel for "${node.label}"`,
          timelineChildren.map(c => ({ label: c.label, branchId: c.branchId, visualOrderIndex: c.visualOrderIndex }))
        );
      }
      
      const parallelStartDate = new Date(currentStartDate);
      let maxEndDate = new Date(parallelStartDate);
      
      for (const child of timelineChildren) {
        const { scheduled: scheduledChild, nextStartDate } = scheduleNode(
          child as ScheduledNode,
          parallelStartDate,
        );
        scheduledChildren.push(scheduledChild);
        
        // Track the latest end date among parallel children
        if (scheduledChild.endDate && scheduledChild.endDate > maxEndDate) {
          maxEndDate = new Date(scheduledChild.endDate);
        }
      }
      
      currentStartDate = new Date(maxEndDate);
    } else {
      // Schedule siblings sequentially (one after another)
      for (const child of timelineChildren) {
        const { scheduled: scheduledChild, nextStartDate } = scheduleNode(
          child as ScheduledNode,
          currentStartDate,
        );
        scheduledChildren.push(scheduledChild);
        currentStartDate = new Date(nextStartDate);
      }
    }

    const scheduledNode: ScheduledNode = {
      ...node,
      children: scheduledChildren,
    };

    // CRITICAL: Parent starts when first child starts (hierarchical relationship)
    // Parent and children are together, not sequential
    const childDates = scheduledChildren
      .filter((child) => child.startDate && child.endDate)
      .map((child) => ({
        start: child.startDate!,
        end: child.endDate!,
      }));

    if (childDates.length > 0) {
      // Parent startDate = min of children's startDates (starts with first child)
      scheduledNode.startDate = new Date(
        Math.min(...childDates.map((d) => d.start.getTime())),
      );
      // Parent endDate = max of children's endDates (ends when last child ends)
      scheduledNode.endDate = new Date(
        Math.max(...childDates.map((d) => d.end.getTime())),
      );
      
      if (import.meta.env.DEV) {
        console.log(
          `[timelineScheduling] Scheduled parent "${node.label}"`,
          {
            startDate: scheduledNode.startDate.toISOString().split('T')[0],
            endDate: scheduledNode.endDate.toISOString().split('T')[0],
            childrenCount: scheduledChildren.length,
            childrenStartDates: childDates.map(d => d.start.toISOString().split('T')[0]),
          }
        );
      }
    } else {
      // Debug: Log non-leaf nodes with no children dates
      if (import.meta.env.DEV && scheduledChildren.length > 0) {
        console.warn(
          `[timelineScheduling] Non-leaf node "${scheduledNode.label}" (${scheduledNode.id}) has no children with dates.`,
          {
            childrenCount: scheduledChildren.length,
            childrenWithDates: scheduledChildren.filter((c) => c.startDate && c.endDate).length,
            childrenLabels: scheduledChildren.map((c) => c.label),
            timelineChildrenCount: timelineChildren.length,
            allChildrenCount: node.children.length,
          }
        );
      }
    }

    // Next start date for sequential siblings (after this parent's children)
    return { scheduled: scheduledNode, nextStartDate: currentStartDate };
  };

  const { scheduled } = scheduleNode(rootNode, projectStartDate);
  return scheduled;
}


