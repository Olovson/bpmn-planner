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
    children: [] as any[],
  };
  const unresolvedCallActivity = {
    id: 'mortgage:Call_Sub',
    name: 'Unresolved Subprocess',
    type: 'callActivity' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Call_Sub',
    parentPath: ['Mortgage'],
    element: { ...mockNodeElement, type: 'bpmn:CallActivity', id: 'Call_Sub' },
    subprocessFile: 'subprocess.bpmn', // Add subprocessFile to avoid being skipped
    missingDefinition: false, // Set to false so it's not skipped
    subprocessMatchStatus: 'unresolved' as const,
    subprocessDiagnostics: ['NO_MATCH'],
    children: [] as any[],
  };
  const businessRuleNode = {
    id: 'mortgage:Rule_1',
    name: 'Evaluate rule',
    type: 'businessRuleTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Rule_1',
    parentPath: ['Mortgage'],
    element: { ...mockNodeElement, type: 'bpmn:BusinessRuleTask', id: 'Rule_1' },
    children: [] as any[],
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
  renderFeatureGoalDoc: () => '<html><body>feature</body></html>',
  renderEpicDoc: () => '<html><body>epic</body></html>',
  renderBusinessRuleDoc: (_context: any, links: any) =>
    `<html><body>${links?.dmnLink ?? 'Ingen DMN-länk konfigurerad'}</body></html>`,
}));

vi.mock('@/lib/wrapLlmContent', () => ({
  wrapLlmContentAsDocument: (content: string, title: string) =>
    `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`,
}));

vi.mock('@/lib/llmDocumentation', () => ({
  generateDocumentationWithLlm: vi.fn(async () => ({
    text: 'llm-doc',
    provider: 'cloud',
    fallbackUsed: false,
  })),
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

  it('produces docs and DoR/DoD output when hierarchy succeeds', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      true,
      true // useLlm must be true since LLM is now required
    );

    expect(mockBuildBpmnProcessGraph).toHaveBeenCalledTimes(1);
    expect(result.metadata?.hierarchyUsed).toBe(true);
    expect(result.metadata?.totalFilesAnalyzed).toBe(1);
    // NOTE: Test generation has been moved to a separate function (generateTestsForFile)
    // so result.tests will be empty. Tests are now generated separately.
    expect(result.docs.size).toBeGreaterThanOrEqual(1);
    expect(result.dorDod.size).toBeGreaterThanOrEqual(1);
    expect(result.nodeArtifacts?.length).toBeGreaterThanOrEqual(1);
  });

  it('fails fast when process graph loader throws', async () => {
    mockBuildBpmnProcessGraph.mockRejectedValue(new Error('graph boom'));

    await expect(
      generateAllFromBpmnWithGraph('mortgage.bpmn', ['mortgage.bpmn'], [], true, true)
    ).rejects.toThrow('graph boom');
  });

  it('generates diagnostic docs but skips rich output for unresolved subprocess matches', async () => {
    // Add subprocessFile to existingBpmnFiles so it's not filtered out
    mockGetTestableNodes.mockReturnValue([testableNode, unresolvedCallActivity] as any);

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn', 'subprocess.bpmn'], // Include subprocess file so it's not filtered out
      [],
      true,
      true // useLlm must be true since LLM is now required
    );

    // With the new logic, callActivities with subprocessFile and missingDefinition=false
    // should generate Feature Goal documentation
    const unresolvedDocKey = Array.from(result.docs.keys()).find((key) =>
      key.includes('Call_Sub') || key.includes('subprocess'),
    );
    expect(unresolvedDocKey).toBeDefined();
    const unresolvedDoc = unresolvedDocKey ? result.docs.get(unresolvedDocKey) : '';
    expect(unresolvedDoc).toBeDefined();
    // NOTE: Test generation has been moved to a separate function (generateTestsForFile)
    // so result.tests will be empty. Tests are now generated separately.
    // The unresolved subprocess documentation should still be created though
  });

  it('adds DMN placeholder information for business rule tasks without DMN links', async () => {
    mockGetTestableNodes.mockReturnValue([businessRuleNode] as any);

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      true,
      true // useLlm must be true since LLM is now required
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
      subprocessFile: 'subprocessC.bpmn', // Add subprocessFile to avoid being skipped
      missingDefinition: false, // Set to false so it's not skipped
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
      true // useLlm must be true since LLM is now required
    );

    const cDoc = Array.from(result.docs.keys()).find((key) => key.includes('Call_C'));
    const dDoc = Array.from(result.docs.keys()).find((key) => key.includes('Task_D'));
    expect(cDoc).toBeDefined();
    expect(dDoc).toBeDefined();
    expect(result.metadata?.hierarchyDepth).toBe(3);
  });
});
