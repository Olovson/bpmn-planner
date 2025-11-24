import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type { ProcessDefinition } from '@/lib/bpmn/types';
import { buildProcessHierarchy } from '@/lib/bpmn/buildProcessHierarchy';
import {
  buildProcessModelFromHierarchy,
  buildProcessModelFromDefinitions,
  type ProcessModelInputFile,
} from '@/lib/bpmn/buildProcessModel';
import type { BpmnParseResult } from '@/lib/bpmnParser';

const baseProcess = (overrides: Partial<ProcessDefinition> = {}): ProcessDefinition => ({
  id: 'Process_A',
  name: 'Process A',
  fileName: 'process-a.bpmn',
  callActivities: [],
  tasks: [],
  ...overrides,
});

describe('buildProcessModel', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('builds a simple model with a single process and task', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'MainProc',
        name: 'Main Process',
        fileName: 'main.bpmn',
        tasks: [{ id: 'Task_1', name: 'Do thing', type: 'UserTask' }],
      }),
    ]);

    const model = buildProcessModelFromHierarchy(hierarchy);

    expect(model.hierarchyRoots).toHaveLength(1);
    const root = model.hierarchyRoots[0];
    expect(root.kind).toBe('process');
    expect(root.name).toBe('Main Process');

    const allNodes = Array.from(model.nodesById.values());
    const taskNode = allNodes.find((n) => n.kind === 'userTask');
    expect(taskNode).toBeDefined();
    expect(taskNode?.bpmnFile).toBe('main.bpmn');
    expect(taskNode?.bpmnElementId).toBe('Task_1');
  });

  it('creates subprocess hierarchy edges for matched call activities', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'Parent',
        name: 'Parent',
        fileName: 'parent.bpmn',
        callActivities: [{ id: 'Call_Sub', name: 'Call Sub', calledElement: 'Child' }],
      }),
      baseProcess({
        id: 'Child',
        name: 'Child',
        fileName: 'child.bpmn',
      }),
    ];

    const files: ProcessModelInputFile[] = [
      { fileName: 'parent.bpmn', definitions: [definitions[0]] },
      { fileName: 'child.bpmn', definitions: [definitions[1]] },
    ];

    const model = buildProcessModelFromDefinitions(files, {
      preferredRootFile: 'parent.bpmn',
    });

    const parentRoot = model.hierarchyRoots.find((root) => root.processId === 'Parent');
    expect(parentRoot).toBeDefined();

    const allNodes = Array.from(model.nodesById.values());
    const callNode = allNodes.find((n) => n.kind === 'callActivity');
    expect(callNode).toBeDefined();
    expect(callNode?.subprocessLink?.matchStatus).toBe('matched');

    const subprocessEdges = model.edges.filter((e) => e.kind === 'subprocess');
    expect(subprocessEdges).toHaveLength(1);
    expect(subprocessEdges[0].fromId).toBe(callNode?.id);
  });

  it('assigns stable preorder indices across the hierarchy', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'Root',
        name: 'Root',
        fileName: 'root.bpmn',
        callActivities: [{ id: 'Call_Child', name: 'Call Child', calledElement: 'Child' }],
        tasks: [{ id: 'Task_Root', name: 'Root Task', type: 'UserTask' }],
      }),
      baseProcess({
        id: 'Child',
        name: 'Child',
        fileName: 'child.bpmn',
        tasks: [{ id: 'Task_Child', name: 'Child Task', type: 'UserTask' }],
      }),
    ];

    const files: ProcessModelInputFile[] = [
      { fileName: 'root.bpmn', definitions: [definitions[0]] },
      { fileName: 'child.bpmn', definitions: [definitions[1]] },
    ];

    const model = buildProcessModelFromDefinitions(files, {
      preferredRootFile: 'root.bpmn',
    });

    const nodes = Array.from(model.nodesById.values());
    const indices = nodes
      .map((n) => n.primaryPathIndex)
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b);

    // Ensure indices are contiguous starting at 0
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(indices.length - 1);
  });

  it('uses sequenceFlows to derive ordering for a simple linear process', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'SimpleProc',
        name: 'Simple',
        fileName: 'simple.bpmn',
        tasks: [
          { id: 'Task_1', name: 'First', type: 'UserTask' },
          { id: 'Task_2', name: 'Second', type: 'UserTask' },
        ],
      }),
    ];

    const files: ProcessModelInputFile[] = [
      { fileName: 'simple.bpmn', definitions },
    ];

    const parseResult: BpmnParseResult = {
      elements: [
        { id: 'StartEvent_1', name: 'Start', type: 'bpmn:StartEvent', businessObject: {} },
        { id: 'Task_1', name: 'First', type: 'bpmn:UserTask', businessObject: {} },
        { id: 'Task_2', name: 'Second', type: 'bpmn:UserTask', businessObject: {} },
      ],
      subprocesses: [],
      sequenceFlows: [
        { id: 'Flow_1', name: '', sourceRef: 'StartEvent_1', targetRef: 'Task_1' },
        { id: 'Flow_2', name: '', sourceRef: 'Task_1', targetRef: 'Task_2' },
      ],
      callActivities: [],
      serviceTasks: [],
      userTasks: [],
      businessRuleTasks: [],
      meta: {
        processId: 'SimpleProc',
        name: 'Simple',
        callActivities: [],
        tasks: [],
        subprocesses: [],
        processes: [],
      },
    };

    const parseResultsByFile = new Map<string, BpmnParseResult>([
      ['simple.bpmn', parseResult],
    ]);

    const model = buildProcessModelFromDefinitions(files, {
      preferredRootFile: 'simple.bpmn',
      parseResultsByFile,
    });

    const nodes = Array.from(model.nodesById.values()).filter(
      (n) => n.bpmnFile === 'simple.bpmn' && n.bpmnElementId && n.kind === 'userTask',
    );

    const first = nodes.find((n) => n.bpmnElementId === 'Task_1');
    const second = nodes.find((n) => n.bpmnElementId === 'Task_2');
    expect(first?.primaryPathIndex).toBeLessThan(second!.primaryPathIndex!);
  });

  it('builds branch information when sequenceFlows diverge', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'BranchProc',
        name: 'Branch',
        fileName: 'branch.bpmn',
        tasks: [
          { id: 'Task_A', name: 'A', type: 'UserTask' },
          { id: 'Task_B', name: 'B', type: 'UserTask' },
        ],
      }),
    ];

    const files: ProcessModelInputFile[] = [
      { fileName: 'branch.bpmn', definitions },
    ];

    const parseResult: BpmnParseResult = {
      elements: [
        { id: 'StartEvent_1', name: 'Start', type: 'bpmn:StartEvent', businessObject: {} },
        { id: 'Gateway_1', name: 'Split', type: 'bpmn:ExclusiveGateway', businessObject: {} },
        { id: 'Task_A', name: 'A', type: 'bpmn:UserTask', businessObject: {} },
        { id: 'Task_B', name: 'B', type: 'bpmn:UserTask', businessObject: {} },
      ],
      subprocesses: [],
      sequenceFlows: [
        { id: 'Flow_start', name: '', sourceRef: 'StartEvent_1', targetRef: 'Gateway_1' },
        { id: 'Flow_A', name: '', sourceRef: 'Gateway_1', targetRef: 'Task_A' },
        { id: 'Flow_B', name: '', sourceRef: 'Gateway_1', targetRef: 'Task_B' },
      ],
      callActivities: [],
      serviceTasks: [],
      userTasks: [],
      businessRuleTasks: [],
      meta: {
        processId: 'BranchProc',
        name: 'Branch',
        callActivities: [],
        tasks: [],
        subprocesses: [],
        processes: [],
      },
    };

    const parseResultsByFile = new Map<string, BpmnParseResult>([
      ['branch.bpmn', parseResult],
    ]);

    const model = buildProcessModelFromDefinitions(files, {
      preferredRootFile: 'branch.bpmn',
      parseResultsByFile,
    });

    const nodes = Array.from(model.nodesById.values()).filter(
      (n) => n.bpmnFile === 'branch.bpmn' && n.bpmnElementId && n.kind === 'userTask',
    );

    const nodeA = nodes.find((n) => n.bpmnElementId === 'Task_A');
    const nodeB = nodes.find((n) => n.bpmnElementId === 'Task_B');

    expect(nodeA?.primaryPathIndex).toBeDefined();
    expect(nodeB?.primaryPathIndex).toBeDefined();
    // A stays on main branch, B moves to a sub-branch
    expect(nodeA?.branchId).toBe('main');
    expect(nodeB?.branchId?.startsWith('main-branch-')).toBe(true);
  });
});
