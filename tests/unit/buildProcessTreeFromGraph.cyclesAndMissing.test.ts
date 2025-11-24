/**
 * ProcessTreeBuilder – cycles & missing subprocess
 */

import { describe, it, expect } from 'vitest';
import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from '@/lib/bpmn/processGraph';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

describe('buildProcessTreeFromGraph – cycles & missing subprocess', () => {
  it('markerar MISSING_SUBPROCESS på callActivity utan subprocess-edge', () => {
    const nodes = new Map<string, ProcessGraphNode>();
    const edges = new Map<string, ProcessGraphEdge>();

    const rootProc: ProcessGraphNode = {
      id: 'process:root.bpmn:root',
      type: 'process',
      name: 'Root',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'root',
      processId: 'root',
      metadata: {},
    };

    const ca: ProcessGraphNode = {
      id: 'callActivity:root.bpmn:ca1',
      type: 'callActivity',
      name: 'Missing Subprocess',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'ca1',
      processId: 'root',
      metadata: {},
    };

    nodes.set(rootProc.id, rootProc);
    nodes.set(ca.id, ca);

    const graph: ProcessGraph = {
      nodes,
      edges,
      roots: [rootProc.id],
      cycles: [],
      missingDependencies: [],
    };

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'root',
      preferredRootFile: 'root.bpmn',
      artifactBuilder: () => [],
    });

    const caNode = tree.children.find((c) => c.bpmnElementId === 'ca1');
    expect(caNode).toBeDefined();
    expect(caNode?.diagnostics?.some((d) => d.code === 'MISSING_SUBPROCESS')).toBe(true);
  });

  it('markerar CYCLE_DETECTED och stoppar rekursion vid processtypcykel', () => {
    const nodes = new Map<string, ProcessGraphNode>();
    const edges = new Map<string, ProcessGraphEdge>();

    const procA: ProcessGraphNode = {
      id: 'process:a.bpmn:A',
      type: 'process',
      name: 'A',
      bpmnFile: 'a.bpmn',
      bpmnElementId: 'A',
      processId: 'A',
      metadata: {},
    };
    const procB: ProcessGraphNode = {
      id: 'process:b.bpmn:B',
      type: 'process',
      name: 'B',
      bpmnFile: 'b.bpmn',
      bpmnElementId: 'B',
      processId: 'B',
      metadata: {},
    };

    const caAB: ProcessGraphNode = {
      id: 'callActivity:a.bpmn:toB',
      type: 'callActivity',
      name: 'toB',
      bpmnFile: 'a.bpmn',
      bpmnElementId: 'toB',
      processId: 'A',
      metadata: {},
    };
    const caBA: ProcessGraphNode = {
      id: 'callActivity:b.bpmn:toA',
      type: 'callActivity',
      name: 'toA',
      bpmnFile: 'b.bpmn',
      bpmnElementId: 'toA',
      processId: 'B',
      metadata: {},
    };

    nodes.set(procA.id, procA);
    nodes.set(procB.id, procB);
    nodes.set(caAB.id, caAB);
    nodes.set(caBA.id, caBA);

    const edgeAB: ProcessGraphEdge = {
      id: 'subprocess:caAB->B',
      from: caAB.id,
      to: procB.id,
      type: 'subprocess',
      metadata: {},
    };
    const edgeBA: ProcessGraphEdge = {
      id: 'subprocess:caBA->A',
      from: caBA.id,
      to: procA.id,
      type: 'subprocess',
      metadata: {},
    };

    edges.set(edgeAB.id, edgeAB);
    edges.set(edgeBA.id, edgeBA);

    const graph: ProcessGraph = {
      nodes,
      edges,
      roots: [procA.id],
      cycles: [],
      missingDependencies: [],
    };

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'A',
      preferredRootFile: 'a.bpmn',
      artifactBuilder: () => [],
    });

    const findNode = (root: ProcessTreeNode, label: string): ProcessTreeNode | null => {
      if (root.label === label) return root;
      for (const child of root.children) {
        const found = findNode(child, label);
        if (found) return found;
      }
      return null;
    };

    const nodeA = findNode(tree, 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.diagnostics?.some((d) => d.code === 'CYCLE_DETECTED')).toBe(true);
  });
});

