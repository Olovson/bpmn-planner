/**
 * buildProcessTreeFromGraph – Comprehensive unit tests
 * Tests correct root, hierarchy, callActivity expansion, task ordering, and diagnostics
 */

import { describe, it, expect } from 'vitest';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from '@/lib/bpmn/processGraph';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

describe('buildProcessTreeFromGraph – comprehensive tests', () => {
  it('byggs korrekt root och hierarki', () => {
    const nodes = new Map<string, ProcessGraphNode>();
    const edges = new Map<string, ProcessGraphEdge>();

    const rootProc: ProcessGraphNode = {
      id: 'process:root.bpmn:root',
      type: 'process',
      name: 'Root Process',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'root',
      processId: 'root',
      metadata: {},
    };

    const task1: ProcessGraphNode = {
      id: 'userTask:root.bpmn:Task_1',
      type: 'userTask',
      name: 'First Task',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'Task_1',
      processId: 'root',
      metadata: { orderIndex: 0 },
    };

    nodes.set(rootProc.id, rootProc);
    nodes.set(task1.id, task1);

    const hierarchyEdge: ProcessGraphEdge = {
      id: 'hierarchy:root->Task_1',
      from: rootProc.id,
      to: task1.id,
      type: 'hierarchy',
      metadata: {},
    };

    edges.set(hierarchyEdge.id, hierarchyEdge);

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

    expect(tree.type).toBe('process');
    expect(tree.label).toBe('Root Process');
    expect(tree.bpmnFile).toBe('root.bpmn');
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].label).toBe('First Task');
  });

  it('expanderar callActivities till sina barn', () => {
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
      name: 'Subprocess',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'ca1',
      processId: 'root',
      metadata: { orderIndex: 0 },
    };

    const childProc: ProcessGraphNode = {
      id: 'process:child.bpmn:child',
      type: 'process',
      name: 'Child Process',
      bpmnFile: 'child.bpmn',
      bpmnElementId: 'child',
      processId: 'child',
      metadata: {},
    };

    const childTask: ProcessGraphNode = {
      id: 'userTask:child.bpmn:Task_1',
      type: 'userTask',
      name: 'Child Task',
      bpmnFile: 'child.bpmn',
      bpmnElementId: 'Task_1',
      processId: 'child',
      metadata: { orderIndex: 0 },
    };

    nodes.set(rootProc.id, rootProc);
    nodes.set(ca.id, ca);
    nodes.set(childProc.id, childProc);
    nodes.set(childTask.id, childTask);

    const hierarchyEdge1: ProcessGraphEdge = {
      id: 'hierarchy:root->ca1',
      from: rootProc.id,
      to: ca.id,
      type: 'hierarchy',
      metadata: {},
    };

    const subprocessEdge: ProcessGraphEdge = {
      id: 'subprocess:ca1->child',
      from: ca.id,
      to: childProc.id,
      type: 'subprocess',
      metadata: {},
    };

    const hierarchyEdge2: ProcessGraphEdge = {
      id: 'hierarchy:child->Task_1',
      from: childProc.id,
      to: childTask.id,
      type: 'hierarchy',
      metadata: {},
    };

    edges.set(hierarchyEdge1.id, hierarchyEdge1);
    edges.set(subprocessEdge.id, subprocessEdge);
    edges.set(hierarchyEdge2.id, hierarchyEdge2);

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

    const caNode = tree.children.find((c) => c.type === 'callActivity');
    expect(caNode).toBeDefined();
    expect(caNode?.label).toBe('Subprocess');

    // CallActivity should have children (the child process's tasks)
    expect(caNode?.children.length).toBeGreaterThan(0);
    const childTaskNode = caNode?.children.find((c) => c.label === 'Child Task');
    expect(childTaskNode).toBeDefined();
  });

  it('sorterar tasks enligt orderIndex', () => {
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

    const task1: ProcessGraphNode = {
      id: 'userTask:root.bpmn:Task_1',
      type: 'userTask',
      name: 'First',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'Task_1',
      processId: 'root',
      metadata: { orderIndex: 0 },
    };

    const task2: ProcessGraphNode = {
      id: 'userTask:root.bpmn:Task_2',
      type: 'userTask',
      name: 'Second',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'Task_2',
      processId: 'root',
      metadata: { orderIndex: 1 },
    };

    const task3: ProcessGraphNode = {
      id: 'userTask:root.bpmn:Task_3',
      type: 'userTask',
      name: 'Third',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'Task_3',
      processId: 'root',
      metadata: { orderIndex: 2 },
    };

    nodes.set(rootProc.id, rootProc);
    nodes.set(task1.id, task1);
    nodes.set(task2.id, task2);
    nodes.set(task3.id, task3);

    const edgesArray: ProcessGraphEdge[] = [
      { id: 'h1', from: rootProc.id, to: task1.id, type: 'hierarchy', metadata: {} },
      { id: 'h2', from: rootProc.id, to: task2.id, type: 'hierarchy', metadata: {} },
      { id: 'h3', from: rootProc.id, to: task3.id, type: 'hierarchy', metadata: {} },
    ];

    edgesArray.forEach((e) => edges.set(e.id, e));

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

    const taskNodes = tree.children.filter((c) => c.type === 'userTask');
    expect(taskNodes.length).toBe(3);
    expect(taskNodes[0].label).toBe('First');
    expect(taskNodes[1].label).toBe('Second');
    expect(taskNodes[2].label).toBe('Third');

    // Verify orderIndex is preserved
    expect(taskNodes[0].orderIndex).toBe(0);
    expect(taskNodes[1].orderIndex).toBe(1);
    expect(taskNodes[2].orderIndex).toBe(2);
  });

  it('fyller diagnostics vid cycle/missing subprocess', () => {
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

    const hierarchyEdge: ProcessGraphEdge = {
      id: 'hierarchy:root->ca1',
      from: rootProc.id,
      to: ca.id,
      type: 'hierarchy',
      metadata: {},
    };

    edges.set(hierarchyEdge.id, hierarchyEdge);

    const graph: ProcessGraph = {
      nodes,
      edges,
      roots: [rootProc.id],
      cycles: [
        {
          nodes: ['process:root.bpmn:root', 'process:child.bpmn:child'],
          type: 'indirect',
          severity: 'warning',
        },
      ],
      missingDependencies: [
        {
          callActivityId: 'ca1',
          callActivityName: 'Missing Subprocess',
          expectedFile: 'missing.bpmn',
          context: { reason: 'map-file-not-found' },
        },
      ],
    };

    const tree = buildProcessTreeFromGraph(graph, {
      rootProcessId: 'root',
      preferredRootFile: 'root.bpmn',
      artifactBuilder: () => [],
    });

    const caNode = tree.children.find((c) => c.type === 'callActivity');
    expect(caNode).toBeDefined();

    // Should have diagnostics for missing subprocess
    expect(caNode?.diagnostics).toBeDefined();
    expect(caNode?.diagnostics?.length).toBeGreaterThan(0);
    expect(caNode?.diagnostics?.some((d) => d.code === 'MISSING_SUBPROCESS')).toBe(true);
  });
});






























