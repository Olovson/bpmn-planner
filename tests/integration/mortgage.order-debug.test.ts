/**
 * Test to analyze callActivity ordering across multiple BPMN files
 * 
 * Analyzes the order of callActivities in:
 * - mortgage.bpmn
 * - mortgage-se-application.bpmn
 * - mortgage-se-manual-credit-evaluation.bpmn
 * - mortgage-se-mortgage-commitment.bpmn
 * 
 * Outputs a markdown table showing the sorted order with all relevant metadata.
 * 
 * @vitest-environment jsdom
 */

import { describe, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { BpmnParseResult } from '@/lib/bpmnParser';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import bpmnMap from '../../bpmn-map.json';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics');

const TARGET_FILES = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.bpmn'))
  .sort((a, b) => {
    if (a === 'mortgage.bpmn') return -1;
    if (b === 'mortgage.bpmn') return 1;
    return a.localeCompare(b);
  });

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

interface NodeInfoRow {
  bpmnFile: string;
  bpmnElementId: string;
  label: string;
  type: string;
  orderIndex: number | null;
  visualOrderIndex: number | null;
  branchId: string | null;
  scenarioPath: string[];
  x: number | null;
  y: number | null;
  subprocessFile: string | null;
  matchedProcessId: string | null;
}

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

function deduplicateNodesByElement(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.type}:${node.bpmnElementId ?? node.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildNodeInfoRows(
  nodes: ProcessTreeNode[],
  parseResults: Map<string, BpmnParseResult>,
): NodeInfoRow[] {
  return nodes.map((node) => {
    const elementId = node.bpmnElementId ?? node.id;
    const parseResult = parseResults.get(node.bpmnFile);
    let x: number | null = null;
    let y: number | null = null;

    if (parseResult) {
      const element = parseResult.elements.find((e) => e.id === elementId);
      if (element) {
        x = element.x ?? null;
        y = element.y ?? null;
      }
    }

    return {
      bpmnFile: node.bpmnFile,
      bpmnElementId: elementId,
      label: node.label,
      type: node.type,
      orderIndex: node.orderIndex ?? null,
      visualOrderIndex: node.visualOrderIndex ?? null,
      branchId: node.branchId ?? null,
      scenarioPath: node.scenarioPath ?? [],
      x,
      y,
      subprocessFile: node.subprocessFile ?? null,
      matchedProcessId: node.subprocessLink?.matchedProcessId ?? null,
    };
  });
}

/**
 * Formats scenarioPath array as a readable string
 */
function formatScenarioPath(path: string[]): string {
  if (path.length === 0) return '[]';
  return `[${path.map((p) => `"${p}"`).join(', ')}]`;
}

/**
 * Formats a value for table display
 */
function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

/**
 * Prints a section of nodes in markdown table format
 */
function printNodeSection(sectionLabel: string, rows: NodeInfoRow[]): void {
  console.log(`### ${sectionLabel}\n`);

  if (rows.length === 0) {
    console.log('_No callActivities or tasks found in this section._\n');
    return;
  }

  console.log(
    '| # | elementId | label | type | orderIndex | visualOrderIndex | branchId | scenarioPath | x | y | subprocessFile | matchedProcessId |',
  );
  console.log(
    '|---|-----------|-------|------|-----------:|-----------------:|----------|--------------|---:|---:|----------------|------------------|',
  );

  rows.forEach((row, index) => {
    const output = [
      index + 1,
      row.bpmnElementId,
      row.label,
      row.type,
      formatValue(row.orderIndex),
      formatValue(row.visualOrderIndex),
      formatValue(row.branchId),
      formatScenarioPath(row.scenarioPath),
      formatValue(row.x),
      formatValue(row.y),
      formatValue(row.subprocessFile),
      formatValue(row.matchedProcessId),
    ].join(' | ');

    console.log(`| ${output} |`);
  });

  console.log('');
}

describe('Mortgage callActivity order analysis', () => {
  it('analyzes and prints callActivity ordering for target files', async () => {
    console.log('# CallActivity Order Analysis\n');
    console.log(
      `Analyzing callActivity ordering for ${TARGET_FILES.length} BPMN files from analytics fixtures...\n`,
    );

    // Step 1: Parse all BPMN files (loading directly from fixtures/analytics directory)
    const parseResults = new Map<string, BpmnParseResult>();
    
    for (const file of TARGET_FILES) {
      try {
        // Load XML from fixtures/analytics directory
        const xml = loadBpmnFromFixtures(file);
        const dataUrl = createBpmnDataUrl(xml);
        
        // Parse using the data URL
        const result = await parseBpmnFile(dataUrl);
        parseResults.set(file, result);
        console.log(`✓ Parsed ${file}`);
      } catch (error) {
        console.warn(`⚠ Failed to parse ${file}:`, error instanceof Error ? error.message : String(error));
        // Continue with other files
      }
    }

    if (parseResults.size === 0) {
      console.error('No files were successfully parsed. Exiting.');
      return;
    }

    console.log(`\nSuccessfully parsed ${parseResults.size} of ${TARGET_FILES.length} files\n`);

    // Step 2: Build ProcessGraph
    const bpmnMapData = loadBpmnMap(bpmnMap);
    const graph = buildProcessGraph(parseResults, {
      bpmnMap: bpmnMapData,
      preferredRootProcessId: 'mortgage',
    });

    console.log(`✓ Built ProcessGraph (${graph.nodes.size} nodes, ${graph.edges.size} edges)\n`);

    // Step 3: Build ProcessTree
    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'mortgage',
      preferredRootFile: 'mortgage.bpmn',
      artifactBuilder: () => [],
    });

    console.log(`✓ Built ProcessTree (root: ${tree.label})\n`);

    const nodesByFile = collectRelevantNodesByFile(tree);

    // Step 4: For each target file, collect and sort relevant nodes
    for (const file of TARGET_FILES) {
      console.log(`## ${file}\n`);

      const nodes = nodesByFile.get(file) ?? [];
      if (nodes.length === 0) {
        console.log('_No callActivities or tasks found in this file._\n');
        continue;
      }

      const sortedNodes = sortNodesForFile(nodes);
      const allRows = buildNodeInfoRows(sortedNodes, parseResults);
      const uniqueRows = buildNodeInfoRows(
        deduplicateNodesByElement(sortedNodes),
        parseResults,
      );

      printNodeSection('All activities (full traversal)', allRows);
      printNodeSection('Unique activities per BPMN file', uniqueRows);
    }

    console.log('\n---\n');
    console.log('Analysis complete.');
  });
});

