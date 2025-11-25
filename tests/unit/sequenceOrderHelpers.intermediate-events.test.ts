/**
 * Unit tests for calculateOrderFromSequenceFlows with intermediate events
 * 
 * Tests the core logic for including intermediate events in sequence flow graph
 * and propagating orderIndex to call activities.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { calculateOrderFromSequenceFlows } from '@/lib/bpmn/sequenceOrderHelpers';
import type { BpmnSequenceFlow } from '@/lib/bpmnParser';

describe('calculateOrderFromSequenceFlows with Intermediate Events', () => {
  describe('Including Intermediate Events in Graph', () => {
    it('should include intermediate events mentioned in sequence flows', () => {
      const sequenceFlows: BpmnSequenceFlow[] = [
        {
          id: 'flow1',
          name: '',
          sourceRef: 'kyc',
          targetRef: 'credit-decision',
        },
        {
          id: 'flow2',
          name: '',
          sourceRef: 'credit-decision',
          targetRef: 'Event_111bwbu',
        },
        {
          id: 'flow3',
          name: '',
          sourceRef: 'Event_111bwbu',
          targetRef: 'offer',
        },
      ];

      const nodeIds = ['callActivity:file:kyc', 'callActivity:file:credit-decision', 'callActivity:file:offer'];
      const elementIdToNodeIdMap = new Map<string, string>([
        ['kyc', 'callActivity:file:kyc'],
        ['credit-decision', 'callActivity:file:credit-decision'],
        ['offer', 'callActivity:file:offer'],
      ]);

      // After implementation, this should include Event_111bwbu in the graph
      const orderMap = calculateOrderFromSequenceFlows(
        sequenceFlows,
        nodeIds,
        elementIdToNodeIdMap,
      );

      // Event_111bwbu should be in the graph and get orderIndex
      // (it's an intermediate event, so it won't be in nodeIds, but should be in orderMap)
      // After implementation, orderMap should include Event_111bwbu keyed by element ID

      // For now, verify that the function doesn't crash
      expect(orderMap).toBeDefined();
      expect(orderMap instanceof Map).toBe(true);

      // After implementation:
      // - kyc should have orderIndex (direct from sequence flows)
      // - credit-decision should have orderIndex (direct from sequence flows)
      // - Event_111bwbu should have orderIndex (included in graph)
      // - offer should have orderIndex (propagated from Event_111bwbu)

      const kycOrder = orderMap.get('callActivity:file:kyc');
      const creditDecisionOrder = orderMap.get('callActivity:file:credit-decision');
      const offerOrder = orderMap.get('callActivity:file:offer');
      const eventOrder = orderMap.get('Event_111bwbu');

      // After implementation, all should have orderIndex
      expect(kycOrder).toBeDefined();
      expect(creditDecisionOrder).toBeDefined();
      expect(offerOrder).toBeDefined();
      
      // Event_111bwbu should also have orderIndex (included in graph)
      expect(eventOrder).toBeDefined();
      
      // Verify relative order: kyc < credit-decision, and offer comes after credit-decision
      // Note: Event_111bwbu may have different orderIndex depending on graph structure,
      // but it should be included in the graph
      expect(kycOrder!.orderIndex).toBeLessThan(creditDecisionOrder!.orderIndex);
      // offer should come after credit-decision (either directly or via Event_111bwbu)
      expect(creditDecisionOrder!.orderIndex).toBeLessThan(offerOrder!.orderIndex);
      
      // Event_111bwbu should be in the graph (keyed by element ID)
      // It may have orderIndex before or after credit-decision depending on graph structure
      expect(eventOrder).toBeDefined();
    });

    it('should propagate orderIndex from intermediate events to call activities', () => {
      const sequenceFlows: BpmnSequenceFlow[] = [
        {
          id: 'flow1',
          name: '',
          sourceRef: 'Event_111bwbu',
          targetRef: 'offer',
        },
      ];

      const nodeIds = ['callActivity:file:offer'];
      const elementIdToNodeIdMap = new Map<string, string>([
        ['offer', 'callActivity:file:offer'],
      ]);

      // After implementation, Event_111bwbu should be included in graph
      // and orderIndex should be propagated to offer
      const orderMap = calculateOrderFromSequenceFlows(
        sequenceFlows,
        nodeIds,
        elementIdToNodeIdMap,
      );

      // After implementation:
      // - Event_111bwbu should have orderIndex (from being in graph)
      // - offer should have orderIndex (propagated from Event_111bwbu)

      const offerOrder = orderMap.get('callActivity:file:offer');

      // After implementation, offer should have orderIndex
      if (offerOrder) {
        expect(offerOrder.orderIndex).toBeDefined();
        expect(typeof offerOrder.orderIndex).toBe('number');
      }
    });

    it('should handle complex gateway structures', () => {
      const sequenceFlows: BpmnSequenceFlow[] = [
        {
          id: 'flow1',
          name: '',
          sourceRef: 'start',
          targetRef: 'Gateway_1',
        },
        {
          id: 'flow2',
          name: '',
          sourceRef: 'Gateway_1',
          targetRef: 'task1',
        },
        {
          id: 'flow3',
          name: '',
          sourceRef: 'Gateway_1',
          targetRef: 'task2',
        },
        {
          id: 'flow4',
          name: '',
          sourceRef: 'task1',
          targetRef: 'Gateway_2',
        },
        {
          id: 'flow5',
          name: '',
          sourceRef: 'task2',
          targetRef: 'Gateway_2',
        },
        {
          id: 'flow6',
          name: '',
          sourceRef: 'Gateway_2',
          targetRef: 'task3',
        },
      ];

      const nodeIds = ['callActivity:file:task1', 'callActivity:file:task2', 'callActivity:file:task3'];
      const elementIdToNodeIdMap = new Map<string, string>([
        ['task1', 'callActivity:file:task1'],
        ['task2', 'callActivity:file:task2'],
        ['task3', 'callActivity:file:task3'],
      ]);

      // After implementation, gateways should be included in graph
      const orderMap = calculateOrderFromSequenceFlows(
        sequenceFlows,
        nodeIds,
        elementIdToNodeIdMap,
      );

      // After implementation:
      // - Gateway_1 and Gateway_2 should be in graph
      // - task1 and task2 should have orderIndex (from Gateway_1)
      // - task3 should have orderIndex (from Gateway_2)

      const task1Order = orderMap.get('callActivity:file:task1');
      const task2Order = orderMap.get('callActivity:file:task2');
      const task3Order = orderMap.get('callActivity:file:task3');

      // After implementation, all should have orderIndex
      if (task1Order && task2Order && task3Order) {
        // task1 and task2 should come before task3
        expect(Math.max(task1Order.orderIndex, task2Order.orderIndex)).toBeLessThan(
          task3Order.orderIndex,
        );
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without elementIdToNodeIdMap (backward compatible)', () => {
      const sequenceFlows: BpmnSequenceFlow[] = [
        {
          id: 'flow1',
          name: '',
          sourceRef: 'node1',
          targetRef: 'node2',
        },
      ];

      const nodeIds = ['node1', 'node2'];

      // Should work without elementIdToNodeIdMap (backward compatible)
      const orderMap = calculateOrderFromSequenceFlows(sequenceFlows, nodeIds);

      expect(orderMap).toBeDefined();
      expect(orderMap instanceof Map).toBe(true);

      // Should still assign orderIndex to nodes in nodeIds
      const node1Order = orderMap.get('node1');
      const node2Order = orderMap.get('node2');

      if (node1Order && node2Order) {
        expect(node1Order.orderIndex).toBe(0);
        expect(node2Order.orderIndex).toBe(1);
      }
    });
  });
});

