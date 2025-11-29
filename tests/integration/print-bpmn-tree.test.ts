/**
 * Test to generate markdown file with complete BPMN tree sorted in order
 * 
 * Generates bpmn-tree-output.md with all nodes sorted by orderIndex → visualOrderIndex → branchId → label
 * 
 * @vitest-environment jsdom
 */

import { describe, it } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import * as XLSX from 'xlsx';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import bpmnMap from '../../bpmn-map.json';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics');

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
 * Get icon for node type
 */
function getTypeIcon(type: ProcessTreeNode['type']): string {
  const icons: Record<ProcessTreeNode['type'], string> = {
    process: '📋',
    callActivity: '📦',
    userTask: '👤',
    serviceTask: '⚙️',
    businessRuleTask: '📜',
  };
  return icons[type] || '📄';
}

/**
 * Format order information
 */
function formatOrderInfo(node: ProcessTreeNode): string {
  const parts: string[] = [];
  if (node.orderIndex !== undefined && node.orderIndex !== null) {
    parts.push(`order:${node.orderIndex}`);
  }
  if (node.visualOrderIndex !== undefined && node.visualOrderIndex !== null) {
    parts.push(`visual:${node.visualOrderIndex}`);
  }
  if (node.branchId) {
    parts.push(`branch:${node.branchId}`);
  }
  return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

/**
 * Generate tree hierarchy in markdown format
 */
function generateTreeHierarchyMarkdown(
  node: ProcessTreeNode,
  depth: number = 0,
  maxDepth: number = 20,
  lines: string[] = [],
): string[] {
  if (depth > maxDepth) return lines;

  const typeIcon = getTypeIcon(node.type);
  const orderInfo = formatOrderInfo(node);
  const fileInfo = depth > 0 && node.bpmnFile ? ` (${node.bpmnFile})` : '';
  const elementId = node.bpmnElementId ? ` [${node.bpmnElementId}]` : '';

  // Build the tree line with proper indentation
  const indent = '  '.repeat(depth);
  const line = `${indent}- ${typeIcon} **${node.label}**${orderInfo}${elementId}${fileInfo}`;
  lines.push(line);

  // Sort children using the same logic as ProcessExplorer
  const sortedChildren = sortCallActivities(node.children, depth === 0 ? 'root' : 'subprocess');

  // Recursively process children
  for (const child of sortedChildren) {
    generateTreeHierarchyMarkdown(child, depth + 1, maxDepth, lines);
  }

  return lines;
}

/**
 * Collect all nodes in order (flat list)
 */
function collectAllNodesInOrder(node: ProcessTreeNode, result: ProcessTreeNode[] = []): ProcessTreeNode[] {
  result.push(node);

  // Sort children
  const sortedChildren = sortCallActivities(
    node.children,
    node.type === 'process' ? 'root' : 'subprocess'
  );

  // Recursively collect from sorted children
  for (const child of sortedChildren) {
    collectAllNodesInOrder(child, result);
  }

  return result;
}

/**
 * Collect nodes with depth information for Excel export
 */
function collectNodesWithDepth(
  node: ProcessTreeNode,
  depth: number = 0,
  result: Array<ProcessTreeNode & { depth: number; path: string[] }> = [],
  path: string[] = []
): Array<ProcessTreeNode & { depth: number; path: string[] }> {
  const currentPath = [...path, node.label];
  result.push({ ...node, depth, path: currentPath });

  // Sort children
  const sortedChildren = sortCallActivities(
    node.children,
    node.type === 'process' ? 'root' : 'subprocess'
  );

  // Recursively collect from sorted children
  for (const child of sortedChildren) {
    collectNodesWithDepth(child, depth + 1, result, currentPath);
  }

  return result;
}

/**
 * Generate Excel workbook with hierarchical tree structure
 */
function generateExcelWorkbook(
  tree: ProcessTreeNode,
  allNodes: ProcessTreeNode[],
  graph: { nodes: { size: number }; edges: { size: number } }
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Hierarchical Tree View
  const treeData = collectNodesWithDepth(tree);
  const maxDepth = Math.max(...treeData.map((n) => n.depth));

  // Create headers with dynamic level columns
  const headers: string[] = ['Level'];
  
  // Add level columns (Level 1, Level 2, etc.)
  for (let i = 1; i <= maxDepth + 1; i++) {
    headers.push(`Level ${i}`);
  }
  
  // Add remaining columns
  headers.push(
    'Type',
    'Label',
    'Element ID',
    'BPMN File',
    'Order Index',
    'Visual Order Index',
    'Branch ID',
    'Path'
  );

  const treeRows: any[][] = [headers];

  treeData.forEach((node) => {
    const row: any[] = [];
    
    // Level number
    row.push(node.depth + 1);
    
    // Level columns - show label at appropriate depth, empty for other levels
    for (let i = 0; i <= maxDepth; i++) {
      if (i === node.depth) {
        row.push(node.label);
      } else {
        row.push('');
      }
    }
    
    // Type
    row.push(node.type);
    
    // Label (full)
    row.push(node.label);
    
    // Element ID
    row.push(node.bpmnElementId || '');
    
    // BPMN File
    row.push(node.bpmnFile || '');
    
    // Order Index
    row.push(node.orderIndex ?? '');
    
    // Visual Order Index
    row.push(node.visualOrderIndex ?? '');
    
    // Branch ID
    row.push(node.branchId || '');
    
    // Path (full path from root)
    row.push(node.path.join(' → '));
    
    treeRows.push(row);
  });

  const treeSheet = XLSX.utils.aoa_to_sheet(treeRows);
  
  // Set column widths
  const colWidths = [
    { wch: 8 }, // Level
    ...Array(maxDepth + 1).fill({ wch: 30 }), // Level columns
    { wch: 15 }, // Type
    { wch: 40 }, // Label
    { wch: 25 }, // Element ID
    { wch: 25 }, // BPMN File
    { wch: 12 }, // Order Index
    { wch: 18 }, // Visual Order Index
    { wch: 20 }, // Branch ID
    { wch: 100 }, // Path
  ];
  treeSheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, treeSheet, 'Tree Hierarchy');

  // Sheet 2: Flat List
  const flatHeaders = [
    '#',
    'Type',
    'Label',
    'Element ID',
    'BPMN File',
    'Order Index',
    'Visual Order Index',
    'Branch ID',
    'Depth',
  ];
  
  const flatRows: any[][] = [flatHeaders];
  
  allNodes.forEach((node, index) => {
    const depth = treeData.find((n) => n.bpmnElementId === node.bpmnElementId)?.depth ?? 0;
    flatRows.push([
      index + 1,
      node.type,
      node.label,
      node.bpmnElementId || '',
      node.bpmnFile || '',
      node.orderIndex ?? '',
      node.visualOrderIndex ?? '',
      node.branchId || '',
      depth,
    ]);
  });

  const flatSheet = XLSX.utils.aoa_to_sheet(flatRows);
  flatSheet['!cols'] = [
    { wch: 6 }, // #
    { wch: 15 }, // Type
    { wch: 40 }, // Label
    { wch: 25 }, // Element ID
    { wch: 25 }, // BPMN File
    { wch: 12 }, // Order Index
    { wch: 18 }, // Visual Order Index
    { wch: 20 }, // Branch ID
    { wch: 8 }, // Depth
  ];
  
  XLSX.utils.book_append_sheet(workbook, flatSheet, 'Flat List');

  // Sheet 3: Summary
  const summaryRows: any[][] = [
    ['Metadata', 'Value'],
    ['Total Nodes', allNodes.length],
    ['ProcessGraph Nodes', graph.nodes.size],
    ['ProcessGraph Edges', graph.edges.size],
    ['Root Process', tree.label],
    ['Max Depth', maxDepth + 1],
    ['Generated', new Date().toISOString()],
    ['', ''],
    ['Legend', ''],
    ['Type', 'Description'],
    ['Process', 'Root or subprocess container'],
    ['CallActivity', 'Subprocess call'],
    ['UserTask', 'User interaction task'],
    ['ServiceTask', 'Automated service task'],
    ['BusinessRuleTask', 'Business rule evaluation'],
    ['', ''],
    ['Ordering Information', ''],
    ['Order Index', 'Sequential order from sequence flows (primary sorting)'],
    ['Visual Order Index', 'Visual order from BPMN DI coordinates (x, y)'],
    ['Branch ID', 'Branch identifier for parallel flows'],
    ['Label', 'Alphabetical fallback when no ordering information is available'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  return workbook;
}

/**
 * Generate flat list markdown table
 */
function generateFlatListMarkdown(nodes: ProcessTreeNode[]): string {
  const lines: string[] = [];
  
  lines.push('## Flat List (All Nodes in Order)');
  lines.push('');
  lines.push('| # | Type | Label | Element ID | BPMN File | orderIndex | visualOrderIndex | branchId |');
  lines.push('|---|------|-------|------------|-----------|-----------:|-----------------:|----------|');

  nodes.forEach((node, index) => {
    const row = [
      index + 1,
      node.type,
      node.label,
      node.bpmnElementId || '—',
      node.bpmnFile || '—',
      node.orderIndex ?? '—',
      node.visualOrderIndex ?? '—',
      node.branchId || '—',
    ].join(' | ');

    lines.push(`| ${row} |`);
  });

  return lines.join('\n');
}

describe('Print BPMN Tree', () => {
  it('generates markdown file with complete BPMN tree sorted in order', async () => {
    const outputLines: string[] = [];

    // Header
    outputLines.push('# BPMN Tree - Complete Hierarchy Sorted by Order');
    outputLines.push('');
    outputLines.push('This document shows the complete BPMN tree with all nodes sorted in order.');
    outputLines.push('');
    outputLines.push('**Sorting order**: `orderIndex` → `visualOrderIndex` → `branchId` → `label`');
    outputLines.push('');
    outputLines.push('---');
    outputLines.push('');

    // Get all BPMN files from fixtures
    const allFiles = readdirSync(FIXTURES_DIR)
      .filter((file) => file.endsWith('.bpmn'))
      .sort((a, b) => {
        if (a === 'mortgage.bpmn') return -1;
        if (b === 'mortgage.bpmn') return 1;
        return a.localeCompare(b);
      });

    if (allFiles.length === 0) {
      throw new Error('No BPMN files found in fixtures');
    }

    outputLines.push(`## BPMN Files`);
    outputLines.push('');
    outputLines.push(`Found ${allFiles.length} BPMN files:`);
    allFiles.forEach((file) => {
      outputLines.push(`- ${file}`);
    });
    outputLines.push('');

    // Step 1: Parse all BPMN files
    const parseResults = new Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>();
    for (const file of allFiles) {
      try {
        const xml = loadBpmnFromFixtures(file);
        const dataUrl = createBpmnDataUrl(xml);
        const result = await parseBpmnFile(dataUrl);
        parseResults.set(file, result);
      } catch (error) {
        console.warn(`⚠ Failed to parse ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (parseResults.size === 0) {
      throw new Error('No files were successfully parsed');
    }

    // Step 2: Build ProcessGraph
    const bpmnMapData = loadBpmnMap(bpmnMap);
    const graph = buildProcessGraph(parseResults, {
      bpmnMap: bpmnMapData,
      preferredRootProcessId: bpmnMapData.rootProcessId || 'mortgage',
    });

    // Step 3: Build ProcessTree
    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: bpmnMapData.rootProcessId || 'mortgage',
      preferredRootFile: bpmnMapData.rootFile || allFiles[0],
      artifactBuilder: () => [],
    });

    // Step 4: Generate tree hierarchy markdown
    outputLines.push('## Tree Hierarchy');
    outputLines.push('');
    const treeLines = generateTreeHierarchyMarkdown(tree, 0, 20);
    outputLines.push(...treeLines);
    outputLines.push('');

    // Step 5: Generate flat list
    const allNodes = collectAllNodesInOrder(tree);
    const flatListMarkdown = generateFlatListMarkdown(allNodes);
    outputLines.push(flatListMarkdown);
    outputLines.push('');

    // Step 6: Add metadata and legend
    outputLines.push('---');
    outputLines.push('');
    outputLines.push('## Metadata');
    outputLines.push('');
    outputLines.push(`- **Total nodes**: ${allNodes.length}`);
    outputLines.push(`- **ProcessGraph nodes**: ${graph.nodes.size}`);
    outputLines.push(`- **ProcessGraph edges**: ${graph.edges.size}`);
    outputLines.push(`- **Root process**: ${tree.label}`);
    outputLines.push('');
    outputLines.push('## Legend');
    outputLines.push('');
    outputLines.push('| Icon | Type | Description |');
    outputLines.push('|------|------|-------------|');
    outputLines.push('| 📋 | Process | Root or subprocess container |');
    outputLines.push('| 📦 | CallActivity | Subprocess call |');
    outputLines.push('| 👤 | UserTask | User interaction task |');
    outputLines.push('| ⚙️  | ServiceTask | Automated service task |');
    outputLines.push('| 📜 | BusinessRuleTask | Business rule evaluation |');
    outputLines.push('');
    outputLines.push('## Ordering Information');
    outputLines.push('');
    outputLines.push('- **orderIndex**: Sequential order from sequence flows (primary sorting)');
    outputLines.push('- **visualOrderIndex**: Visual order from BPMN DI coordinates (x, y) - used when orderIndex is missing');
    outputLines.push('- **branchId**: Branch identifier for parallel flows');
    outputLines.push('- **label**: Alphabetical fallback when no ordering information is available');
    outputLines.push('');
    outputLines.push('---');
    outputLines.push('');
    outputLines.push(`*Generated: ${new Date().toISOString()}*`);

    // Write markdown file
    const markdownPath = resolve(process.cwd(), 'bpmn-tree-output.md');
    const markdownContent = outputLines.join('\n');
    writeFileSync(markdownPath, markdownContent, 'utf-8');

    console.log(`\n✅ Generated markdown file: ${markdownPath}`);
    console.log(`   Total nodes: ${allNodes.length}`);
    console.log(`   File size: ${(markdownContent.length / 1024).toFixed(2)} KB`);

    // Generate Excel file
    const workbook = generateExcelWorkbook(tree, allNodes, graph);
    const excelPath = resolve(process.cwd(), 'bpmn-tree-output.xlsx');
    XLSX.writeFile(workbook, excelPath);

    console.log(`\n✅ Generated Excel file: ${excelPath}`);
    console.log(`   Sheets: Tree Hierarchy, Flat List, Summary`);
    console.log(`   Total nodes: ${allNodes.length}`);
  });
});

