import { describe, it } from 'vitest';

/**
 * Test to display the complete ProcessTree hierarchy with sequential ordering
 * 
 * Shows how all BPMN nodes are sorted using the same logic as the application.
 * Uses sortCallActivities() from ganttDataConverter to ensure consistency.
 * 
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
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

/**
 * Formats order information for display
 */
function formatOrderInfo(node: ProcessTreeNode): string {
  const parts: string[] = [];
  
  if (node.visualOrderIndex !== undefined) {
    parts.push(`visual:${node.visualOrderIndex}`);
  }
  if (node.orderIndex !== undefined) {
    parts.push(`order:${node.orderIndex}`);
  }
  if (node.branchId) {
    parts.push(`branch:${node.branchId}`);
  }
  
  return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

/**
 * Prints the ProcessTree hierarchy in ASCII format
 * Uses the same sorting logic as ProcessExplorer (sortCallActivities)
 */
function printTreeHierarchy(
  node: ProcessTreeNode,
  depth: number = 0,
  maxDepth: number = 10,
  isLast: boolean = true,
  prefix: string = '',
): void {
  if (depth > maxDepth) return;
  
  const typeIcon = getTypeIcon(node.type);
  const orderInfo = formatOrderInfo(node);
  const fileInfo = depth > 0 && node.bpmnFile ? ` (${node.bpmnFile})` : '';
  
  // Build the tree line with proper indentation
  const connector = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';
  const line = `${prefix}${connector}${typeIcon} ${node.label}${orderInfo}${fileInfo}`;
  console.log(line);
  
  // Sort children using the same logic as ProcessExplorer
  const sortedChildren = sortCallActivities(node.children, depth === 0 ? 'root' : 'subprocess');
  
  if (sortedChildren.length > 0) {
    const childPrefix = depth === 0 ? '  ' : isLast ? '   ' : '│  ';
    
    sortedChildren.forEach((child, index) => {
      const childIsLast = index === sortedChildren.length - 1;
      printTreeHierarchy(child, depth + 1, maxDepth, childIsLast, prefix + childPrefix);
    });
  }
}

/**
 * Returns an icon for the node type
 */
function getTypeIcon(type: ProcessTreeNode['type']): string {
  const icons: Record<ProcessTreeNode['type'], string> = {
    process: '📋',
    callActivity: '📞',
    userTask: '👤',
    serviceTask: '⚙️',
    businessRuleTask: '📊',
    dmnDecision: '🎯',
  };
  return icons[type] || '📄';
}

describe('Mortgage tree hierarchy display', () => {
  it('displays complete ProcessTree hierarchy with sequential ordering', async () => {
    console.log('\n# ProcessTree Hierarchy with Sequential Ordering\n');
    console.log('This shows how all BPMN nodes are sorted using the same logic as ProcessExplorer.\n');
    console.log('Sorting order: visualOrderIndex → orderIndex → branchId → label\n');
    console.log('─'.repeat(80) + '\n');

    // Step 1: Parse all BPMN files
    const parseResults = new Map<string, BpmnParseResult>();
    
    for (const file of TARGET_FILES) {
      try {
        const xml = loadBpmnFromFixtures(file);
        const dataUrl = createBpmnDataUrl(xml);
        const result = await parseBpmnFile(dataUrl);
        parseResults.set(file, result);
        console.log(`✓ Parsed ${file}`);
      } catch (error) {
        console.warn(`⚠ Failed to parse ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (parseResults.size === 0) {
      console.error('No files were successfully parsed.');
      return;
    }

    console.log(`\n✓ Successfully parsed ${parseResults.size} of ${TARGET_FILES.length} files\n`);

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
    console.log('─'.repeat(80) + '\n');

    // Step 4: Print the complete hierarchy
    printTreeHierarchy(tree, 0, 10, true, '');

    console.log('\n' + '─'.repeat(80));
    console.log('\nLegend:');
    console.log('  visual:X = visualOrderIndex (from DI coordinates)');
    console.log('  order:X = orderIndex (from sequence flows)');
    console.log('  branch:X = branchId (main branch or parallel branches)');
    console.log('\nSorting priority: visualOrderIndex → orderIndex → branchId → label');
    console.log('\n✓ Hierarchy display complete.\n');
  });
});

