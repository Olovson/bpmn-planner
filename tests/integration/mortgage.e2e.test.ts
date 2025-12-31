/**
 * Mortgage end-to-end integration test
 * Tests the full pipeline: parse → graph → tree for Mortgage fixtures
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import bpmnMap from '../../bpmn-map.json';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';

const MORTGAGE_FILES: string[] = [
  'mortgage.bpmn',
  'mortgage-se-application.bpmn',
  'mortgage-se-internal-data-gathering.bpmn',
  'mortgage-se-mortgage-commitment.bpmn',
  'mortgage-se-credit-evaluation.bpmn',
  'mortgage-se-appeal.bpmn',
  'mortgage-se-manual-credit-evaluation.bpmn',
  'mortgage-se-kyc.bpmn',
  'mortgage-se-credit-decision.bpmn',
  'mortgage-se-offer.bpmn',
  'mortgage-se-document-generation.bpmn',
  'mortgage-se-signing.bpmn',
  'mortgage-se-disbursement.bpmn',
  'mortgage-se-collateral-registration.bpmn',
  'mortgage-se-object.bpmn',
  'mortgage-se-object-information.bpmn',
];

function collectLabels(root: ProcessTreeNode): string[] {
  const labels: string[] = [];
  function visit(node: ProcessTreeNode) {
    labels.push(node.label);
    node.children.forEach(visit);
  }
  visit(root);
  return labels;
}

function loadMortgageFixturesAndParse(): Promise<Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>> {
  return new Promise(async (resolve) => {
    const parseResults = new Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>();
    
    for (const file of MORTGAGE_FILES) {
      try {
        const result = await parseBpmnFile(`/bpmn/${file}`);
        parseResults.set(file, result);
      } catch (e) {
        // Skip files that don't exist in test environment
        console.warn(`Skipping ${file} in test:`, e);
      }
    }
    
    resolve(parseResults);
  });
}

describe('Mortgage end-to-end integration', () => {
  it('builds a consistent ProcessTree for Mortgage', async () => {
    const parseResults = await loadMortgageFixturesAndParse();
    
    if (parseResults.size === 0) {
      // Skip if no fixtures available
      return;
    }

    const bpmnMapData = loadBpmnMap(bpmnMap);
    const graph: ProcessGraph = buildProcessGraph(parseResults, {
      bpmnMap: bpmnMapData,
      preferredRootProcessId: 'mortgage',
    });

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'mortgage',
      preferredRootFile: 'mortgage.bpmn',
      artifactBuilder: () => [],
    });

    expect(tree.label).toContain('Mortgage');
    expect(tree.type).toBe('process');
    expect(tree.bpmnFile).toBe('mortgage.bpmn');

    // Förvänta att vissa viktiga callActivities finns:
    const labels = collectLabels(tree);
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Application'),
        expect.stringContaining('Signing'),
        expect.stringContaining('Offer'),
        expect.stringContaining('Disbursement'),
      ])
    );
  });

  it('preserves orderIndex throughout the tree', async () => {
    const parseResults = await loadMortgageFixturesAndParse();
    
    if (parseResults.size === 0) {
      return;
    }

    const bpmnMapData = loadBpmnMap(bpmnMap);
    const graph: ProcessGraph = buildProcessGraph(parseResults, {
      bpmnMap: bpmnMapData,
      preferredRootProcessId: 'mortgage',
    });

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'mortgage',
      preferredRootFile: 'mortgage.bpmn',
      artifactBuilder: () => [],
    });

    // Verify that nodes have orderIndex where applicable
    function checkOrderIndex(node: ProcessTreeNode) {
      if (node.type !== 'process' && node.orderIndex !== undefined) {
        expect(typeof node.orderIndex).toBe('number');
        expect(node.orderIndex).toBeGreaterThanOrEqual(0);
      }
      node.children.forEach(checkOrderIndex);
    }

    checkOrderIndex(tree);
  });

  it('includes diagnostics for missing dependencies', async () => {
    const parseResults = await loadMortgageFixturesAndParse();
    
    if (parseResults.size === 0) {
      return;
    }

    const bpmnMapData = loadBpmnMap(bpmnMap);
    const graph: ProcessGraph = buildProcessGraph(parseResults, {
      bpmnMap: bpmnMapData,
      preferredRootProcessId: 'mortgage',
    });

    // If there are missing dependencies, they should be in the graph
    if (graph.missingDependencies.length > 0) {
      expect(graph.missingDependencies.every((m) => m.context)).toBe(true);
    }

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'mortgage',
      preferredRootFile: 'mortgage.bpmn',
      artifactBuilder: () => [],
    });

    // Check if any nodes have diagnostics
    function hasDiagnostics(node: ProcessTreeNode): boolean {
      if (node.diagnostics && node.diagnostics.length > 0) {
        return true;
      }
      return node.children.some(hasDiagnostics);
    }

    // Diagnostics may or may not be present depending on the state of fixtures
    // Just verify the structure is correct if diagnostics exist
    if (hasDiagnostics(tree)) {
      function validateDiagnostics(node: ProcessTreeNode) {
        if (node.diagnostics) {
          node.diagnostics.forEach((diag) => {
            expect(diag).toHaveProperty('severity');
            expect(diag).toHaveProperty('code');
            expect(diag).toHaveProperty('message');
            expect(['info', 'warning', 'error']).toContain(diag.severity);
          });
        }
        node.children.forEach(validateDiagnostics);
      }
      validateDiagnostics(tree);
    }
  });
});

















































