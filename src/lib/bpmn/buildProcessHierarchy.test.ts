import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { buildProcessHierarchy } from '@/lib/bpmn/buildProcessHierarchy';
import type { ProcessDefinition } from '@/lib/bpmn/types';

let convertProcessHierarchyToTree!: typeof import('@/hooks/useProcessTree')['convertProcessHierarchyToTree'];

const baseProcess = (overrides: Partial<ProcessDefinition> = {}): ProcessDefinition => ({
  id: 'Process_A',
  name: 'Process A',
  fileName: 'process-a.bpmn',
  callActivities: [],
  tasks: [],
  ...overrides,
});

describe('buildProcessHierarchy', () => {
  beforeAll(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    ({ convertProcessHierarchyToTree } = await import('@/hooks/useProcessTree'));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('creates a simple hierarchy with a single process and no call activities', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'Main',
        name: 'Main Process',
        tasks: [
          { id: 'Task_1', name: 'Do thing', type: 'UserTask' },
        ],
      }),
    ]);

    expect(hierarchy.roots).toHaveLength(1);
    const root = hierarchy.roots[0];
    expect(root.displayName).toBe('Main Process');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].bpmnType).toBe('userTask');
    expect(hierarchy.diagnostics).toHaveLength(0);
  });

  it('links call activities to matching subprocesses deterministically', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'Parent',
        name: 'Parent',
        fileName: 'parent.bpmn',
        callActivities: [
          { id: 'Call_Sub', name: 'Call Sub', calledElement: 'Child' },
        ],
      }),
      baseProcess({
        id: 'Child',
        name: 'Child',
        fileName: 'child.bpmn',
      }),
    ];

    const hierarchy = buildProcessHierarchy(definitions);
    expect(hierarchy.roots).toHaveLength(1);
    const root = hierarchy.roots[0];
    expect(root.children[0].bpmnType).toBe('callActivity');
    const callNode = root.children[0];
    expect(callNode.link?.matchStatus).toBe('matched');
    expect(callNode.children[0].bpmnType).toBe('process');
    expect(callNode.children[0].displayName).toBe('Child');
  });

  it('records diagnostics when no subprocess can be matched', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'Only',
        fileName: 'only.bpmn',
        callActivities: [{ id: 'Missing', name: 'Missing Subprocess' }],
      }),
    ]);

    expect(hierarchy.roots[0].children[0].link?.matchStatus).toBe('unresolved');
    expect(hierarchy.diagnostics.some((d) => d.code === 'NO_MATCH')).toBe(true);
  });

  it('marks ambiguous matches when multiple candidates score similarly', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'Parent',
        fileName: 'parent.bpmn',
        callActivities: [{ id: 'CallRisk', name: 'Review Risk' }],
      }),
      baseProcess({
        id: 'RiskReviewMain',
        name: 'Review Risk',
        fileName: 'risk-main.bpmn',
      }),
      baseProcess({
        id: 'RiskReviewAlt',
        name: 'Review Risk',
        fileName: 'risk-alt.bpmn',
      }),
    ]);

    const callNode = hierarchy.roots[0].children[0];
    expect(callNode.link?.matchStatus).toBe('ambiguous');
    expect(callNode.link?.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('detects cycles and attaches diagnostics', () => {
    const definitions = [
      baseProcess({
        id: 'Process_A',
        name: 'Process A',
        fileName: 'a.bpmn',
        callActivities: [{ id: 'Call_B', calledElement: 'Process_B' }],
      }),
      baseProcess({
        id: 'Process_B',
        name: 'Process B',
        fileName: 'b.bpmn',
        callActivities: [{ id: 'Call_A', calledElement: 'Process_A' }],
      }),
    ];
    const history = buildProcessHierarchy(definitions, {
      preferredRootProcessIds: new Set(['Process_A']),
    });

    const root = history.roots[0];
    expect(root).toBeTruthy();
    const callNode = root?.children.find((child) => child.bpmnType === 'callActivity');
    expect(callNode).toBeTruthy();
    const nestedCall = callNode?.children
      .flatMap((child) => child.children)
      .find((child) => child.bpmnType === 'callActivity');
    expect(nestedCall?.diagnostics?.some((entry) => entry.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('honors preferred roots when duplicate process IDs exist', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'SharedProc',
        name: 'Shared Primary',
        fileName: 'primary.bpmn',
        callActivities: [{ id: 'Call_Sub', calledElement: 'SharedSub' }],
      }),
      baseProcess({
        id: 'SharedProc',
        name: 'Shared Secondary',
        fileName: 'secondary.bpmn',
        callActivities: [{ id: 'Call_Sub_Secondary', calledElement: 'SharedSub' }],
      }),
      baseProcess({
        id: 'SharedSub',
        name: 'Shared Sub',
        fileName: 'subprocess.bpmn',
      }),
    ];

    // Second duplicate receives internal id SharedProc__2
    const hierarchy = buildProcessHierarchy(definitions, {
      preferredRootProcessIds: new Set(['SharedProc__2']),
    });

    const preferredRoot = hierarchy.roots.find((node) => node.nodeId === 'SharedProc__2');
    expect(preferredRoot).toBeDefined();
    const rootDefinition = hierarchy.processes.get(preferredRoot!.nodeId);
    expect(rootDefinition?.fileName).toBe('secondary.bpmn');
    const callNode = preferredRoot!.children.find((child) => child.bpmnType === 'callActivity');
    expect(callNode?.link?.matchedFileName).toBe('subprocess.bpmn');
  });

  it('supports multiple processes defined in the same BPMN file', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'MainProcess',
        fileName: 'shared-file.bpmn',
        callActivities: [{ id: 'Call_Sub', calledElement: 'NestedProcess' }],
      }),
      baseProcess({
        id: 'NestedProcess',
        fileName: 'shared-file.bpmn',
      }),
    ]);

    const root = hierarchy.roots[0];
    const callNode = root.children.find((child) => child.bpmnType === 'callActivity');
    expect(callNode?.children[0].processId).toBe('NestedProcess');
    const childDefinition = hierarchy.processes.get(callNode?.children[0].nodeId ?? '');
    expect(childDefinition?.fileName).toBe('shared-file.bpmn');
  });

  it('falls back to a root when every process has incoming edges', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'ProcA',
        fileName: 'a.bpmn',
        callActivities: [{ id: 'CallB', calledElement: 'ProcB' }],
      }),
      baseProcess({
        id: 'ProcB',
        fileName: 'b.bpmn',
        callActivities: [{ id: 'CallC', calledElement: 'ProcC' }],
      }),
      baseProcess({
        id: 'ProcC',
        fileName: 'c.bpmn',
        callActivities: [{ id: 'CallA', calledElement: 'ProcA' }],
      }),
    ]);

    expect(hierarchy.roots).toHaveLength(1);
    expect(hierarchy.diagnostics.some((diag) => diag.code === 'NO_ROOT_DETECTED')).toBe(true);
  });

  it('allows the same subprocess to be referenced by multiple parents without diagnostics', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'ParentA',
        fileName: 'a.bpmn',
        callActivities: [{ id: 'Call_Shared', calledElement: 'SharedSub' }],
      }),
      baseProcess({
        id: 'ParentB',
        fileName: 'b.bpmn',
        callActivities: [{ id: 'Call_Shared_B', calledElement: 'SharedSub' }],
      }),
      baseProcess({
        id: 'SharedSub',
        fileName: 'shared.bpmn',
      }),
    ]);

    expect(hierarchy.diagnostics).toHaveLength(0);
    const parentANode = hierarchy.roots.find((root) => root.processId === 'ParentA');
    const callFromA = parentANode?.children.find((child) => child.bpmnType === 'callActivity');
    const childFromA = callFromA?.children.find((child) => child.bpmnType === 'process');
    const parentBNode = hierarchy.roots.find((root) => root.processId === 'ParentB');
    const callFromB = parentBNode?.children.find((child) => child.bpmnType === 'callActivity');
    const childFromB = callFromB?.children.find((child) => child.bpmnType === 'process');

    expect(childFromA?.processId).toBe('SharedSub');
    expect(childFromB?.processId).toBe('SharedSub');
  });

  it('propagates diagnostics when a middle subprocess cannot be resolved', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'ProcA',
        fileName: 'a.bpmn',
        callActivities: [{ id: 'CallB', calledElement: 'ProcB' }],
      }),
      baseProcess({
        id: 'ProcB',
        fileName: 'b.bpmn',
        callActivities: [{ id: 'CallMissing' }],
      }),
    ]);

    const parentA = hierarchy.roots.find((node) => node.processId === 'ProcA');
    const callToB = parentA?.children.find((child) => child.bpmnType === 'callActivity');
    const procBNode = callToB?.children.find((child) => child.processId === 'ProcB');
    const callToMissing = procBNode?.children.find((child) => child.bpmnType === 'callActivity');

    expect(callToMissing?.link?.matchStatus).toBe('unresolved');
    expect(
      (callToMissing?.diagnostics ?? []).some((diag) => diag.code === 'NO_MATCH'),
    ).toBe(true);
  });

  it('keeps ambiguous match information when converting to the UI process tree', () => {
    const hierarchy = buildProcessHierarchy([
      baseProcess({
        id: 'RootProc',
        fileName: 'root.bpmn',
        callActivities: [{ id: 'CallAmbiguous', name: 'Review Risk' }],
      }),
      baseProcess({
        id: 'OptionA',
        name: 'Review Risk',
        fileName: 'risk-a.bpmn',
      }),
      baseProcess({
        id: 'OptionB',
        name: 'Review Risk',
        fileName: 'risk-b.bpmn',
      }),
    ]);

    const rootProcess = hierarchy.roots[0];
    const uiTree = convertProcessHierarchyToTree(rootProcess, hierarchy.processes, () => undefined);
    const callNode = uiTree?.children.find((child) => child.type === 'callActivity');
    expect(callNode?.subprocessLink?.matchStatus).toBe('ambiguous');
  });

  it('builds multi-level chains across files', () => {
    const defs: ProcessDefinition[] = [
      baseProcess({
        id: 'Mortgage',
        name: 'mortgage',
        fileName: 'mortgage.bpmn',
        callActivities: [{ id: 'Call_App', name: 'mortgage application', calledElement: 'mortgage application' }],
      }),
      baseProcess({
        id: 'MortgageApplication',
        name: 'mortgage application',
        fileName: 'mortgage-application.bpmn',
        callActivities: [{ id: 'Call_Internal', name: 'Internal data gathering', calledElement: 'Internal data gathering' }],
      }),
      baseProcess({
        id: 'InternalDataGathering',
        name: 'Internal data gathering',
        fileName: 'mortgage-se-internal-data-gathering.bpmn',
        callActivities: [{ id: 'Call_Fetch', name: 'Fetch party information', calledElement: 'Fetch party information' }],
      }),
      baseProcess({
        id: 'FetchPartyInformation',
        name: 'Fetch party information',
        fileName: 'mortgage-se-fetch-party-information.bpmn',
      }),
    ];

    const hierarchy = buildProcessHierarchy(defs);
    const root = hierarchy.roots[0];
    const appCall = root.children.find((c) => c.displayName.toLowerCase().includes('mortgage application'));
    expect(appCall?.link?.matchStatus).toBe('matched');
    const appProcess = appCall?.children.find((c) => c.bpmnType === 'process');
    const internalCall = appProcess?.children.find((c) => c.displayName.toLowerCase().includes('internal data gathering'));
    expect(internalCall?.link?.matchStatus).toBe('matched');
    const internalProcess = internalCall?.children.find((c) => c.bpmnType === 'process');
    expect(internalProcess?.displayName.toLowerCase()).toContain('internal data gathering');
    const fetchCall = internalProcess?.children.find((c) => c.displayName.toLowerCase().includes('fetch party information'));
    expect(fetchCall?.link?.matchStatus).toBe('matched');
    expect(fetchCall?.children.some((c) => c.displayName.toLowerCase().includes('fetch party information'))).toBe(true);
    expect(hierarchy.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('detects true root even when preferredRootProcessIds points to a mid-level process', () => {
    const defs: ProcessDefinition[] = [
      baseProcess({
        id: 'RootProc',
        name: 'Root',
        fileName: 'root.bpmn',
        callActivities: [{ id: 'Call_Mid', name: 'Mid', calledElement: 'MidProc' }],
      }),
      baseProcess({
        id: 'MidProc',
        name: 'Mid',
        fileName: 'mid.bpmn',
        callActivities: [{ id: 'Call_Leaf', name: 'Leaf', calledElement: 'LeafProc' }],
      }),
      baseProcess({
        id: 'LeafProc',
        name: 'Leaf',
        fileName: 'leaf.bpmn',
      }),
    ];

    const hierarchy = buildProcessHierarchy(defs, {
      preferredRootProcessIds: new Set(['MidProc']),
    });

    expect(hierarchy.roots[0].processId).toBe('RootProc');
    const midCall = hierarchy.roots[0].children.find((c) => c.link?.matchedProcessId === 'MidProc');
    expect(midCall?.children[0].processId).toBe('MidProc');
    const leafCall = midCall?.children[0].children.find((c) => c.link?.matchedProcessId === 'LeafProc');
    expect(leafCall?.children[0].processId).toBe('LeafProc');
  });

  it('includes all roots even when preferredRootProcessIds points to a non-root branch', () => {
    const defs: ProcessDefinition[] = [
      baseProcess({
        id: 'RootA',
        fileName: 'a.bpmn',
        callActivities: [{ id: 'CallA1', calledElement: 'ChildA' }],
      }),
      baseProcess({
        id: 'ChildA',
        fileName: 'a-child.bpmn',
      }),
      baseProcess({
        id: 'RootB',
        fileName: 'b.bpmn',
        callActivities: [{ id: 'CallB1', calledElement: 'ChildB' }],
      }),
      baseProcess({
        id: 'ChildB',
        fileName: 'b-child.bpmn',
      }),
    ];

    const hierarchy = buildProcessHierarchy(defs, {
      preferredRootProcessIds: new Set(['ChildB']),
    });

    const rootIds = hierarchy.roots.map((r) => r.processId).sort();
    expect(rootIds).toEqual(['RootA', 'RootB']);
    const rootB = hierarchy.roots.find((r) => r.processId === 'RootB');
    const callB = rootB?.children.find((c) => c.link?.matchedProcessId === 'ChildB');
    expect(callB?.children[0].processId).toBe('ChildB');
  });

  it('builds mortgage-style hierarchy with unresolved nested call activities', () => {
    const definitions: ProcessDefinition[] = [
      baseProcess({
        id: 'MortgageApplication',
        name: 'Application Mortgage',
        fileName: 'mortgage-se-application.bpmn',
        callActivities: [
          {
            id: 'internal-data-gathering',
            name: 'Internal data gathering',
            calledElement: 'InternalDataGathering',
          },
          {
            id: 'stakeholder',
            name: 'Stakeholder',
          },
          {
            id: 'object',
            name: 'Object',
          },
          {
            id: 'household',
            name: 'Household',
          },
        ],
      }),
      baseProcess({
        id: 'InternalDataGathering',
        name: 'Internal data gathering',
        fileName: 'mortgage-se-internal-data-gathering.bpmn',
        // inga callActivities här – motsvarar mortgage-se-internal-data-gathering.bpmn
        tasks: [
          { id: 'fetch-party-information', name: 'Fetch party information', type: 'ServiceTask' },
          { id: 'pre-screen-party', name: 'Pre-screen party', type: 'BusinessRuleTask' },
          { id: 'fetch-engagements', name: 'Fetch engagements', type: 'ServiceTask' },
        ],
      }),
    ];

    const hierarchy = buildProcessHierarchy(definitions);

    // Root ska vara MortgageApplication-processen.
    expect(hierarchy.roots[0].processId).toBe('MortgageApplication');

    const root = hierarchy.roots[0];
    const internalCall = root.children.find(
      (child) => child.bpmnType === 'callActivity' && child.link?.callActivityId === 'internal-data-gathering',
    );
    expect(internalCall?.link?.matchStatus).toBe('matched');
    expect(internalCall?.children[0].processId).toBe('InternalDataGathering');

    const stakeholderCall = root.children.find(
      (child) => child.bpmnType === 'callActivity' && child.link?.callActivityId === 'stakeholder',
    );
    const objectCall = root.children.find(
      (child) => child.bpmnType === 'callActivity' && child.link?.callActivityId === 'object',
    );
    const householdCall = root.children.find(
      (child) => child.bpmnType === 'callActivity' && child.link?.callActivityId === 'household',
    );

    // För dessa finns ingen separat processdefinition – de ska inte bli "matched".
    expect(stakeholderCall?.link?.matchStatus).not.toBe('matched');
    expect(objectCall?.link?.matchStatus).not.toBe('matched');
    expect(householdCall?.link?.matchStatus).not.toBe('matched');

    // Diagnostiken ska innehålla LOW_CONFIDENCE_MATCH eller NO_MATCH för de olösta call activities.
    const relevantDiagnostics = hierarchy.diagnostics.filter(
      (d) => d.code === 'LOW_CONFIDENCE_MATCH' || d.code === 'NO_MATCH',
    );
    const contextIds = relevantDiagnostics
      .map((d) => d.context?.callActivityId)
      .filter((id): id is string => typeof id === 'string');
    expect(contextIds).toContain('stakeholder');
    expect(contextIds).toContain('object');
    expect(contextIds).toContain('household');
  });
});
