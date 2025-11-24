#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { buildProcessGraph } from '../src/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '../src/lib/bpmn/processTreeBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '../src/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '../src/lib/bpmn/processTreeTypes';
import type { ProcessGraph } from '../src/lib/bpmn/processGraph';

async function main() {
  const rootProcessId = process.argv[2] || 'mortgage';

  console.log(`Inspecting process graph for root: ${rootProcessId}`);

  const parseResults = await loadAllBpmnParseResults();
  const bpmnMap = await loadBpmnMap();

  const graph: ProcessGraph = buildProcessGraph(parseResults as any, {
    bpmnMap,
    preferredRootProcessId: rootProcessId,
  });

  console.log(`Graph: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
  console.log(`Roots: ${JSON.stringify(graph.roots, null, 2)}`);
  console.log(`Cycles: ${JSON.stringify(graph.cycles, null, 2)}`);
  console.log(
    `Missing deps: ${JSON.stringify(graph.missingDependencies, null, 2)}`,
  );

  const tree = buildProcessTreeFromGraph(graph, {
    rootProcessId,
    preferredRootFile: 'mortgage.bpmn',
    artifactBuilder: () => [],
  });

  const totalNodes = countTreeNodes(tree);
  console.log(`\nProcessTree: ${totalNodes} nodes`);
  console.log(`Root: [${tree.type}] ${tree.label}`);

  const diagSummary = summarizeDiagnostics(tree);
  console.log(`Diagnostics summary: ${JSON.stringify(diagSummary, null, 2)}`);

  printTree(tree, 0, 3);
}

function countTreeNodes(root: ProcessTreeNode): number {
  return 1 + root.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
}

function summarizeDiagnostics(root: ProcessTreeNode): Record<string, number> {
  const counts: Record<string, number> = {};

  const visit = (node: ProcessTreeNode) => {
    (node.diagnostics ?? []).forEach((d) => {
      const key = `${d.severity}:${d.code}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    node.children.forEach(visit);
  };

  visit(root);
  return counts;
}

function printTree(node: ProcessTreeNode, depth: number, maxDepth: number) {
  if (depth > maxDepth) return;
  const indent = ' '.repeat(depth * 2);
  console.log(
    `${indent}- [${node.type}] ${node.label} (file: ${node.bpmnFile}#${
      node.bpmnElementId
    }, order: ${node.orderIndex ?? 'n/a'})`,
  );
  node.children.forEach((child) => printTree(child, depth + 1, maxDepth));
}

main().catch((err) => {
  console.error('graph:inspect failed:', err);
  process.exit(1);
});

