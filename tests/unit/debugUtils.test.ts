/**
 * Unit tests for debug utilities
 * Tests summarizeDiagnostics, countTreeNodes, and printTree functions
 */

import { describe, it, expect, vi } from 'vitest';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

// Import the functions from the CLI script
// Since they're not exported, we'll recreate them here for testing
function countTreeNodes(root: ProcessTreeNode): number {
  return 1 + root.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
}

function summarizeDiagnostics(root: ProcessTreeNode): Record<string, number> {
  const counts: Record<string, number> = {};

  const visit = (node: ProcessTreeNode) => {
    (node.diagnostics ?? []).forEach((d) => {
      const key = `${d.severity}:${d.code}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    node.children.forEach(visit);
  };

  visit(root);
  return counts;
}

function printTree(node: ProcessTreeNode, depth: number, maxDepth: number): string[] {
  const output: string[] = [];
  if (depth > maxDepth) return output;
  const indent = ' '.repeat(depth * 2);
  output.push(
    `${indent}- [${node.type}] ${node.label} (file: ${node.bpmnFile}#${
      node.bpmnElementId ?? 'n/a'
    }, order: ${node.orderIndex ?? 'n/a'})`,
  );
  node.children.forEach((child) => {
    output.push(...printTree(child, depth + 1, maxDepth));
  });
  return output;
}

describe('debugUtils', () => {
  describe('summarizeDiagnostics', () => {
    it('counts diagnostics correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [],
        diagnostics: [
          { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'x' },
          { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'y' },
        ],
      };

      const summary = summarizeDiagnostics(tree);
      expect(summary['warning:MISSING_SUBPROCESS']).toBe(2);
    });

    it('handles multiple diagnostic types', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child1',
            label: 'Child 1',
            type: 'callActivity',
            bpmnFile: 'child.bpmn',
            children: [],
            diagnostics: [
              { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'Missing' },
              { severity: 'error', code: 'CYCLE_DETECTED', message: 'Cycle' },
            ],
          },
          {
            id: 'child2',
            label: 'Child 2',
            type: 'userTask',
            bpmnFile: 'child.bpmn',
            children: [],
            diagnostics: [
              { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'Missing 2' },
            ],
          },
        ],
      };

      const summary = summarizeDiagnostics(tree);
      expect(summary['warning:MISSING_SUBPROCESS']).toBe(2);
      expect(summary['error:CYCLE_DETECTED']).toBe(1);
    });

    it('returns empty object when no diagnostics exist', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child',
            label: 'Child',
            type: 'userTask',
            bpmnFile: 'child.bpmn',
            children: [],
          },
        ],
      };

      const summary = summarizeDiagnostics(tree);
      expect(Object.keys(summary).length).toBe(0);
    });

    it('handles nodes without diagnostics property', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child',
            label: 'Child',
            type: 'userTask',
            bpmnFile: 'child.bpmn',
            children: [],
            // No diagnostics property
          },
        ],
      };

      const summary = summarizeDiagnostics(tree);
      expect(Object.keys(summary).length).toBe(0);
    });
  });

  describe('countTreeNodes', () => {
    it('counts single node correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [],
      };

      expect(countTreeNodes(tree)).toBe(1);
    });

    it('counts tree with children correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child1',
            label: 'Child 1',
            type: 'callActivity',
            bpmnFile: 'child.bpmn',
            children: [
              {
                id: 'grandchild1',
                label: 'Grandchild 1',
                type: 'userTask',
                bpmnFile: 'child.bpmn',
                children: [],
              },
              {
                id: 'grandchild2',
                label: 'Grandchild 2',
                type: 'userTask',
                bpmnFile: 'child.bpmn',
                children: [],
              },
            ],
          },
          {
            id: 'child2',
            label: 'Child 2',
            type: 'userTask',
            bpmnFile: 'child.bpmn',
            children: [],
          },
        ],
      };

      // Root (1) + Child1 (1) + Grandchild1 (1) + Grandchild2 (1) + Child2 (1) = 5
      expect(countTreeNodes(tree)).toBe(5);
    });

    it('handles deep nested trees', () => {
      const createDeepTree = (depth: number, currentDepth = 0): ProcessTreeNode => {
        if (currentDepth >= depth) {
          return {
            id: `node-${currentDepth}`,
            label: `Node ${currentDepth}`,
            type: 'userTask',
            bpmnFile: 'test.bpmn',
            children: [],
          };
        }
        return {
          id: `node-${currentDepth}`,
          label: `Node ${currentDepth}`,
          type: 'process',
          bpmnFile: 'test.bpmn',
          children: [createDeepTree(depth, currentDepth + 1)],
        };
      };

      const tree = createDeepTree(5);
      // createDeepTree(5) creates: depth 0, 1, 2, 3, 4, 5 = 6 nodes total
      expect(countTreeNodes(tree)).toBe(6);
    });
  });

  describe('printTree', () => {
    it('prints single node correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'root-process',
        orderIndex: 0,
        children: [],
      };

      const output = printTree(tree, 0, 3);
      expect(output).toHaveLength(1);
      expect(output[0]).toContain('[process] Root');
      expect(output[0]).toContain('mortgage.bpmn#root-process');
      expect(output[0]).toContain('order: 0');
    });

    it('respects maxDepth limit', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child1',
            label: 'Child 1',
            type: 'callActivity',
            bpmnFile: 'child.bpmn',
            children: [
              {
                id: 'grandchild',
                label: 'Grandchild',
                type: 'userTask',
                bpmnFile: 'child.bpmn',
                children: [
                  {
                    id: 'great-grandchild',
                    label: 'Great Grandchild',
                    type: 'userTask',
                    bpmnFile: 'child.bpmn',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const output = printTree(tree, 0, 2);
      // Should only print root (depth 0), child1 (depth 1), grandchild (depth 2)
      // Should NOT print great-grandchild (depth 3)
      expect(output.length).toBe(3);
      expect(output[0]).toContain('Root');
      expect(output[1]).toContain('Child 1');
      expect(output[2]).toContain('Grandchild');
      expect(output.some((line) => line.includes('Great Grandchild'))).toBe(false);
    });

    it('prints indentation correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child',
            label: 'Child',
            type: 'callActivity',
            bpmnFile: 'child.bpmn',
            children: [
              {
                id: 'grandchild',
                label: 'Grandchild',
                type: 'userTask',
                bpmnFile: 'child.bpmn',
                children: [],
              },
            ],
          },
        ],
      };

      const output = printTree(tree, 0, 3);
      expect(output[0]).toMatch(/^- \[process\] Root/); // No indentation
      expect(output[1]).toMatch(/^  - \[callActivity\] Child/); // 2 spaces
      expect(output[2]).toMatch(/^    - \[userTask\] Grandchild/); // 4 spaces
    });

    it('handles nodes without orderIndex', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        children: [
          {
            id: 'child',
            label: 'Child',
            type: 'userTask',
            bpmnFile: 'child.bpmn',
            // No orderIndex
            children: [],
          },
        ],
      };

      const output = printTree(tree, 0, 3);
      expect(output[1]).toContain('order: n/a');
    });

    it('handles nodes without bpmnElementId', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Root',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        // No bpmnElementId
        children: [],
      };

      const output = printTree(tree, 0, 3);
      expect(output[0]).toContain('mortgage.bpmn#n/a');
    });

    it('prints complex tree structure correctly', () => {
      const tree: ProcessTreeNode = {
        id: 'root',
        label: 'Mortgage',
        type: 'process',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'mortgage',
        orderIndex: undefined,
        children: [
          {
            id: 'app',
            label: 'Application',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'application',
            orderIndex: 0,
            children: [
              {
                id: 'task1',
                label: 'Fetch Information',
                type: 'userTask',
                bpmnFile: 'app.bpmn',
                bpmnElementId: 'task1',
                orderIndex: 0,
                children: [],
              },
            ],
          },
          {
            id: 'signing',
            label: 'Signing',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'signing',
            orderIndex: 1,
            children: [],
          },
        ],
      };

      const output = printTree(tree, 0, 3);
      expect(output.length).toBe(4); // Root + Application + Fetch Information + Signing
      expect(output[0]).toContain('[process] Mortgage');
      expect(output[1]).toContain('[callActivity] Application');
      expect(output[2]).toContain('[userTask] Fetch Information');
      expect(output[3]).toContain('[callActivity] Signing');
    });
  });
});

