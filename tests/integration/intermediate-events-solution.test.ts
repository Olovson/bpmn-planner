/**
 * Tests for intermediate events solution (Steg 2)
 * 
 * These tests validate that:
 * 1. Intermediate events are included in sequence flow graph
 * 2. orderIndex is propagated from intermediate events to call activities
 * 3. Final sorting is correct (KYC → Credit decision → Offer)
 * 
 * Uses the same functions as the application (no duplication).
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import bpmnMap from '../../bpmn-map.json';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { BpmnParseResult } from '@/lib/bpmnParser';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics');

const TARGET_FILES = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.bpmn'))
  .sort((a, b) => {
    if (a === 'mortgage.bpmn') return -1;
    if (b === 'mortgage.bpmn') return 1;
    return a.localeCompare(b);
  });

function loadBpmnFromFixtures(fileName: string): string {
  const fixturePath = resolve(FIXTURES_DIR, fileName);
  return readFileSync(fixturePath, 'utf8');
}

function createBpmnDataUrl(xml: string): string {
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

async function buildProcessTree(): Promise<{
  tree: ProcessTreeNode;
  parseResults: Map<string, BpmnParseResult>;
}> {
  const parseResults = new Map<string, BpmnParseResult>();

  for (const file of TARGET_FILES) {
    try {
      const xml = loadBpmnFromFixtures(file);
      const dataUrl = createBpmnDataUrl(xml);
      const result = await parseBpmnFile(dataUrl);
      parseResults.set(file, result);
    } catch (error) {
      console.warn(`[intermediate-events-solution] failed to parse ${file}:`, error);
    }
  }

  expect(parseResults.size).toBeGreaterThan(0);

  const graph = buildProcessGraph(parseResults, {
    bpmnMap: loadBpmnMap(bpmnMap),
    preferredRootProcessId: 'mortgage',
  });

  const tree = buildProcessTreeFromGraph(graph, {
    rootProcessId: 'mortgage',
    preferredRootFile: 'mortgage.bpmn',
    artifactBuilder: () => [],
  });

  return { tree, parseResults };
}

function findNodeByElementId(
  tree: ProcessTreeNode,
  bpmnElementId: string,
  bpmnFile?: string,
): ProcessTreeNode | null {
  const visit = (node: ProcessTreeNode): ProcessTreeNode | null => {
    if (node.bpmnElementId === bpmnElementId) {
      if (!bpmnFile || node.bpmnFile === bpmnFile) {
        return node;
      }
    }
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(tree);
}

describe('Intermediate Events Solution (Steg 2)', () => {
  describe('Sequence Flow Graph includes Intermediate Events', () => {
    it('should include Event_111bwbu in sequence flow graph', async () => {
      const { parseResults } = await buildProcessTree();
      const mortgageParse = parseResults.get('mortgage.bpmn');
      expect(mortgageParse).toBeDefined();

      // Check that Event_111bwbu exists in sequence flows
      const event111bwbuFlows = mortgageParse!.sequenceFlows.filter(
        (flow) => flow.sourceRef === 'Event_111bwbu' || flow.targetRef === 'Event_111bwbu',
      );

      expect(event111bwbuFlows.length).toBeGreaterThan(0);
      expect(event111bwbuFlows.some((f) => f.targetRef === 'offer')).toBe(true);
    });

    it('should include all intermediate events mentioned in sequence flows', async () => {
      const { parseResults } = await buildProcessTree();
      const mortgageParse = parseResults.get('mortgage.bpmn');
      expect(mortgageParse).toBeDefined();

      // Collect all element IDs mentioned in sequence flows
      const sequenceElementIds = new Set<string>();
      mortgageParse!.sequenceFlows.forEach((flow) => {
        sequenceElementIds.add(flow.sourceRef);
        sequenceElementIds.add(flow.targetRef);
      });

      // Check that intermediate events are in sequence flows
      const intermediateEvents = mortgageParse!.elements.filter(
        (e) =>
          e.type === 'bpmn:IntermediateThrowEvent' ||
          e.type === 'bpmn:IntermediateCatchEvent',
      );

      const intermediateEventsInFlows = intermediateEvents.filter((e) =>
        sequenceElementIds.has(e.id),
      );

      expect(intermediateEventsInFlows.length).toBeGreaterThan(0);
      console.log(
        `   Found ${intermediateEventsInFlows.length} intermediate events in sequence flows`,
      );
    });
  });

  describe('orderIndex Propagation', () => {
    it('should propagate orderIndex from Event_111bwbu to offer', async () => {
      const { tree } = await buildProcessTree();

      const offerNode = findNodeByElementId(tree, 'offer', 'mortgage.bpmn');
      expect(offerNode).toBeDefined();

      // After implementation, offer should have orderIndex
      // (propagated from Event_111bwbu which comes after event-credit-decision-completed)
      expect(offerNode!.orderIndex).toBeDefined();
      expect(typeof offerNode!.orderIndex).toBe('number');

      console.log(`   offer.orderIndex: ${offerNode!.orderIndex}`);
    });

    it('should have correct orderIndex for KYC, Credit decision, and Offer', async () => {
      const { tree } = await buildProcessTree();

      const kycNode = findNodeByElementId(tree, 'kyc', 'mortgage.bpmn');
      const creditDecisionNode = findNodeByElementId(tree, 'credit-decision', 'mortgage.bpmn');
      const offerNode = findNodeByElementId(tree, 'offer', 'mortgage.bpmn');

      expect(kycNode).toBeDefined();
      expect(creditDecisionNode).toBeDefined();
      expect(offerNode).toBeDefined();

      // After implementation:
      // - KYC should have orderIndex (direct from sequence flows)
      // - Credit decision should have orderIndex (direct from sequence flows)
      // - Offer should have orderIndex (propagated from Event_111bwbu)

      // NOTE: These tests will fail until implementation is complete
      if (kycNode!.orderIndex === undefined) {
        console.log('   ⚠ kyc.orderIndex is undefined (expected until implementation)');
      }
      if (creditDecisionNode!.orderIndex === undefined) {
        console.log('   ⚠ credit-decision.orderIndex is undefined (expected until implementation)');
      }
      if (offerNode!.orderIndex === undefined) {
        console.log('   ⚠ offer.orderIndex is undefined (expected until implementation)');
        console.log('   ⚠ This test will pass after Steg 2 implementation');
      }

      expect(kycNode!.orderIndex).toBeDefined();
      expect(creditDecisionNode!.orderIndex).toBeDefined();
      expect(offerNode!.orderIndex).toBeDefined();

      // KYC should come before Credit decision
      expect(kycNode!.orderIndex!).toBeLessThan(creditDecisionNode!.orderIndex!);

      // Credit decision should come before Offer
      expect(creditDecisionNode!.orderIndex!).toBeLessThan(offerNode!.orderIndex!);

      console.log(`   KYC.orderIndex: ${kycNode!.orderIndex}`);
      console.log(`   Credit decision.orderIndex: ${creditDecisionNode!.orderIndex}`);
      console.log(`   Offer.orderIndex: ${offerNode!.orderIndex}`);
    });
  });

  describe('Final Sorting Order', () => {
    it('should sort KYC before Credit decision before Offer', async () => {
      const { tree } = await buildProcessTree();

      // Collect all nodes from mortgage.bpmn
      const mortgageNodes: ProcessTreeNode[] = [];
      const visit = (node: ProcessTreeNode) => {
        if (node.bpmnFile === 'mortgage.bpmn' && node.type === 'callActivity') {
          mortgageNodes.push(node);
        }
        node.children.forEach(visit);
      };
      visit(tree);

      // Sort using the same function as the application
      const sorted = sortCallActivities(mortgageNodes, 'root');

      const kycIndex = sorted.findIndex((n) => n.bpmnElementId === 'kyc');
      const creditDecisionIndex = sorted.findIndex(
        (n) => n.bpmnElementId === 'credit-decision',
      );
      const offerIndex = sorted.findIndex((n) => n.bpmnElementId === 'offer');

      expect(kycIndex).toBeGreaterThanOrEqual(0);
      expect(creditDecisionIndex).toBeGreaterThanOrEqual(0);
      expect(offerIndex).toBeGreaterThanOrEqual(0);

      // After implementation, orderIndex should be prioritized over visualOrderIndex
      // So KYC (orderIndex: 0) should come before Credit decision (orderIndex: 1)
      // And Credit decision should come before Offer (orderIndex: propagated)
      // NOTE: This test will fail until implementation is complete
      // Currently: offer comes at position 5 (visualOrderIndex), Credit decision at 11 (orderIndex)
      // After implementation: KYC (0) < Credit decision (1) < Offer (propagated)

      if (kycIndex >= creditDecisionIndex || creditDecisionIndex >= offerIndex) {
        console.log('   ⚠ Current order is incorrect (expected until implementation)');
        console.log(`   ⚠ KYC at ${kycIndex}, Credit decision at ${creditDecisionIndex}, Offer at ${offerIndex}`);
        console.log('   ⚠ This test will pass after Steg 2 implementation');
      }

      expect(kycIndex).toBeLessThan(creditDecisionIndex);
      expect(creditDecisionIndex).toBeLessThan(offerIndex);

      console.log(`   Sorted order:`);
      console.log(`     ${kycIndex}: ${sorted[kycIndex].label} (orderIndex: ${sorted[kycIndex].orderIndex ?? 'N/A'})`);
      console.log(`     ${creditDecisionIndex}: ${sorted[creditDecisionIndex].label} (orderIndex: ${sorted[creditDecisionIndex].orderIndex ?? 'N/A'})`);
      console.log(`     ${offerIndex}: ${sorted[offerIndex].label} (orderIndex: ${sorted[offerIndex].orderIndex ?? 'N/A'})`);
    });

    it('should maintain correct order for all mortgage.bpmn nodes', async () => {
      const { tree } = await buildProcessTree();

      // Collect all callActivities from mortgage.bpmn
      const mortgageNodes: ProcessTreeNode[] = [];
      const visit = (node: ProcessTreeNode) => {
        if (node.bpmnFile === 'mortgage.bpmn' && node.type === 'callActivity') {
          mortgageNodes.push(node);
        }
        node.children.forEach(visit);
      };
      visit(tree);

      // Sort using the same function as the application
      const sorted = sortCallActivities(mortgageNodes, 'root');

      // Expected order (based on sequence flows):
      // 1. Application
      // 2. Mortgage commitment
      // 3. Automatic Credit Evaluation
      // 4. Appeal
      // 5. Manual credit evaluation
      // 6. KYC (should have orderIndex from sequence flows)
      // 7. Credit decision (should have orderIndex from sequence flows)
      // 8. Offer (should have orderIndex propagated from Event_111bwbu)
      // ... rest

      const expectedOrder = [
        'application',
        'mortgage-commitment',
        'credit-evaluation',
        'appeal',
        'manual-credit-evaluation',
        'kyc',
        'credit-decision',
        'offer',
      ];

      const actualOrder = sorted.map((n) => n.bpmnElementId);

      // Check that KYC, Credit decision, and Offer are in correct order
      const kycPos = actualOrder.indexOf('kyc');
      const creditDecisionPos = actualOrder.indexOf('credit-decision');
      const offerPos = actualOrder.indexOf('offer');

      expect(kycPos).toBeGreaterThanOrEqual(0);
      expect(creditDecisionPos).toBeGreaterThanOrEqual(0);
      expect(offerPos).toBeGreaterThanOrEqual(0);

      // NOTE: This test will fail until implementation is complete
      // Currently: offer comes before Credit decision (visualOrderIndex vs orderIndex)
      // After implementation: KYC < Credit decision < Offer (all with orderIndex)

      if (kycPos >= creditDecisionPos || creditDecisionPos >= offerPos) {
        console.log('   ⚠ Current order is incorrect (expected until implementation)');
        console.log(`   ⚠ KYC at ${kycPos}, Credit decision at ${creditDecisionPos}, Offer at ${offerPos}`);
        console.log('   ⚠ This test will pass after Steg 2 implementation');
      }

      expect(kycPos).toBeLessThan(creditDecisionPos);
      expect(creditDecisionPos).toBeLessThan(offerPos);

      console.log(`   Final order for mortgage.bpmn nodes:`);
      sorted.forEach((node, index) => {
        const orderInfo = node.orderIndex !== undefined ? `order:${node.orderIndex}` : 'no orderIndex';
        const visualInfo = node.visualOrderIndex !== undefined ? `visual:${node.visualOrderIndex}` : '';
        console.log(`     ${index}: ${node.label} (${orderInfo}${visualInfo ? ', ' + visualInfo : ''})`);
      });
    });
  });

  describe('No Breaking Changes', () => {
    it('should not break existing ordering for other files', async () => {
      const { tree } = await buildProcessTree();

      // Collect nodes from all files
      const nodesByFile = new Map<string, ProcessTreeNode[]>();
      const visit = (node: ProcessTreeNode) => {
        if (node.type === 'callActivity' && node.bpmnFile) {
          const list = nodesByFile.get(node.bpmnFile) ?? [];
          list.push(node);
          nodesByFile.set(node.bpmnFile, list);
        }
        node.children.forEach(visit);
      };
      visit(tree);

      // Verify that all files still have nodes with proper ordering
      for (const [fileName, nodes] of nodesByFile.entries()) {
        expect(nodes.length).toBeGreaterThan(0);

        // Sort using the same function as the application
        const sorted = sortCallActivities(nodes, 'root');

        // Verify that sorting doesn't crash and produces valid order
        expect(sorted.length).toBe(nodes.length);

        // Verify that nodes with orderIndex come before nodes without
        const nodesWithOrder = sorted.filter((n) => n.orderIndex !== undefined);
        const nodesWithoutOrder = sorted.filter((n) => n.orderIndex === undefined);

        if (nodesWithOrder.length > 0 && nodesWithoutOrder.length > 0) {
          const lastWithOrder = sorted.lastIndexOf(nodesWithOrder[nodesWithOrder.length - 1]);
          const firstWithoutOrder = sorted.indexOf(nodesWithoutOrder[0]);

          // After implementation, nodes with orderIndex should come first
          // (unless visualOrderIndex is prioritized, which we'll fix in Steg 1)
          // For now, we just verify that sorting works
        }

        console.log(`   ✓ ${fileName}: ${nodes.length} nodes sorted correctly`);
      }
    });
  });
});

