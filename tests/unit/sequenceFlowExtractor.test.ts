/**
 * Unit tests for sequenceFlowExtractor
 * Tests sequence flow extraction, graph building, and start node detection
 */

import { describe, it, expect } from 'vitest';
import {
  extractSequenceFlows,
  buildSequenceGraph,
  findStartNodes,
  type NormalizedSequenceFlow,
} from '@/lib/bpmn/sequenceFlowExtractor';
import type { BpmnParseResult } from '@/lib/bpmnParser';
import type { ProcessGraphNode } from '@/lib/bpmn/processGraph';

describe('sequenceFlowExtractor', () => {
  describe('extractSequenceFlows', () => {
    it('extracts sequence flows from parse result', () => {
      const parseResult: BpmnParseResult = {
        fileName: 'test.bpmn',
        meta: {
          processId: 'test-process',
          name: 'Test Process',
          processes: [],
          callActivities: [],
          tasks: [],
        },
        elements: [],
        sequenceFlows: [
          {
            id: 'Flow_1',
            sourceRef: 'Task_1',
            targetRef: 'Task_2',
          },
          {
            id: 'Flow_2',
            sourceRef: 'Task_2',
            targetRef: 'Task_3',
          },
        ],
      };

      const flows = extractSequenceFlows(parseResult);

      expect(flows).toHaveLength(2);
      expect(flows[0]).toEqual({
        id: 'Flow_1',
        sourceRef: 'Task_1',
        targetRef: 'Task_2',
        condition: undefined,
      });
      expect(flows[1]).toEqual({
        id: 'Flow_2',
        sourceRef: 'Task_2',
        targetRef: 'Task_3',
        condition: undefined,
      });
    });

    it('handles empty sequence flows', () => {
      const parseResult: BpmnParseResult = {
        fileName: 'test.bpmn',
        meta: {
          processId: 'test-process',
          name: 'Test Process',
          processes: [],
          callActivities: [],
          tasks: [],
        },
        elements: [],
        sequenceFlows: [],
      };

      const flows = extractSequenceFlows(parseResult);
      expect(flows).toHaveLength(0);
    });

    it('handles missing sequenceFlows property', () => {
      const parseResult: BpmnParseResult = {
        fileName: 'test.bpmn',
        meta: {
          processId: 'test-process',
          name: 'Test Process',
          processes: [],
          callActivities: [],
          tasks: [],
        },
        elements: [],
        sequenceFlows: undefined as any,
      };

      const flows = extractSequenceFlows(parseResult);
      expect(flows).toHaveLength(0);
    });
  });

  describe('buildSequenceGraph', () => {
    it('builds a linear sequence graph (A→B→C)', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b',
          type: 'userTask',
          name: 'Task B',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_c',
          type: 'userTask',
          name: 'Task C',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_C',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [
        { id: 'Flow_1', sourceRef: 'Task_A', targetRef: 'Task_B' },
        { id: 'Flow_2', sourceRef: 'Task_B', targetRef: 'Task_C' },
      ];

      const graph = buildSequenceGraph(nodes, flows);

      expect(graph.get('node_a')).toEqual(['node_b']);
      expect(graph.get('node_b')).toEqual(['node_c']);
      expect(graph.get('node_c')).toEqual([]);
    });

    it('builds a branch graph with gateway (A→B1 and A→B2)', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b1',
          type: 'userTask',
          name: 'Task B1',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B1',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b2',
          type: 'userTask',
          name: 'Task B2',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B2',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [
        { id: 'Flow_1', sourceRef: 'Task_A', targetRef: 'Task_B1' },
        { id: 'Flow_2', sourceRef: 'Task_A', targetRef: 'Task_B2' },
      ];

      const graph = buildSequenceGraph(nodes, flows);

      expect(graph.get('node_a')).toEqual(expect.arrayContaining(['node_b1', 'node_b2']));
      expect(graph.get('node_b1')).toEqual([]);
      expect(graph.get('node_b2')).toEqual([]);
    });

    it('ignores flows where source or target node is not found', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [
        { id: 'Flow_1', sourceRef: 'Task_A', targetRef: 'Task_B' }, // Task_B not found
        { id: 'Flow_2', sourceRef: 'Task_X', targetRef: 'Task_A' }, // Task_X not found
      ];

      const graph = buildSequenceGraph(nodes, flows);

      expect(graph.get('node_a')).toEqual([]);
    });
  });

  describe('findStartNodes', () => {
    it('finds start nodes correctly (nodes without incoming edges)', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b',
          type: 'userTask',
          name: 'Task B',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_c',
          type: 'userTask',
          name: 'Task C',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_C',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [
        { id: 'Flow_1', sourceRef: 'Task_A', targetRef: 'Task_B' },
        { id: 'Flow_2', sourceRef: 'Task_B', targetRef: 'Task_C' },
      ];

      const startNodes = findStartNodes(nodes, flows);

      // Task_A has no incoming edges, so it should be a start node
      expect(startNodes).toContain('node_a');
      expect(startNodes).not.toContain('node_b'); // Has incoming edge from Task_A
      expect(startNodes).not.toContain('node_c'); // Has incoming edge from Task_B
    });

    it('finds multiple start nodes when there are multiple entry points', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b',
          type: 'userTask',
          name: 'Task B',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_c',
          type: 'userTask',
          name: 'Task C',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_C',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [
        { id: 'Flow_1', sourceRef: 'Task_A', targetRef: 'Task_C' },
        { id: 'Flow_2', sourceRef: 'Task_B', targetRef: 'Task_C' },
      ];

      const startNodes = findStartNodes(nodes, flows);

      // Both Task_A and Task_B have no incoming edges
      expect(startNodes).toContain('node_a');
      expect(startNodes).toContain('node_b');
      expect(startNodes).not.toContain('node_c');
    });

    it('returns all nodes when there are no flows', () => {
      const nodes: ProcessGraphNode[] = [
        {
          id: 'node_a',
          type: 'userTask',
          name: 'Task A',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_A',
          processId: 'test-process',
          metadata: {},
        },
        {
          id: 'node_b',
          type: 'userTask',
          name: 'Task B',
          bpmnFile: 'test.bpmn',
          bpmnElementId: 'Task_B',
          processId: 'test-process',
          metadata: {},
        },
      ];

      const flows: NormalizedSequenceFlow[] = [];

      const startNodes = findStartNodes(nodes, flows);

      // All nodes are start nodes when there are no flows
      expect(startNodes).toContain('node_a');
      expect(startNodes).toContain('node_b');
    });
  });
});














































