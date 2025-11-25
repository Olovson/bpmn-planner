import { describe, it, expect } from 'vitest';

/**
 * @vitest-environment jsdom
 */
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { BpmnParseResult } from '@/lib/bpmnParser';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import bpmnMap from '../../bpmn-map.json';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics');

const TARGET_FILES = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.bpmn'))
  .sort((a, b) => {
    if (a === 'mortgage.bpmn') return -1;
    if (b === 'mortgage.bpmn') return 1;
    return a.localeCompare(b);
  });

type RelevantNodeType =
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask';

const RELEVANT_TYPES: RelevantNodeType[] = [
  'callActivity',
  'userTask',
  'serviceTask',
  'businessRuleTask',
];

/**
 * Loads a BPMN file from the analytics fixtures directory
 */
function loadBpmnFromFixtures(fileName: string): string {
  const fixturePath = resolve(FIXTURES_DIR, fileName);
  try {
    return readFileSync(fixturePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to load BPMN file ${fileName} from ${fixturePath}: ${error}`);
  }
}

/**
 * Creates a data URL from XML content for parseBpmnFile to use
 */
function createBpmnDataUrl(xml: string): string {
  // Encode XML as base64 data URL
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

/**
 * Collects all relevant nodes grouped by bpmnFile
 */
function collectRelevantNodesByFile(
  tree: ProcessTreeNode,
): Map<string, ProcessTreeNode[]> {
  const map = new Map<string, ProcessTreeNode[]>();

  const visit = (node: ProcessTreeNode) => {
    if (RELEVANT_TYPES.includes(node.type as RelevantNodeType)) {
      const list = map.get(node.bpmnFile) ?? [];
      list.push(node);
      map.set(node.bpmnFile, list);
    }

    node.children.forEach(visit);
  };

  visit(tree);
  return map;
}

/**
 * Sorts nodes using the same logic as the application.
 * Uses sortCallActivities() from ganttDataConverter to ensure consistency.
 */
function sortNodesForFile(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
  // Use the same sorting function as ProcessExplorer and Timeline
  // Mode 'root' for root-level nodes, 'subprocess' for subprocess-level nodes
  // Since we're sorting nodes from a specific file, we use 'root' mode
  return sortCallActivities(nodes, 'root');
}

/**
 * Deduplicates nodes per (type, bpmnElementId) within a given file
 */
function deduplicateNodesByElement(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.type}:${node.bpmnElementId ?? node.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Builds processGraph and processTree from all BPMN files
 */
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
      console.warn(`[order-validation] failed to parse ${file}:`, error);
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

describe('Mortgage order validation', () => {
  it('validates order of activities in mortgage.bpmn', async () => {
    const { tree } = await buildProcessTree();
    const nodesByFile = collectRelevantNodesByFile(tree);

    const mortgageNodes = nodesByFile.get('mortgage.bpmn') ?? [];
    const sortedNodes = sortNodesForFile(mortgageNodes);
    const uniqueNodes = deduplicateNodesByElement(sortedNodes);
    const actualLabels = uniqueNodes.map((node) => node.label);

    // Expected order based on visual order (DI coordinates) - primary sorting method
    // This reflects the actual ordering: visualOrderIndex -> orderIndex -> branchId -> label
    // Visual order is now the primary sorting method, so nodes are sorted by their position in the BPMN diagram
    const expectedMortgageLabels = [
      'Application',                    // visualOrderIndex: 0
      'Mortgage commitment',            // visualOrderIndex: 1
      'Automatic Credit Evaluation',    // visualOrderIndex: 2
      'Appeal',                         // visualOrderIndex: 3
      'Manual credit evaluation',       // visualOrderIndex: 4
      'KYC',                            // visualOrderIndex: 5
      'Credit decision',                // visualOrderIndex: 6
      'Offer',                          // visualOrderIndex: 7
      'Document generation',            // visualOrderIndex: 8 (document-generation-advance)
      'Signing',                        // visualOrderIndex: 9 (signing-advance)
      'Document generation',            // visualOrderIndex: 10 (document-generation)
      'Disbursement',                   // visualOrderIndex: 11 (disbursement-advance)
      'Signing',                        // visualOrderIndex: 12 (signing)
      'Disbursement',                   // visualOrderIndex: 13 (disbursement)
      'Collateral registration',        // visualOrderIndex: 14
    ];

    expect(actualLabels).toEqual(expectedMortgageLabels);
  });

  it('validates DI-based order of activities in mortgage-se-application.bpmn', async () => {
    const { tree } = await buildProcessTree();
    const nodesByFile = collectRelevantNodesByFile(tree);

    const applicationNodes = nodesByFile.get('mortgage-se-application.bpmn') ?? [];
    const sortedNodes = sortNodesForFile(applicationNodes);
    const uniqueNodes = deduplicateNodesByElement(sortedNodes);
    const actualLabels = uniqueNodes.map((node) => node.label);

    // Expected order based on visual order (DI coordinates) - primary sorting method
    // This reflects the actual ordering: visualOrderIndex -> orderIndex -> branchId -> label
    const expectedApplicationLabels = [
      'Internal data gathering',  // visualOrderIndex: 0
      'Stakeholder',              // visualOrderIndex: 1
      'Household',                // visualOrderIndex: 2
      'Object',                   // visualOrderIndex: 3
      'Confirm application',      // visualOrderIndex: 4
    ];

    expect(actualLabels).toEqual(expectedApplicationLabels);
  });
});

