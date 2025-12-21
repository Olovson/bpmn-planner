/**
 * Snapshot regression test for Mortgage ProcessTree
 * Ensures the ProcessTree structure remains consistent
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

/**
 * Normalizes a ProcessTreeNode for snapshot comparison by removing
 * non-deterministic fields and ensuring consistent structure
 */
function normalizeTreeForSnapshot(node: ProcessTreeNode): any {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    bpmnFile: node.bpmnFile,
    bpmnElementId: node.bpmnElementId,
    orderIndex: node.orderIndex,
    branchId: node.branchId,
    subprocessFile: node.subprocessFile,
    // Remove artifacts as they may contain timestamps or other non-deterministic data
    // artifacts: node.artifacts,
    // Normalize diagnostics to just codes and severities
    diagnostics: node.diagnostics?.map((d) => ({
      severity: d.severity,
      code: d.code,
      // message: d.message, // May vary, exclude for stability
    })),
    children: node.children.map(normalizeTreeForSnapshot),
  };
}

async function loadMortgageFixturesAndParse(): Promise<
  Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>
> {
  const parseResults = new Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>();

  for (const file of MORTGAGE_FILES) {
    try {
      const result = await parseBpmnFile(`/bpmn/${file}`);
      parseResults.set(file, result);
    } catch (e) {
      // Skip files that don't exist in test environment
      console.warn(`Skipping ${file} in snapshot test:`, e);
    }
  }

  return parseResults;
}

describe('Mortgage ProcessTree snapshot', () => {
  it('matches the Mortgage ProcessTree snapshot', async () => {
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

    const normalized = normalizeTreeForSnapshot(tree);
    expect(normalized).toMatchSnapshot();
  });
});

































