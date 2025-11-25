#!/usr/bin/env tsx
/**
 * Script to analyze callActivity ordering across multiple BPMN files
 * 
 * Analyzes the order of callActivities in:
 * - mortgage.bpmn
 * - mortgage-se-application.bpmn
 * - mortgage-se-manual-credit-evaluation.bpmn
 * - mortgage-se-mortgage-commitment.bpmn
 * 
 * Outputs a markdown table showing the sorted order with all relevant metadata.
 */

import { parseBpmnFile } from '../src/lib/bpmnParser';
import { buildProcessGraph } from '../src/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '../src/lib/bpmn/processTreeBuilder';
import type { ProcessTreeNode } from '../src/lib/bpmn/processTreeTypes';
import type { BpmnParseResult } from '../src/lib/bpmnParser';
import { sortCallActivities } from '../src/lib/ganttDataConverter';
import bpmnMap from '../bpmn-map.json';
import { loadBpmnMap } from '../src/lib/bpmn/bpmnMapLoader';

const TARGET_FILES = [
  'mortgage.bpmn',
  'mortgage-se-application.bpmn',
  'mortgage-se-manual-credit-evaluation.bpmn',
  'mortgage-se-mortgage-commitment.bpmn',
];

interface CallActivityInfo {
  bpmnFile: string;
  bpmnElementId: string;
  label: string;
  orderIndex: number | null;
  visualOrderIndex: number | null;
  branchId: string | null;
  scenarioPath: string[];
  x: number | null;
  y: number | null;
  subprocessFile: string | null;
  matchedProcessId: string | null;
}

/**
 * Collects all callActivities from a ProcessTree that belong to a specific BPMN file
 */
function collectCallActivitiesForFile(
  tree: ProcessTreeNode,
  bpmnFile: string,
  parseResults: Map<string, BpmnParseResult>
): CallActivityInfo[] {
  const result: CallActivityInfo[] = [];

  function traverse(node: ProcessTreeNode) {
    if (node.type === 'callActivity' && node.bpmnFile === bpmnFile) {
      // Find x/y coordinates from parseResults
      const parseResult = parseResults.get(bpmnFile);
      let x: number | null = null;
      let y: number | null = null;

      if (parseResult && node.bpmnElementId) {
        const element = parseResult.elements.find((e) => e.id === node.bpmnElementId);
        if (element) {
          x = element.x ?? null;
          y = element.y ?? null;
        }
      }

      result.push({
        bpmnFile: node.bpmnFile,
        bpmnElementId: node.bpmnElementId ?? '',
        label: node.label,
        orderIndex: node.orderIndex ?? null,
        visualOrderIndex: node.visualOrderIndex ?? null,
        branchId: node.branchId ?? null,
        scenarioPath: node.scenarioPath ?? [],
        x,
        y,
        subprocessFile: node.subprocessFile ?? null,
        matchedProcessId: node.subprocessLink?.matchedProcessId ?? null,
      });
    }

    // Recursively traverse children
    node.children.forEach(traverse);
  }

  traverse(tree);
  return result;
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
 * Prints callActivities for a file in markdown table format
 */
function printCallActivitiesTable(
  bpmnFile: string,
  activities: CallActivityInfo[]
): void {
  console.log(`\n## ${bpmnFile}\n`);

  if (activities.length === 0) {
    console.log('_No callActivities found in this file._\n');
    return;
  }

  // Print table header
  console.log(
    '| # | elementId | label | orderIndex | visualOrderIndex | branchId | scenarioPath | x | y | subprocessFile | matchedProcessId |'
  );
  console.log(
    '|---|-----------|-------|-----------:|-----------------:|----------|--------------|---:|---:|----------------|------------------|'
  );

  // Print each row
  activities.forEach((activity, index) => {
    const row = [
      index + 1,
      activity.bpmnElementId,
      activity.label,
      formatValue(activity.orderIndex),
      formatValue(activity.visualOrderIndex),
      formatValue(activity.branchId),
      formatScenarioPath(activity.scenarioPath),
      formatValue(activity.x),
      formatValue(activity.y),
      formatValue(activity.subprocessFile),
      formatValue(activity.matchedProcessId),
    ].join(' | ');

    console.log(`| ${row} |`);
  });

  console.log('');
}

async function main() {
  console.log('# CallActivity Order Analysis\n');
  console.log('Analyzing callActivity ordering for mortgage BPMN files...\n');

  // Step 1: Parse all BPMN files
  const parseResults = new Map<string, BpmnParseResult>();
  for (const file of TARGET_FILES) {
    try {
      const result = await parseBpmnFile(`/bpmn/${file}`);
      parseResults.set(file, result);
      console.log(`✓ Parsed ${file}`);
    } catch (error) {
      console.error(`✗ Failed to parse ${file}:`, error);
      // Continue with other files
    }
  }

  if (parseResults.size === 0) {
    console.error('No files were successfully parsed. Exiting.');
    process.exit(1);
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

  // Step 4: For each target file, collect and sort callActivities
  for (const file of TARGET_FILES) {
    const activities = collectCallActivitiesForFile(tree, file, parseResults);
    
    // Convert CallActivityInfo[] to ProcessTreeNode[] for sorting
    // We need to convert back to ProcessTreeNode format to use sortCallActivities
    const activityNodes: ProcessTreeNode[] = activities.map(activity => {
      // Find the original node from the tree to get full ProcessTreeNode structure
      let originalNode: ProcessTreeNode | null = null;
      const findNode = (node: ProcessTreeNode): void => {
        if (node.bpmnFile === activity.bpmnFile && 
            node.bpmnElementId === activity.bpmnElementId && 
            node.type === 'callActivity') {
          originalNode = node;
          return;
        }
        node.children.forEach(findNode);
      };
      findNode(tree);
      
      // If we found the original node, use it; otherwise create a minimal one
      if (originalNode) {
        return originalNode;
      }
      
      // Fallback: create minimal ProcessTreeNode from CallActivityInfo
      return {
        id: activity.bpmnElementId,
        label: activity.label,
        type: 'callActivity',
        bpmnFile: activity.bpmnFile,
        bpmnElementId: activity.bpmnElementId,
        orderIndex: activity.orderIndex ?? undefined,
        visualOrderIndex: activity.visualOrderIndex ?? undefined,
        branchId: activity.branchId ?? undefined,
        scenarioPath: activity.scenarioPath,
        children: [],
        subprocessFile: activity.subprocessFile ?? undefined,
      };
    });
    
    // Use the same sorting function as ProcessExplorer and Timeline
    // Mode 'root' for root-level nodes
    const sortedNodes = sortCallActivities(activityNodes, 'root');
    
    // Convert back to CallActivityInfo[] for printing
    const sortedActivities: CallActivityInfo[] = sortedNodes.map(node => {
      const originalActivity = activities.find(a => 
        a.bpmnFile === node.bpmnFile && 
        a.bpmnElementId === node.bpmnElementId
      );
      return originalActivity!;
    });

    printCallActivitiesTable(file, sortedActivities);
  }

  console.log('\n---\n');
  console.log('Analysis complete.');
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

