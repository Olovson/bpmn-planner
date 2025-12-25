import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTestScenariosWithLlm } from '@/lib/testGeneration/testScenarioLlmGenerator';
import type { TestScenarioContext } from '@/lib/testGeneration/testScenarioLlmTypes';
import { generateChatCompletion, isLlmEnabled } from '@/lib/llmClient';

// Mock LLM client
vi.mock('@/lib/llmClient', () => ({
  generateChatCompletion: vi.fn(),
  isLlmEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/llmClientAbstraction', () => ({
  getDefaultLlmProvider: vi.fn(() => 'claude'),
}));

vi.mock('@/lib/llmProviderResolver', () => ({
  resolveLlmProvider: vi.fn(({ userChoice, globalDefault }) => ({
    provider: userChoice || globalDefault,
    fallbackProvider: undefined,
  })),
}));

vi.mock('@/lib/llmFallback', () => ({
  generateWithFallback: vi.fn(async (options) => {
    const mockResult = await (generateChatCompletion as any)(options.messages, options.provider, options.schema);
    return mockResult ? {
      text: mockResult,
      provider: options.provider,
      fallbackUsed: false,
    } : null;
  }),
}));

vi.mock('@/lib/llmLogging', () => ({
  logLlmEvent: vi.fn(async () => {}),
}));

vi.mock('@/lib/llmDebugStorage', () => ({
  saveLlmDebugArtifact: vi.fn(async () => {}),
}));

vi.mock('@/lib/testGeneration/testScenarioValidator', () => ({
  validateTestScenarioOutput: vi.fn((output: string) => {
    try {
      const parsed = JSON.parse(output);
      if (parsed && parsed.scenarios && Array.isArray(parsed.scenarios)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }),
}));

describe('testScenarioLlmGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate test scenarios with Claude (mocked)', async () => {
    const mockContext: TestScenarioContext = {
      nodeContext: {
        bpmnFile: 'mortgage-se-application.bpmn',
        elementId: 'application',
        nodeType: 'userTask',
        nodeName: 'Application',
      },
      documentation: {
        userStories: [
          {
            id: 'US-1',
            role: 'Kund',
            goal: 'skapa ansökan',
            value: 'jag kan ansöka om lån',
            acceptanceCriteria: [
              'Systemet ska validera att alla obligatoriska fält är ifyllda',
            ],
          },
        ],
        summary: 'Kunden fyller i ansökningsinformation',
        flowSteps: ['Kunden öppnar formuläret', 'Kunden fyller i fält'],
      },
      bpmnProcessFlow: {
        paths: [
          {
            type: 'happy-path',
            nodes: [
              { id: 'start', type: 'event', name: 'Start' },
              { id: 'application', type: 'userTask', name: 'Application' },
              { id: 'end', type: 'event', name: 'End' },
            ],
          },
        ],
      },
    };

    const mockLlmResponse = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Happy Path: Skapa ansökan',
          description: 'Kunden skapar ansökan genom att fylla i formulär',
          category: 'happy-path',
          priority: 'P1',
          steps: [
            {
              order: 1,
              action: 'Kunden öppnar ansökningsformuläret',
              expectedResult: 'Formuläret visas',
            },
            {
              order: 2,
              action: 'Kunden fyller i personuppgifter',
              expectedResult: 'Alla fält är ifyllda',
            },
          ],
          acceptanceCriteria: [
            'Systemet ska validera att alla obligatoriska fält är ifyllda',
          ],
        },
      ],
    });

    vi.mocked(generateChatCompletion).mockResolvedValue(mockLlmResponse);

    const result = await generateTestScenariosWithLlm(mockContext);

    expect(result).toBeDefined();
    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].id).toBe('scenario-1');
    expect(result?.scenarios[0].name).toBe('Happy Path: Skapa ansökan');
    expect(result?.scenarios[0].category).toBe('happy-path');
    expect(result?.scenarios[0].priority).toBe('P1');
    expect(result?.scenarios[0].steps).toHaveLength(2);
    expect(result?.provider).toBe('claude');
    expect(result?.fallbackUsed).toBe(false);
  });

  it('should return null if LLM is disabled', async () => {
    vi.mocked(isLlmEnabled).mockReturnValue(false);

    const mockContext: TestScenarioContext = {
      nodeContext: {
        bpmnFile: 'test.bpmn',
        elementId: 'test',
        nodeType: 'userTask',
        nodeName: 'Test',
      },
      documentation: {
        userStories: [],
      },
      bpmnProcessFlow: {
        paths: [],
      },
    };

    const result = await generateTestScenariosWithLlm(mockContext);

    expect(result).toBeNull();
    expect(generateChatCompletion).not.toHaveBeenCalled();
  });

  it('should handle invalid LLM response gracefully', async () => {
    vi.mocked(generateChatCompletion).mockResolvedValue('Invalid JSON response');

    const mockContext: TestScenarioContext = {
      nodeContext: {
        bpmnFile: 'test.bpmn',
        elementId: 'test',
        nodeType: 'userTask',
        nodeName: 'Test',
      },
      documentation: {
        userStories: [],
      },
      bpmnProcessFlow: {
        paths: [],
      },
    };

    const result = await generateTestScenariosWithLlm(mockContext);

    // Should return result with empty scenarios if validation fails
    expect(result).toBeDefined();
    expect(result?.scenarios).toHaveLength(0);
  });

  it('should handle LLM errors gracefully', async () => {
    vi.mocked(generateChatCompletion).mockRejectedValue(new Error('LLM API error'));

    const mockContext: TestScenarioContext = {
      nodeContext: {
        bpmnFile: 'test.bpmn',
        elementId: 'test',
        nodeType: 'userTask',
        nodeName: 'Test',
      },
      documentation: {
        userStories: [],
      },
      bpmnProcessFlow: {
        paths: [],
      },
    };

    const result = await generateTestScenariosWithLlm(mockContext);

    expect(result).toBeNull();
  });
});

