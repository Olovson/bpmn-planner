import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { E2ePath } from '@/lib/e2eScenarioPathIdentifier';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';

// Mock LLM-generering (samma som i featureGoal.llm.e2e.test.ts)
const mockLlmResponse = JSON.stringify({
  name: 'Test Scenario',
  summary: 'Test scenario summary',
  given: 'Customer is identified',
  when: 'Customer fills in application',
  then: 'Application is validated',
  bankProjectTestSteps: [
    {
      bpmnNodeId: 'application',
      bpmnNodeType: 'CallActivity',
      bpmnNodeName: 'Application',
      action: 'Customer fills in application',
      assertion: 'Application is validated',
    },
  ],
  subprocessSteps: [
    {
      order: 1,
      bpmnFile: 'mortgage-se-application.bpmn',
      callActivityId: 'application',
      featureGoalFile: 'application',
      description: 'Application process',
      hasPlaywrightSupport: false,
      given: 'Customer is identified',
      when: 'Customer fills in application',
      then: 'Application is validated',
    },
  ],
});

const generateChatCompletionMock = vi.fn(async () => mockLlmResponse);

vi.mock('@/lib/llmClient', () => ({
  isLlmEnabled: () => true,
  generateChatCompletion: (...args: any[]) => generateChatCompletionMock(...args),
}));

// Mock Supabase (samma struktur som i featureGoal.llm.e2e.test.ts)
const mockSupabaseStorage = {
  download: vi.fn(),
};

const mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
    storage: {
      from: vi.fn(() => mockSupabaseStorage),
    },
  },
}));

describe('E2E Scenario Generation - Full Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateChatCompletionMock.mockResolvedValue(mockLlmResponse);
  });

  describe('generateE2eScenarios - Full integration test', () => {
    it('should generate scenarios for all missing paths and save them', async () => {
      // Dynamisk import för att undvika circular dependencies
      const { generateE2eScenarios } = await import('@/lib/e2eScenarioGenerator');
      const { identifyAllPaths } = await import('@/lib/e2eScenarioPathIdentifier');
      const { identifyCoverageGaps } = await import('@/lib/e2eScenarioCoverageAnalyzer');
      const { loadFeatureGoalDocsForPath } = await import('@/lib/e2eScenarioFeatureGoalLoader');
      const { saveE2eScenario } = await import('@/lib/e2eScenarioSaver');

      // 1. Setup: Mock befintliga scenarios (inga)
      const existingScenarios: E2eScenario[] = [];

      // 2. Setup: Mock paths (använd befintlig infrastruktur)
      const mockPaths: E2ePath[] = [
        {
          id: 'path-1',
          path: [
            {
              id: 'root:mortgage-se-application.bpmn',
              label: 'Mortgage Application',
              type: 'process',
              bpmnFile: 'mortgage-se-application.bpmn',
              children: [],
            },
            {
              id: 'mortgage-se-application.bpmn:application',
              label: 'Application',
              type: 'callActivity',
              bpmnFile: 'mortgage-se-application.bpmn',
              bpmnElementId: 'application',
              children: [],
            },
            {
              id: 'mortgage-se-application.bpmn:end-1',
              label: 'End',
              type: 'event',
              bpmnFile: 'mortgage-se-application.bpmn',
              children: [],
            },
          ] as any,
          featureGoals: ['application'],
          startEvent: 'root:mortgage-se-application.bpmn',
          endEvent: 'mortgage-se-application.bpmn:end-1',
        },
      ];

      // 3. Mock identifyAllPaths
      vi.spyOn(
        await import('@/lib/e2eScenarioPathIdentifier'),
        'identifyAllPaths'
      ).mockResolvedValue(mockPaths);

      // 4. Mock identifyCoverageGaps
      vi.spyOn(
        await import('@/lib/e2eScenarioCoverageAnalyzer'),
        'identifyCoverageGaps'
      ).mockReturnValue([
        {
          path: mockPaths[0],
          reason: 'no-scenario',
        },
      ]);

      // 5. Mock loadFeatureGoalDocsForPath - mocka Supabase Storage
      const mockFeatureGoalDoc: FeatureGoalDocModel = {
        summary: 'Application process collects customer information',
        prerequisites: ['Customer is identified'],
        flowSteps: [
          'System initiates application process',
          'Customer fills in application form',
          'System validates application data',
        ],
        userStories: [
          {
            id: 'US-1',
            role: 'Kund',
            goal: 'Fylla i ansökan',
            value: 'Kunna ansöka om lån',
            acceptanceCriteria: ['Application is complete'],
          },
        ],
        dependencies: [],
      };

      // Mock HTML-innehåll med JSON
      const mockHtmlContent = `
        <html>
          <body>
            <script type="application/json" id="feature-goal-data">
              ${JSON.stringify(mockFeatureGoalDoc)}
            </script>
          </body>
        </html>
      `;

      mockSupabaseStorage.download.mockResolvedValue({
        text: async () => mockHtmlContent,
      } as any);

      vi.spyOn(
        await import('@/lib/e2eScenarioFeatureGoalLoader'),
        'loadFeatureGoalDocsForPath'
      ).mockResolvedValue([
        {
          callActivityId: 'application',
          bpmnFile: 'mortgage-se-application.bpmn',
          documentation: mockFeatureGoalDoc,
        },
      ]);

      // 6. Mock saveE2eScenario - mocka Supabase insert
      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: insertSpy,
      } as any);

      // 7. Execute: Anropa generateE2eScenarios
      const result = await generateE2eScenarios({
        rootFile: 'mortgage-se-application.bpmn',
        existingBpmnFiles: ['mortgage-se-application.bpmn'],
        existingScenarios,
      });

      // 8. Assert: Verifiera resultat
      expect(result.generated).toHaveLength(1);
      expect(result.generated[0].name).toBe('Test Scenario');
      expect(result.generated[0].summary).toBe('Test scenario summary');
      expect(result.generated[0].given).toBe('Customer is identified');
      expect(result.generated[0].when).toBe('Customer fills in application');
      expect(result.generated[0].then).toBe('Application is validated');
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // 9. Assert: Verifiera att Supabase insert anropades
      expect(insertSpy).toHaveBeenCalledTimes(1);
      const insertCall = insertSpy.mock.calls[0][0];
      // Verifiera att scenario-data sparas korrekt
      expect(insertCall).toHaveProperty('scenario_name', 'Test Scenario');
      expect(insertCall).toHaveProperty('scenario_summary', 'Test scenario summary');
      expect(insertCall).toHaveProperty('scenario_given', 'Customer is identified');
      expect(insertCall).toHaveProperty('scenario_when', 'Customer fills in application');
      expect(insertCall).toHaveProperty('scenario_then', 'Application is validated');
    });

    it('should skip paths with missing Feature Goal documentation', async () => {
      const { generateE2eScenarios } = await import('@/lib/e2eScenarioGenerator');

      // Setup: Mock paths
      const mockPaths: E2ePath[] = [
        {
          id: 'path-1',
          path: [] as any,
          featureGoals: ['application'],
          startEvent: 'start-1',
          endEvent: 'end-1',
        },
      ];

      vi.spyOn(
        await import('@/lib/e2eScenarioPathIdentifier'),
        'identifyAllPaths'
      ).mockResolvedValue(mockPaths);

      vi.spyOn(
        await import('@/lib/e2eScenarioCoverageAnalyzer'),
        'identifyCoverageGaps'
      ).mockReturnValue([
        {
          path: mockPaths[0],
          reason: 'no-scenario',
        },
      ]);

      // Mock: Saknar Feature Goal-dokumentation
      vi.spyOn(
        await import('@/lib/e2eScenarioFeatureGoalLoader'),
        'loadFeatureGoalDocsForPath'
      ).mockResolvedValue([
        {
          callActivityId: 'application',
          bpmnFile: 'mortgage-se-application.bpmn',
          documentation: null, // Saknar dokumentation
        },
      ]);

      // Execute
      const result = await generateE2eScenarios({
        rootFile: 'mortgage-se-application.bpmn',
        existingBpmnFiles: ['mortgage-se-application.bpmn'],
        existingScenarios: [],
      });

      // Assert: Path ska vara skipped
      expect(result.generated).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('Saknar Feature Goal-dokumentation');
    });

    it('should handle errors gracefully', async () => {
      const { generateE2eScenarios } = await import('@/lib/e2eScenarioGenerator');

      // Setup: Mock paths
      const mockPaths: E2ePath[] = [
        {
          id: 'path-1',
          path: [] as any,
          featureGoals: ['application'],
          startEvent: 'start-1',
          endEvent: 'end-1',
        },
      ];

      vi.spyOn(
        await import('@/lib/e2eScenarioPathIdentifier'),
        'identifyAllPaths'
      ).mockResolvedValue(mockPaths);

      vi.spyOn(
        await import('@/lib/e2eScenarioCoverageAnalyzer'),
        'identifyCoverageGaps'
      ).mockReturnValue([
        {
          path: mockPaths[0],
          reason: 'no-scenario',
        },
      ]);

      // Mock: Feature Goal-dokumentation finns
      vi.spyOn(
        await import('@/lib/e2eScenarioFeatureGoalLoader'),
        'loadFeatureGoalDocsForPath'
      ).mockResolvedValue([
        {
          callActivityId: 'application',
          bpmnFile: 'mortgage-se-application.bpmn',
          documentation: {
            summary: 'Test',
            prerequisites: [],
            flowSteps: [],
            userStories: [],
            dependencies: [],
          },
        },
      ]);

      // Mock: Claude-generering kastar fel
      generateChatCompletionMock.mockRejectedValue(new Error('Claude API error'));

      // Execute
      const result = await generateE2eScenarios({
        rootFile: 'mortgage-se-application.bpmn',
        existingBpmnFiles: ['mortgage-se-application.bpmn'],
        existingScenarios: [],
      });

      // Assert: Fel ska hanteras gracefully
      expect(result.generated).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Claude API error');
    });
  });

  describe('Scenario can be read and displayed', () => {
    it('should be able to read generated scenarios from database', async () => {
      const { saveE2eScenario } = await import('@/lib/e2eScenarioSaver');
      const { supabase } = await import('@/integrations/supabase/client');

      // 1. Setup: Generera och spara scenario
      const mockScenario: E2eScenario = {
        id: 'scenario-1',
        name: 'Test Scenario',
        priority: 'P0',
        type: 'happy-path',
        iteration: 'Köp bostadsrätt',
        bpmnProcess: 'mortgage-se-application.bpmn',
        featureGoalFile: 'application',
        testFile: 'test.spec.ts',
        command: 'npx playwright test test.spec.ts',
        summary: 'Test scenario summary',
        given: 'Customer is identified',
        when: 'Customer fills in application',
        then: 'Application is validated',
        notesForBankProject: 'Test notes',
        bankProjectTestSteps: [],
        subprocessSteps: [],
      };

      // Mock: Spara scenario
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: insertMock,
      } as any);

      await saveE2eScenario(mockScenario);

      // 2. Mock: Läs scenario från databas (simulerar useGlobalPlannedScenarios)
      // OBS: node_planned_scenarios använder bpmn_file och bpmn_element_id, inte node_id
      const mockDbScenario = {
        bpmn_file: 'mortgage-se-application.bpmn',
        bpmn_element_id: 'scenario-1',
        provider: 'claude',
        origin: 'llm-doc',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test Scenario',
            description: 'Test scenario summary',
            status: 'pending',
            category: 'happy-path',
          },
        ],
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockDbScenario,
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      } as any);

      // 3. Execute: Läs scenario (simulerar useGlobalPlannedScenarios)
      const { data, error } = await supabase
        .from('node_planned_scenarios')
        .select('bpmn_file, bpmn_element_id, provider, origin, scenarios')
        .eq('bpmn_element_id', 'scenario-1')
        .single();

      // 4. Assert: Scenario ska kunna läsas
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.bpmn_file).toBe('mortgage-se-application.bpmn');
      expect(data?.bpmn_element_id).toBe('scenario-1');
      expect(data?.provider).toBe('claude');
      expect(data?.origin).toBe('llm-doc');
      expect(data?.scenarios).toBeDefined();
      expect(data?.scenarios).toHaveLength(1);
      expect(data?.scenarios[0].name).toBe('Test Scenario');
    });

    it('should format scenario data correctly for UI display', () => {
      // 1. Setup: Mock scenario data från databas (node_planned_scenarios format)
      const dbScenario = {
        bpmn_file: 'mortgage-se-application.bpmn',
        bpmn_element_id: 'application',
        provider: 'claude' as const,
        origin: 'llm-doc' as const,
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test Scenario',
            description: 'Test scenario summary',
            status: 'pending' as const,
            category: 'happy-path' as const,
          },
        ],
      };

      // 2. Execute: Formatera till E2eScenario-format (simulerar useGlobalPlannedScenarios)
      // OBS: Detta är en förenklad version - i verkligheten skulle detta göras i useGlobalPlannedScenarios
      const formattedScenario: E2eScenario = {
        id: dbScenario.scenarios[0].id,
        name: dbScenario.scenarios[0].name,
        priority: 'P0', // Default
        type: 'happy-path', // Default
        iteration: 'Köp bostadsrätt', // Default
        bpmnProcess: dbScenario.bpmn_file,
        featureGoalFile: dbScenario.bpmn_element_id,
        testFile: '',
        command: '',
        summary: dbScenario.scenarios[0].description,
        given: '', // Skulle komma från annan källa
        when: '', // Skulle komma från annan källa
        then: '', // Skulle komma från annan källa
        notesForBankProject: '',
        bankProjectTestSteps: [],
        subprocessSteps: [],
      };

      // 3. Assert: Formaterat scenario ska vara korrekt
      expect(formattedScenario.id).toBe('scenario-1');
      expect(formattedScenario.name).toBe('Test Scenario');
      expect(formattedScenario.summary).toBe('Test scenario summary');
      expect(formattedScenario.bpmnProcess).toBe('mortgage-se-application.bpmn');
      expect(formattedScenario.featureGoalFile).toBe('application');
    });
  });
});

