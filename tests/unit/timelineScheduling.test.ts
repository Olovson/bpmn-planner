import { describe, it, expect } from 'vitest';
import {
  computeLeafCountsAndDurations,
  scheduleTree,
  type ScheduledNode,
} from '@/lib/timelineScheduling';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

/**
 * Helper to create a simple ProcessTreeNode for testing
 */
function createNode(
  id: string,
  label: string,
  type: ProcessTreeNode['type'],
  children: ProcessTreeNode[] = [],
): ProcessTreeNode {
  return {
    id,
    label,
    type,
    bpmnFile: 'test.bpmn',
    children,
  };
}

describe('computeLeafCountsAndDurations', () => {
  it('should compute leafCount = 1 and durationDays = 14 for a leaf node', () => {
    const leaf = createNode('leaf1', 'Leaf Task', 'userTask');
    const scheduled = computeLeafCountsAndDurations(leaf);

    expect(scheduled.leafCount).toBe(1);
    expect(scheduled.durationDays).toBe(14);
  });

  it('should compute leafCount = sum of children for non-leaf node', () => {
    const child1 = createNode('child1', 'Child 1', 'userTask');
    const child2 = createNode('child2', 'Child 2', 'userTask');
    const parent = createNode('parent', 'Parent', 'callActivity', [child1, child2]);

    const scheduled = computeLeafCountsAndDurations(parent);

    expect(scheduled.leafCount).toBe(2); // Sum of children's leafCounts
    expect(scheduled.durationDays).toBe(28); // 2 * 14 days
  });

  it('should handle nested hierarchy with 3-4 levels', () => {
    // Level 4: Leaf nodes
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const leaf2 = createNode('leaf2', 'Leaf 2', 'userTask');
    const leaf3 = createNode('leaf3', 'Leaf 3', 'userTask');

    // Level 3: Intermediate nodes
    const intermediate1 = createNode('int1', 'Intermediate 1', 'callActivity', [leaf1, leaf2]);
    const intermediate2 = createNode('int2', 'Intermediate 2', 'callActivity', [leaf3]);

    // Level 2: Parent of intermediates
    const parent = createNode('parent', 'Parent', 'callActivity', [
      intermediate1,
      intermediate2,
    ]);

    // Level 1: Root
    const root = createNode('root', 'Root', 'process', [parent]);

    const scheduled = computeLeafCountsAndDurations(root);

    // Root should have leafCount = 3 (all leaves)
    expect(scheduled.leafCount).toBe(3);
    expect(scheduled.durationDays).toBe(42); // 3 * 14 days

    // Check parent (which contains both intermediates)
    const scheduledParent = scheduled.children[0] as ScheduledNode;
    expect(scheduledParent.leafCount).toBe(3); // All leaves under parent
    expect(scheduledParent.durationDays).toBe(42);

    // Check intermediate1 (first child of parent)
    const scheduledInt1 = scheduledParent.children[0] as ScheduledNode;
    expect(scheduledInt1.leafCount).toBe(2);
    expect(scheduledInt1.durationDays).toBe(28);

    // Check intermediate2 (second child of parent)
    const scheduledInt2 = scheduledParent.children[1] as ScheduledNode;
    expect(scheduledInt2.leafCount).toBe(1);
    expect(scheduledInt2.durationDays).toBe(14);
  });

  it('should handle multiple leaf nodes under same branch', () => {
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const leaf2 = createNode('leaf2', 'Leaf 2', 'userTask');
    const leaf3 = createNode('leaf3', 'Leaf 3', 'userTask');
    const branch = createNode('branch', 'Branch', 'callActivity', [leaf1, leaf2, leaf3]);

    const scheduled = computeLeafCountsAndDurations(branch);

    expect(scheduled.leafCount).toBe(3);
    expect(scheduled.durationDays).toBe(42); // 3 * 14 days
  });

  it('should ignore non-timeline nodes when computing leafCount', () => {
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const processNode = createNode('process', 'Process', 'process', [leaf1]);
    const parent = createNode('parent', 'Parent', 'callActivity', [processNode]);

    const scheduled = computeLeafCountsAndDurations(parent);

    // Only userTask (leaf1) should count, not the process node
    expect(scheduled.leafCount).toBe(1);
    expect(scheduled.durationDays).toBe(14);
  });
});

describe('scheduleTree', () => {
  it('should schedule leaf nodes sequentially', () => {
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const leaf2 = createNode('leaf2', 'Leaf 2', 'userTask');
    const parent = createNode('parent', 'Parent', 'callActivity', [leaf1, leaf2]);

    const scheduled = computeLeafCountsAndDurations(parent);
    const projectStartDate = new Date('2026-01-01');
    const scheduledTree = scheduleTree(scheduled, projectStartDate);

    // Check leaf1
    const scheduledLeaf1 = scheduledTree.children[0] as ScheduledNode;
    expect(scheduledLeaf1.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledLeaf1.endDate).toEqual(new Date('2026-01-15')); // +14 days

    // Check leaf2 (should start when leaf1 ends)
    const scheduledLeaf2 = scheduledTree.children[1] as ScheduledNode;
    expect(scheduledLeaf2.startDate).toEqual(new Date('2026-01-15'));
    expect(scheduledLeaf2.endDate).toEqual(new Date('2026-01-29')); // +14 days

    // Check parent (should span from leaf1 start to leaf2 end)
    expect(scheduledTree.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledTree.endDate).toEqual(new Date('2026-01-29'));
  });

  it('should propagate dates upward for nested hierarchy', () => {
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const leaf2 = createNode('leaf2', 'Leaf 2', 'userTask');
    const intermediate = createNode('intermediate', 'Intermediate', 'callActivity', [
      leaf1,
      leaf2,
    ]);
    const root = createNode('root', 'Root', 'process', [intermediate]);

    const scheduled = computeLeafCountsAndDurations(root);
    const projectStartDate = new Date('2026-01-01');
    const scheduledTree = scheduleTree(scheduled, projectStartDate);

    // Root should span from first leaf to last leaf
    expect(scheduledTree.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledTree.endDate).toEqual(new Date('2026-01-29')); // leaf2 ends on 2026-01-29

    // Intermediate should also span the same range
    const scheduledIntermediate = scheduledTree.children[0] as ScheduledNode;
    expect(scheduledIntermediate.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledIntermediate.endDate).toEqual(new Date('2026-01-29'));
  });

  it('should handle complex tree with multiple branches', () => {
    // Branch 1: 2 leaves
    const leaf1 = createNode('leaf1', 'Leaf 1', 'userTask');
    const leaf2 = createNode('leaf2', 'Leaf 2', 'userTask');
    const branch1 = createNode('branch1', 'Branch 1', 'callActivity', [leaf1, leaf2]);

    // Branch 2: 1 leaf
    const leaf3 = createNode('leaf3', 'Leaf 3', 'userTask');
    const branch2 = createNode('branch2', 'Branch 2', 'callActivity', [leaf3]);

    // Root with both branches
    const root = createNode('root', 'Root', 'process', [branch1, branch2]);

    const scheduled = computeLeafCountsAndDurations(root);
    const projectStartDate = new Date('2026-01-01');
    const scheduledTree = scheduleTree(scheduled, projectStartDate);

    // All leaves should be scheduled sequentially
    const scheduledBranch1 = scheduledTree.children[0] as ScheduledNode;
    const scheduledBranch2 = scheduledTree.children[1] as ScheduledNode;

    // Branch1 leaf1: 2026-01-01 to 2026-01-15
    expect(scheduledBranch1.children[0].startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledBranch1.children[0].endDate).toEqual(new Date('2026-01-15'));

    // Branch1 leaf2: 2026-01-15 to 2026-01-29
    expect(scheduledBranch1.children[1].startDate).toEqual(new Date('2026-01-15'));
    expect(scheduledBranch1.children[1].endDate).toEqual(new Date('2026-01-29'));

    // Branch2 leaf3: 2026-01-29 to 2026-02-12
    expect(scheduledBranch2.children[0].startDate).toEqual(new Date('2026-01-29'));
    expect(scheduledBranch2.children[0].endDate).toEqual(new Date('2026-02-12'));

    // Root should span entire range
    expect(scheduledTree.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledTree.endDate).toEqual(new Date('2026-02-12'));

    // Branch1 should span its leaves
    expect(scheduledBranch1.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledBranch1.endDate).toEqual(new Date('2026-01-29'));

    // Branch2 should span its leaf
    expect(scheduledBranch2.startDate).toEqual(new Date('2026-01-29'));
    expect(scheduledBranch2.endDate).toEqual(new Date('2026-02-12'));
  });

  it('should handle single leaf node', () => {
    const leaf = createNode('leaf', 'Leaf', 'userTask');
    const root = createNode('root', 'Root', 'process', [leaf]);

    const scheduled = computeLeafCountsAndDurations(root);
    const projectStartDate = new Date('2026-01-01');
    const scheduledTree = scheduleTree(scheduled, projectStartDate);

    const scheduledLeaf = scheduledTree.children[0] as ScheduledNode;
    expect(scheduledLeaf.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledLeaf.endDate).toEqual(new Date('2026-01-15'));

    expect(scheduledTree.startDate).toEqual(new Date('2026-01-01'));
    expect(scheduledTree.endDate).toEqual(new Date('2026-01-15'));
  });
});

