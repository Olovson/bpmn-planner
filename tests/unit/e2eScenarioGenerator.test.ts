/**
 * Unit tests for E2E scenario generation
 * 
 * Tests the E2E scenario generation functionality including:
 * - Path identification from BPMN process graph
 * - Feature Goal documentation loading
 * - E2E scenario generation with Claude (mocked)
 * - Scenario filtering (prioritized scenarios only)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateE2eScenariosForProcess, generateE2eScenarioWithLlm } from '@/lib/e2eScenarioGenerator';
import type { E2eScenarioContext, FeatureGoalDoc } from '@/lib/e2eScenarioGenerator';
import type { ProcessPath } from '@/lib/bpmnFlowExtractor';
import { generateChatCompletion, isLlmEnabled } from '@/lib/llmClient';
import { generateWithFallback } from '@/lib/llmFallback';

// Mock LLM dependencies
vi.mock('@/lib/llmClient', () => ({
  generateChatCompletion: vi.fn(),
  isLlmEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/llmClientAbstraction', () => ({
  resolveLlmProvider: vi.fn(({ userChoice, globalDefault }) => ({
    provider: userChoice || globalDefault || 'cloud',
    fallbackProvider: undefined,
  })),
}));

vi.mock('@/lib/llmClients', () => ({
  getDefaultLlmProvider: vi.fn(() => 'cloud'),
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

vi.mock('@/lib/promptLoader', () => ({
  getE2eScenarioPrompt: vi.fn(() => 'Mock E2E scenario prompt'),
}));

// Mock BPMN parsing and flow extraction
vi.mock('@/lib/bpmnParser', () => ({
  parseBpmnFile: vi.fn(),
}));

vi.mock('@/lib/bpmnFlowExtractor', () => ({
  buildFlowGraph: vi.fn(),
  findStartEvents: vi.fn(),
  findPathsThroughProcess: vi.fn(),
}));

// Mock storage
vi.mock('@/lib/e2eScenarioStorage', () => ({
  saveE2eScenariosToStorage: vi.fn(async () => {}),
  loadFeatureGoalDocFromStorage: vi.fn(),
}));

vi.mock('@/lib/bpmnGenerators/docRendering', () => ({
  loadChildDocFromStorage: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
        upload: vi.fn(),
        list: vi.fn(),
      })),
    },
  },
}));

describe('E2E Scenario Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateE2eScenariosForProcess', () => {
    it('should return scenarios and paths in result object', async () => {
      // Mock BPMN parsing
      const { parseBpmnFile } = await import('@/lib/bpmnParser');
      const { buildFlowGraph, findStartEvents, findPathsThroughProcess } = await import('@/lib/bpmnFlowExtractor');
      
      vi.mocked(parseBpmnFile).mockResolvedValue({
        elements: [],
        subprocesses: [],
        sequenceFlows: [],
        meta: { name: 'test-process' },
      } as any);
      
      vi.mocked(buildFlowGraph).mockReturnValue({
        nodes: new Map(),
        edges: new Map(),
      } as any);
      
      vi.mocked(findStartEvents).mockReturnValue([]);
      vi.mocked(findPathsThroughProcess).mockReturnValue([]);
      
      const result = await generateE2eScenariosForProcess(
        'test.bpmn',
        'Test Process',
        'Test',
        'cloud',
        true,
        undefined,
        undefined
      );
      
      // Verify return type is E2eScenarioGenerationResult
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('paths');
      expect(Array.isArray(result.scenarios)).toBe(true);
      expect(Array.isArray(result.paths)).toBe(true);
    });

    it('should generate E2E scenarios for prioritized paths only', async () => {
      // TODO: Implement test when E2E scenario generation is fully integrated
      // This test should verify that:
      // 1. Paths are identified from BPMN process graph
      // 2. Only prioritized scenarios are generated (en sökare, medsökande, manuella steg)
      // 3. Feature Goal documentation is loaded correctly
      // 4. E2E scenarios are generated with Claude
      // 5. Scenarios are saved to storage
      
      expect(true).toBe(true); // Placeholder
    });

    it('should filter out error paths', async () => {
      // TODO: Implement test
      // This test should verify that error paths are filtered out
      
      expect(true).toBe(true); // Placeholder
    });

    it('should identify three prioritized scenarios correctly', async () => {
      // TODO: Implement test
      // This test should verify that:
      // 1. Scenario 1: En sökande, happy path, inga manuella steg
      // 2. Scenario 2: Medsökande, happy path, inga manuella steg
      // 3. Scenario 3: En sökande, med manuella steg
      
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('generateE2eScenarioWithLlm', () => {
    it('should generate E2E scenario with Claude (mocked)', async () => {
      // Mock Claude response
      const mockLlmResponse = JSON.stringify({
        id: 'e2e-happy-path-1',
        name: 'En sökande - Bostadsrätt godkänd automatiskt (Happy Path)',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Köp bostadsrätt',
        summary: 'Komplett E2E-scenario för en person som köper sin första bostadsrätt.',
        given: 'En person köper sin första bostadsrätt.',
        when: 'Kunden fyller i Application.',
        then: 'Hela processen slutförs utan fel.',
        notesForBankProject: 'Testinfo för bankprojektet.',
        bankProjectTestSteps: [
          {
            bpmnNodeId: 'application',
            bpmnNodeType: 'CallActivity',
            bpmnNodeName: 'Application',
            action: 'Kunden fyller i komplett ansökan',
            assertion: 'Ansökan är komplett och redo för kreditevaluering.',
          },
        ],
        subprocessSteps: [
          {
            order: 1,
            bpmnFile: 'mortgage-se-application.bpmn',
            callActivityId: 'application',
            description: 'Application – Komplett ansökan med en person',
            given: 'En person ansöker om bolån för köp av bostadsrätt.',
            when: 'När kunden går in i ansökningsflödet.',
            then: 'Alla relevanta service- och user tasks har körts.',
          },
        ],
      });

      vi.mocked(generateChatCompletion).mockResolvedValue(mockLlmResponse);

      const context: E2eScenarioContext = {
        path: {
          type: 'possible-path',
          startEvent: 'start',
          endEvent: 'end',
          featureGoals: ['application'],
          gatewayConditions: [],
          nodeIds: ['start', 'application', 'end'],
        },
        featureGoals: [
          {
            callActivityId: 'application',
            bpmnFile: 'mortgage-se-application.bpmn',
            summary: 'Application – Komplett ansökan',
            flowSteps: ['Kunden fyller i ansökan'],
            userStories: [],
            prerequisites: [],
            dependencies: [],
          },
        ],
        processInfo: {
          bpmnFile: 'mortgage.bpmn',
          processName: 'Mortgage',
          initiative: 'Mortgage',
        },
      };

      const result = await generateE2eScenarioWithLlm(context, 'cloud', true);
      
      expect(result).toBeDefined();
      expect(result?.scenario).toBeDefined();
      expect(result?.scenario?.name).toBe('En sökande - Bostadsrätt godkänd automatiskt (Happy Path)');
      expect(generateChatCompletion).toHaveBeenCalled();
    });

    it('should handle LLM errors gracefully', async () => {
      // Mock LLM error
      vi.mocked(generateChatCompletion).mockRejectedValue(new Error('LLM error'));

      const context: E2eScenarioContext = {
        path: {
          type: 'possible-path',
          startEvent: 'start',
          endEvent: 'end',
          featureGoals: ['application'],
          gatewayConditions: [],
          nodeIds: ['start', 'application', 'end'],
        },
        featureGoals: [],
        processInfo: {
          bpmnFile: 'mortgage.bpmn',
          processName: 'Mortgage',
          initiative: 'Mortgage',
        },
      };

      const result = await generateE2eScenarioWithLlm(context, 'cloud', true);
      
      // Should return null on error, not throw
      expect(result).toBeNull();
    });
  });
});

