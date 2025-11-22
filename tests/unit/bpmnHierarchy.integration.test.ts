import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildBpmnHierarchy } from '@/lib/bpmnHierarchy';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import type { BpmnParseResult } from '@/lib/bpmnParser';
import type { BpmnMeta } from '@/types/bpmnMeta';

const makeMeta = (overrides: Partial<BpmnMeta>): BpmnMeta => ({
  processId: 'process',
  name: 'Process',
  callActivities: [],
  tasks: [],
  subprocesses: [],
  ...overrides,
});

const simpleProcessParseResult: BpmnParseResult = {
  elements: [
    { id: 'UserTask_1', name: 'Do something', type: 'bpmn:UserTask', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [],
  serviceTasks: [],
  userTasks: [
    { id: 'UserTask_1', name: 'Do something', type: 'bpmn:UserTask', businessObject: {} as any },
  ],
  businessRuleTasks: [],
  meta: makeMeta({
    processId: 'simple-process',
    name: 'Simple Process',
    tasks: [
      { id: 'UserTask_1', name: 'Do something', type: 'UserTask' },
    ],
    processes: [
      {
        id: 'simple-process',
        name: 'Simple Process',
        callActivities: [],
        tasks: [
          { id: 'UserTask_1', name: 'Do something', type: 'UserTask' },
        ],
        parseDiagnostics: [],
      },
    ],
  }),
};

const rootWithSubParseResult: BpmnParseResult = {
  elements: [
    { id: 'Call_Sub', name: 'Run simple subprocess', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [
    { id: 'Call_Sub', name: 'Run simple subprocess', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  serviceTasks: [],
  userTasks: [],
  businessRuleTasks: [],
  meta: makeMeta({
    processId: 'root-with-subprocess',
    name: 'Root With Subprocess',
    callActivities: [
      { id: 'Call_Sub', name: 'Run simple subprocess', calledElement: 'simple-subprocess' },
    ],
    processes: [
      {
        id: 'root-with-subprocess',
        name: 'Root With Subprocess',
        callActivities: [
          { id: 'Call_Sub', name: 'Run simple subprocess', calledElement: 'simple-subprocess' },
        ],
        tasks: [],
        parseDiagnostics: [],
      },
    ],
  }),
};

const subProcessParseResult: BpmnParseResult = {
  elements: [
    { id: 'UserTask_Sub', name: 'Do sub work', type: 'bpmn:UserTask', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [],
  serviceTasks: [],
  userTasks: [
    { id: 'UserTask_Sub', name: 'Do sub work', type: 'bpmn:UserTask', businessObject: {} as any },
  ],
  businessRuleTasks: [],
  meta: makeMeta({
    processId: 'simple-subprocess',
    name: 'Simple Subprocess',
    tasks: [
      { id: 'UserTask_Sub', name: 'Do sub work', type: 'UserTask' },
    ],
    processes: [
      {
        id: 'simple-subprocess',
        name: 'Simple Subprocess',
        callActivities: [],
        tasks: [
          { id: 'UserTask_Sub', name: 'Do sub work', type: 'UserTask' },
        ],
        parseDiagnostics: [],
      },
    ],
  }),
};

const missingSubParseResult: BpmnParseResult = {
  elements: [
    { id: 'Call_Missing', name: 'Run missing subprocess', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [
    { id: 'Call_Missing', name: 'Run missing subprocess', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  serviceTasks: [],
  userTasks: [],
  businessRuleTasks: [],
  meta: makeMeta({
    processId: 'root-with-missing-subprocess',
    name: 'Root With Missing Subprocess',
    callActivities: [
      { id: 'Call_Missing', name: 'Run missing subprocess', calledElement: 'missing-subprocess' },
    ],
    processes: [
      {
        id: 'root-with-missing-subprocess',
        name: 'Root With Missing Subprocess',
        callActivities: [
          { id: 'Call_Missing', name: 'Run missing subprocess', calledElement: 'missing-subprocess' },
        ],
        tasks: [],
        parseDiagnostics: [],
      },
    ],
  }),
};

// Mortgage-specific fixtures: application + internal-data-gathering chain.
const mortgageApplicationParseResult: BpmnParseResult = {
  elements: [
    { id: 'internal-data-gathering', name: 'Internal data gathering', type: 'bpmn:CallActivity', businessObject: {} as any },
    { id: 'stakeholders', name: 'Per stakeholder', type: 'bpmn:SubProcess', businessObject: {} as any },
    { id: 'household', name: 'Household', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [
    { id: 'internal-data-gathering', name: 'Internal data gathering', type: 'bpmn:CallActivity', businessObject: {} as any },
    { id: 'household', name: 'Household', type: 'bpmn:CallActivity', businessObject: {} as any },
    { id: 'stakeholder', name: 'Stakeholder', type: 'bpmn:CallActivity', businessObject: {} as any },
    { id: 'object', name: 'Object', type: 'bpmn:CallActivity', businessObject: {} as any },
  ],
  serviceTasks: [],
  userTasks: [
    { id: 'confirm-application', name: 'Confirm application', type: 'bpmn:UserTask', businessObject: {} as any },
  ],
  businessRuleTasks: [],
  meta: makeMeta({
    processId: 'mortgage-se-application',
    name: 'Application Mortgage',
    callActivities: [
      // Root feature call to internal-data-gathering.
      { id: 'internal-data-gathering', name: 'Internal data gathering', calledElement: 'mortgage-se-internal-data-gathering' },
      // Nested subprocess calls inside the application process: stakeholder/object/household.
      { id: 'stakeholder', name: 'Stakeholder', calledElement: 'mortgage-se-stakeholder' },
      { id: 'object', name: 'Object', calledElement: 'mortgage-se-object' },
      { id: 'household', name: 'Household', calledElement: 'mortgage-se-household' },
    ],
    tasks: [
      { id: 'internal-data-gathering', name: 'Internal data gathering', type: 'CallActivity' },
      { id: 'stakeholders', name: 'Per stakeholder', type: 'SubProcess' },
      { id: 'household', name: 'Household', type: 'CallActivity' },
    ],
    processes: [
      {
        id: 'mortgage-se-application',
        name: 'Application Mortgage',
        callActivities: [
          { id: 'internal-data-gathering', name: 'Internal data gathering', calledElement: 'mortgage-se-internal-data-gathering' },
          { id: 'stakeholder', name: 'Stakeholder', calledElement: 'mortgage-se-stakeholder' },
          { id: 'object', name: 'Object', calledElement: 'mortgage-se-object' },
          { id: 'household', name: 'Household', calledElement: 'mortgage-se-household' },
        ],
        tasks: [
          { id: 'internal-data-gathering', name: 'Internal data gathering', type: 'CallActivity' },
          { id: 'stakeholders', name: 'Per stakeholder', type: 'SubProcess' },
          { id: 'household', name: 'Household', type: 'CallActivity' },
        ],
        parseDiagnostics: [],
      },
    ],
  }),
};

const mortgageInternalDataGatheringParseResult: BpmnParseResult = {
  elements: [
    { id: 'fetch-party-information', name: 'Fetch party information', type: 'bpmn:ServiceTask', businessObject: {} as any },
    { id: 'pre-screen-party', name: 'Pre-screen party', type: 'bpmn:BusinessRuleTask', businessObject: {} as any },
    { id: 'fetch-engagements', name: 'Fetch engagements', type: 'bpmn:ServiceTask', businessObject: {} as any },
  ],
  subprocesses: [],
  sequenceFlows: [],
  callActivities: [],
  serviceTasks: [
    { id: 'fetch-party-information', name: 'Fetch party information', type: 'bpmn:ServiceTask', businessObject: {} as any },
    { id: 'fetch-engagements', name: 'Fetch engagements', type: 'bpmn:ServiceTask', businessObject: {} as any },
  ],
  userTasks: [],
  businessRuleTasks: [
    { id: 'pre-screen-party', name: 'Pre-screen party', type: 'bpmn:BusinessRuleTask', businessObject: {} as any },
  ],
  meta: makeMeta({
    processId: 'mortgage-se-internal-data-gathering',
    name: 'Internal data gathering',
    callActivities: [],
    tasks: [
      { id: 'fetch-party-information', name: 'Fetch party information', type: 'ServiceTask' },
      { id: 'pre-screen-party', name: 'Pre-screen party', type: 'BusinessRuleTask' },
      { id: 'fetch-engagements', name: 'Fetch engagements', type: 'ServiceTask' },
    ],
    processes: [
      {
        id: 'mortgage-se-internal-data-gathering',
        name: 'Internal data gathering',
        callActivities: [],
        tasks: [
          { id: 'fetch-party-information', name: 'Fetch party information', type: 'ServiceTask' },
          { id: 'pre-screen-party', name: 'Pre-screen party', type: 'BusinessRuleTask' },
          { id: 'fetch-engagements', name: 'Fetch engagements', type: 'ServiceTask' },
        ],
        parseDiagnostics: [],
      },
    ],
  }),
};

vi.mock('@/lib/bpmnParser', () => {
  return {
    parseBpmnFile: vi.fn(async (fileUrl: string) => {
      const fileName = fileUrl.split('/').pop() || fileUrl;
      if (fileName === 'simple-process.bpmn') return simpleProcessParseResult;
      if (fileName === 'process-with-subprocess.bpmn') return rootWithSubParseResult;
      if (fileName === 'mortgage-se-simple-subprocess.bpmn') return subProcessParseResult;
      if (fileName === 'process-with-missing-subprocess.bpmn') return missingSubParseResult;
      if (fileName === 'mortgage-se-application.bpmn') return mortgageApplicationParseResult;
      if (fileName === 'mortgage-se-internal-data-gathering.bpmn') return mortgageInternalDataGatheringParseResult;
      throw new Error(`Unexpected BPMN fixture requested in test: ${fileName}`);
    }),
  };
});

describe('BPMN hierarchy & process graph with fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds hierarchy for a simple process without subprocesses', async () => {
    const hierarchy = await buildBpmnHierarchy(
      'simple-process.bpmn',
      '/bpmn/simple-process.bpmn',
    );

    expect(hierarchy.rootName).toBe('Simple Process');
    expect(hierarchy.bpmnFile).toBe('simple-process.bpmn');
    expect(hierarchy.rootNode.children.length).toBeGreaterThanOrEqual(1);
  });

  it('builds process graph for complete hierarchy with subprocess', async () => {
    const graph = await buildBpmnProcessGraph('process-with-subprocess.bpmn', [
      'process-with-subprocess.bpmn',
      'mortgage-se-simple-subprocess.bpmn',
    ]);

    expect(graph.rootFile).toBe('process-with-subprocess.bpmn');
    expect(graph.missingDependencies.length).toBe(0);
  });

  it('handles missing subprocess BPMN files without throwing and records missingDependencies', async () => {
    const graph = await buildBpmnProcessGraph(
      'process-with-missing-subprocess.bpmn',
      ['process-with-missing-subprocess.bpmn'],
    );

    expect(graph.rootFile).toBe('process-with-missing-subprocess.bpmn');
    expect(graph.missingDependencies.length).toBeGreaterThanOrEqual(1);
    const missing = graph.missingDependencies[0];
    expect(missing.parent).toBe('process-with-missing-subprocess.bpmn');
  });

  it('builds mortgage application graph with internal-data-gathering as root dependency', async () => {
    const graph = await buildBpmnProcessGraph('mortgage-se-application.bpmn', [
      'mortgage-se-application.bpmn',
      'mortgage-se-internal-data-gathering.bpmn',
    ]);

    expect(graph.rootFile).toBe('mortgage-se-application.bpmn');
    // Application + internal-data-gathering as distinct processes.
    expect(graph.missingDependencies.length).toBeGreaterThanOrEqual(3);
    const childProcessIds = graph.missingDependencies.map((d) => d.childProcess);
    // För mortgage-caset förväntar vi oss att subprocess-kedjan innehåller
    // Stakeholder/Object/Household som olösta beroenden när inga dedikerade
    // BPMN-filer finns för dem i testuppsättningen.
    expect(childProcessIds).toContain('Stakeholder');
    expect(childProcessIds).toContain('Object');
    expect(childProcessIds).toContain('Household');
  });

  it('builds mortgage internal-data-gathering graph and reports missing stakeholder/object/household subprocesses without hanging', async () => {
    const graph = await buildBpmnProcessGraph('mortgage-se-application.bpmn', [
      'mortgage-se-application.bpmn',
      'mortgage-se-internal-data-gathering.bpmn',
    ]);

    // The important part here är att anropet returnerar och att vi får diagnostik
    // för saknade subprocesser i mortgage-kedjan (Stakeholder/Object/Household).
    expect(graph.rootFile).toBe('mortgage-se-application.bpmn');
    expect(graph.missingDependencies.length).toBeGreaterThanOrEqual(3);
    const diagnostics = graph.missingDependencies.filter((d) =>
      ['Stakeholder', 'Object', 'Household'].includes(d.childProcess),
    );
    expect(diagnostics.length).toBe(3);
  });
});
