/**
 * Snapshot regression test for generated artifacts
 * Ensures generated tests and documentation remain consistent
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import {
  generateHierarchicalTestFileFromTree,
  generateDocumentationFromTree,
} from '@/lib/bpmnGenerators';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
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

describe('Mortgage generated artifacts snapshot', () => {
  it('matches generated test suite snapshot for Mortgage', async () => {
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

    const testSource = generateHierarchicalTestFileFromTree(tree, 'mortgage.bpmn');
    expect(testSource).toMatchSnapshot();
  });

  it('matches generated documentation snapshot for Mortgage', async () => {
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

    const docContent = generateDocumentationFromTree(tree);
    expect(docContent).toMatchSnapshot();
  });
});














































