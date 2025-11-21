import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

const {
  mockHierarchyResult,
  mockNodeElement,
  testableNode,
  unresolvedCallActivity,
  businessRuleNode,
  mockProcessGraph,
  mockBuildBpmnProcessGraph,
  mockCreateGraphSummary,
  mockGetTestableNodes,
} = vi.hoisted(() => {
  const mockHierarchyResult = {
    rootName: 'Mortgage',
    rootNode: {
      type: 'Process',
      children: [],
    },
    bpmnFile: 'mortgage.bpmn',
  };

  const mockNodeElement = {
    id: 'Task_Approve',
    name: 'Approve mortgage',
    type: 'bpmn:UserTask',
    businessObject: {
      documentation: [{ text: 'Document approval process' }],
    },
  };

  const testableNode = {
    id: 'mortgage:Task_Approve',
    name: 'Approve mortgage',
    type: 'userTask',
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Approve',
    parentPath: ['Mortgage'],
    element: mockNodeElement,
  };
  const unresolvedCallActivity = {
    id: 'mortgage:Call_Sub',
    name: 'Unresolved Subprocess',
    type: 'callActivity' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Call_Sub',
    parentPath: ['Mortgage'],
    element: { ...mockNodeElement, type: 'bpmn:CallActivity', id: 'Call_Sub' },
    subprocessMatchStatus: 'unresolved' as const,
    subprocessDiagnostics: ['NO_MATCH'],
  };
  const businessRuleNode = {
    id: 'mortgage:Rule_1',
    name: 'Evaluate rule',
    type: 'businessRuleTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Rule_1',
    parentPath: ['Mortgage'],
    element: { ...mockNodeElement, type: 'bpmn:BusinessRuleTask', id: 'Rule_1' },
  };

  const mockProcessGraph = {
    rootFile: 'mortgage.bpmn',
    root: {
      id: 'root:mortgage',
      name: 'mortgage',
      type: 'process',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'root',
      children: [],
    },
    allNodes: new Map(),
    fileNodes: new Map([['mortgage.bpmn', []]]),
    missingDependencies: [],
  };

  return {
    mockHierarchyResult,
    mockNodeElement,
    testableNode,
    unresolvedCallActivity,
    mockProcessGraph,
    mockBuildBpmnProcessGraph: vi.fn(async () => mockProcessGraph),
    mockCreateGraphSummary: vi.fn(() => ({
      totalFiles: 1,
      totalNodes: 1,
      filesIncluded: ['mortgage.bpmn'],
      hierarchyDepth: 2,
    })),
    mockGetTestableNodes: vi.fn(() => [testableNode]),
    businessRuleNode,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(async () => ({ data: null, error: null })),
        list: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

vi.mock('@/lib/bpmnProcessGraph', () => ({
  buildBpmnProcessGraph: mockBuildBpmnProcessGraph,
  createGraphSummary: mockCreateGraphSummary,
  getTestableNodes: mockGetTestableNodes,
}));

vi.mock('@/lib/documentationContext', () => ({
  buildNodeDocumentationContext: vi.fn(() => ({
    node: {
      bpmnElementId: 'Task_Approve',
      name: 'Approve mortgage',
      bpmnFile: 'mortgage.bpmn',
    },
    childNodes: [],
    parentChain: [],
  })),
}));

vi.mock('@/lib/documentationTemplates', () => ({
  renderFeatureGoalDoc: () => '<html>feature</html>',
  renderEpicDoc: () => '<html>epic</html>',
  renderBusinessRuleDoc: (_context: any, links: any) =>
    `<html>${links?.dmnLink ?? 'Ingen DMN-länk konfigurerad'}</html>`,
}));

vi.mock('@/lib/llmDocumentation', () => ({
  generateDocumentationWithLlm: vi.fn(async () => 'llm-doc'),
}));

vi.mock('@/lib/llmTests', () => ({
  generateTestSpecWithLlm: vi.fn(async () => [
    { name: 'LLM scenario', description: 'desc', steps: [] },
  ]),
}));

vi.mock('@/lib/llmClient', () => ({
  isLlmEnabled: () => true,
}));

vi.mock('@/lib/llmMonitoring', () => ({
  logLlmFallback: vi.fn(async () => undefined),
}));

vi.mock('@/lib/llmDebugStorage', () => ({
  saveLlmDebugArtifact: vi.fn(async () => undefined),
}));

describe('generateAllFromBpmnWithGraph', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        headers: new Headers(),
        text: async () => '',
      })) as any
    );

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    mockBuildBpmnProcessGraph.mockResolvedValue(mockProcessGraph as any);
    mockCreateGraphSummary.mockReturnValue({
      totalFiles: 1,
      totalNodes: 1,
      filesIncluded: ['mortgage.bpmn'],
      hierarchyDepth: 2,
    });
    mockGetTestableNodes.mockReturnValue([testableNode]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('produces docs, tests and DoR/DoD output when hierarchy succeeds', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      true,
      false
    );

    expect(mockBuildBpmnProcessGraph).toHaveBeenCalledTimes(1);
    expect(result.metadata?.hierarchyUsed).toBe(true);
    expect(result.metadata?.totalFilesAnalyzed).toBe(1);
    expect(result.tests.size).toBeGreaterThanOrEqual(2); // hierarchical + node test
    expect(result.docs.size).toBeGreaterThanOrEqual(1);
    expect(result.dorDod.size).toBeGreaterThanOrEqual(1);
    expect(result.nodeArtifacts?.length).toBeGreaterThanOrEqual(1);
  });

  it('fails fast when process graph loader throws', async () => {
    mockBuildBpmnProcessGraph.mockRejectedValue(new Error('graph boom'));

    await expect(
      generateAllFromBpmnWithGraph('mortgage.bpmn', ['mortgage.bpmn'], [], true, false)
    ).rejects.toThrow('graph boom');
  });

  it('generates diagnostic docs but skips rich output for unresolved subprocess matches', async () => {
    mockGetTestableNodes.mockReturnValue([testableNode, unresolvedCallActivity] as any);

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      true,
      false
    );

    const unresolvedDocKey = Array.from(result.docs.keys()).find((key) =>
      key.includes('Call_Sub'),
    );
    expect(unresolvedDocKey).toBeDefined();
    const unresolvedDoc = unresolvedDocKey ? result.docs.get(unresolvedDocKey) : '';
    expect(unresolvedDoc).toBeDefined();
    // Per-node test should still be created for the unresolved subprocess
    const unresolvedTestKey = Array.from(result.tests.keys()).find((key) =>
      key.includes('Call_Sub'),
    );
    expect(unresolvedTestKey).toBeDefined();
  });

  it('adds DMN placeholder information for business rule tasks without DMN links', async () => {
    mockGetTestableNodes.mockReturnValue([businessRuleNode] as any);

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      true,
      false
    );

    const docKey = Array.from(result.docs.keys()).find((key) => key.includes('Rule_1'));
    expect(docKey).toBeDefined();
    const docContent = docKey ? result.docs.get(docKey) : '';
    expect(docContent).toMatch(/Ingen DMN-l\u00e4nk konfigurerad/);
  });

  it('generates docs for reused subprocesses in multi-parent chains without losing depth', async () => {
    const sharedC = {
      id: 'mortgage:Call_C',
      name: 'Subprocess C',
      type: 'callActivity' as const,
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Call_C',
      element: { ...mockNodeElement, type: 'bpmn:CallActivity', id: 'Call_C' },
      children: [] as any[],
    };
    const deepTask = {
      id: 'subprocessC:Task_D',
      name: 'Task D',
      type: 'userTask' as const,
      bpmnFile: 'subprocessC.bpmn',
      bpmnElementId: 'Task_D',
      element: { ...mockNodeElement, type: 'bpmn:UserTask', id: 'Task_D' },
      children: [] as any[],
    };
    sharedC.children = [deepTask];

    const root = {
      id: 'root:mortgage',
      name: 'Root',
      type: 'process',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'root',
      children: [
        { ...sharedC, id: 'mortgage:Call_C_A' },
        { ...sharedC, id: 'mortgage:Call_C_B' },
      ],
    };

    const graph = {
      rootFile: 'mortgage.bpmn',
      root,
      allNodes: new Map(
        [
          root,
          root.children[0],
          root.children[1],
          deepTask,
        ].map((n: any) => [n.id, n]),
      ),
      fileNodes: new Map([
        ['mortgage.bpmn', [root, root.children[0], root.children[1]]],
        ['subprocessC.bpmn', [deepTask]],
      ]),
      missingDependencies: [],
    };

    mockBuildBpmnProcessGraph.mockResolvedValueOnce(graph as any);
    mockCreateGraphSummary.mockReturnValueOnce({
      totalFiles: 2,
      totalNodes: 4,
      filesIncluded: ['mortgage.bpmn', 'subprocessC.bpmn'],
      hierarchyDepth: 3,
    });
    mockGetTestableNodes.mockReturnValueOnce([
      root.children[0],
      root.children[1],
      deepTask,
    ] as any);

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn', 'subprocessC.bpmn'],
      [],
      true,
      false
    );

    const cDoc = Array.from(result.docs.keys()).find((key) => key.includes('Call_C'));
    const dDoc = Array.from(result.docs.keys()).find((key) => key.includes('Task_D'));
    expect(cDoc).toBeDefined();
    expect(dDoc).toBeDefined();
    expect(result.metadata?.hierarchyDepth).toBe(3);
  });
});
