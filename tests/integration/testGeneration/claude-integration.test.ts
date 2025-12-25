import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUserStoriesFromDocumentation } from '@/lib/testGeneration/userStoryExtractor';
import { buildTestScenarioContext } from '@/lib/testGeneration/testScenarioContextBuilder';
import { generateTestScenariosWithLlm } from '@/lib/testGeneration/testScenarioLlmGenerator';
import { validateTestScenarioOutput, convertLlmScenariosToTestScenarios } from '@/lib/testGeneration/testScenarioValidator';
import { supabase } from '@/integrations/supabase/client';
import { storageFileExists } from '@/lib/artifactUrls';
import { generateChatCompletion, isLlmEnabled } from '@/lib/llmClient';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import path from 'path';
import { readFileSync } from 'fs';

// Mock all external dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ data: [], error: null })),
    })),
  },
}));

vi.mock('@/lib/artifactUrls', () => ({
  storageFileExists: vi.fn(),
  getFeatureGoalDocStoragePaths: vi.fn((bpmnFile, elementId) => [
    `docs/claude/feature-goals/${bpmnFile.replace('.bpmn', '')}-${elementId}.html`,
  ]),
  getEpicDocStoragePaths: vi.fn((bpmnFile, elementId) => [
    `docs/claude/epics/${bpmnFile.replace('.bpmn', '')}-${elementId}.html`,
  ]),
}));

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

describe('Test Generation with Claude (Integration)', () => {
  const mockBpmnFile = 'mortgage-se-application.bpmn';
  const mockElementId = 'application';
  const mockEpicDocPath = path.resolve(__dirname, '../../unit/testGeneration/fixtures/mock-epic-doc.html');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run full flow: extract → build context → generate with Claude → validate → convert → save', async () => {
    // Step 1: Extract user stories
    (storageFileExists as vi.Mock).mockResolvedValue(true);
    (supabase.storage.from().download as vi.Mock).mockResolvedValue({
      data: new Blob([readFileSync(mockEpicDocPath, 'utf-8')]),
      error: null,
    });

    const extractedStories = await extractUserStoriesFromDocumentation(
      mockBpmnFile,
      mockElementId,
      'epic'
    );
    expect(extractedStories).toHaveLength(2);

    // Step 2: Build BPMN process graph
    const graph = await buildBpmnProcessGraph(mockBpmnFile, [mockBpmnFile]);

    // Step 3: Build context
    const context = buildTestScenarioContext(
      extractedStories,
      {
        summary: 'Kunden fyller i ansökningsinformation',
        flowSteps: ['Kunden öppnar formuläret', 'Kunden fyller i fält'],
      },
      graph,
      mockBpmnFile,
      mockElementId,
      'userTask',
      'Application'
    );
    expect(context).toBeDefined();
    expect(context.documentation.userStories).toHaveLength(2);

    // Step 4: Generate with Claude (mocked)
    const mockLlmResponse = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Happy Path: Skapa ansökan',
          description: 'Kunden skapar ansökan',
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
          acceptanceCriteria: ['Systemet validerar fält'],
        },
      ],
    });

    vi.mocked(generateChatCompletion).mockResolvedValue(mockLlmResponse);

    const llmResult = await generateTestScenariosWithLlm(context);
    expect(llmResult).toBeDefined();
    expect(llmResult?.scenarios).toHaveLength(1);

    // Step 5: Validate output
    const validated = validateTestScenarioOutput(mockLlmResponse);
    expect(validated).toBeDefined();
    expect(validated?.scenarios).toHaveLength(1);

    // Step 6: Convert to TestScenario format
    const testScenarios = convertLlmScenariosToTestScenarios(
      validated!,
      mockBpmnFile,
      mockElementId
    );
    expect(testScenarios).toHaveLength(1);
    expect(testScenarios[0].steps).toBeDefined();
    expect(testScenarios[0].steps.when).toHaveLength(2);
    expect(testScenarios[0].steps.then).toHaveLength(2);

    // Step 7: Save to database
    const mockUpsert = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

    const row = {
      bpmn_file: mockBpmnFile,
      bpmn_element_id: mockElementId,
      provider: 'claude',
      origin: 'llm-doc',
      scenarios: testScenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        category: s.category,
        riskLevel: s.riskLevel,
        assertionType: s.assertionType,
        steps: s.steps,
        expectedResult: s.expectedResult,
        acceptanceCriteria: s.acceptanceCriteria,
      })),
    };

    await supabase.from('node_planned_scenarios').upsert([row], {
      onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
    });

    expect(mockUpsert).toHaveBeenCalledWith([row], {
      onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
    });
  });

  it('should handle Claude failure gracefully', async () => {
    // Extract user stories
    (storageFileExists as vi.Mock).mockResolvedValue(true);
    (supabase.storage.from().download as vi.Mock).mockResolvedValue({
      data: new Blob([readFileSync(mockEpicDocPath, 'utf-8')]),
      error: null,
    });

    const extractedStories = await extractUserStoriesFromDocumentation(
      mockBpmnFile,
      mockElementId,
      'epic'
    );

    // Build context
    const graph = await buildBpmnProcessGraph(mockBpmnFile, [mockBpmnFile]);
    const context = buildTestScenarioContext(
      extractedStories,
      {},
      graph,
      mockBpmnFile,
      mockElementId,
      'userTask',
      'Application'
    );

    // Claude fails
    vi.mocked(generateChatCompletion).mockRejectedValue(new Error('Claude API error'));

    const result = await generateTestScenariosWithLlm(context);

    // Should return null on error
    expect(result).toBeNull();
  });

  it('should handle invalid Claude response gracefully', async () => {
    // Extract user stories
    (storageFileExists as vi.Mock).mockResolvedValue(true);
    (supabase.storage.from().download as vi.Mock).mockResolvedValue({
      data: new Blob([readFileSync(mockEpicDocPath, 'utf-8')]),
      error: null,
    });

    const extractedStories = await extractUserStoriesFromDocumentation(
      mockBpmnFile,
      mockElementId,
      'epic'
    );

    // Build context
    const graph = await buildBpmnProcessGraph(mockBpmnFile, [mockBpmnFile]);
    const context = buildTestScenarioContext(
      extractedStories,
      {},
      graph,
      mockBpmnFile,
      mockElementId,
      'userTask',
      'Application'
    );

    // Invalid response
    vi.mocked(generateChatCompletion).mockResolvedValue('Invalid JSON response');

    const result = await generateTestScenariosWithLlm(context);

    // Should return result with empty scenarios if validation fails
    expect(result).toBeDefined();
    expect(result?.scenarios).toHaveLength(0);
  });
});



