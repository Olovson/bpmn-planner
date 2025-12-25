/**
 * Unit tests for Feature Goal test generation from E2E scenarios
 * 
 * Tests the Feature Goal test generation functionality including:
 * - Loading Feature Goal documentation
 * - Extracting Feature Goal tests from E2E scenarios
 * - Saving Feature Goal tests to database
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFeatureGoalTestsFromE2e } from '@/lib/featureGoalTestGenerator';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { ProcessPath } from '@/lib/bpmnFlowExtractor';

// Mock dependencies
vi.mock('@/lib/e2eToFeatureGoalTestExtractor', () => ({
  extractFeatureGoalTestsWithGatewayContext: vi.fn(),
}));

vi.mock('@/lib/plannedScenariosHelper', () => ({
  savePlannedScenarios: vi.fn(),
}));

vi.mock('@/lib/bpmnParser', () => ({
  parseBpmnFile: vi.fn(),
}));

vi.mock('@/lib/artifactUrls', () => ({
  getFeatureGoalDocStoragePaths: vi.fn(() => ['feature-goals/test.bpmn/test-id.html']),
}));

vi.mock('@/lib/bpmnGenerators/docRendering', () => ({
  loadChildDocFromStorage: vi.fn(),
  extractDocInfoFromJson: vi.fn(),
}));

vi.mock('@/lib/nodeArtifactPaths', () => ({
  getFeatureGoalDocFileKey: vi.fn(() => 'feature-goals/test.bpmn/test-id.html'),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
      })),
    },
  },
}));

describe('Feature Goal Test Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateFeatureGoalTestsFromE2e', () => {
    it('should generate Feature Goal tests from E2E scenarios', async () => {
      const { extractFeatureGoalTestsWithGatewayContext } = await import('@/lib/e2eToFeatureGoalTestExtractor');
      const { savePlannedScenarios } = await import('@/lib/plannedScenariosHelper');
      
      const mockE2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test E2E Scenario',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Test',
          bpmnProcess: 'test.bpmn',
          featureGoalFile: 'test.bpmn',
          testFile: 'test.spec.ts',
          command: 'test',
          summary: 'Test summary',
          given: 'Test given',
          when: 'Test when',
          then: 'Test then',
          notesForBankProject: 'Test notes',
          pathMetadata: {
            startEvent: 'start',
            endEvent: 'end',
            featureGoals: ['test-id'],
            gatewayConditions: [],
            nodeIds: ['start', 'test-id', 'end'],
          },
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'test.bpmn',
              callActivityId: 'test-id',
              description: 'Test Feature Goal',
              hasPlaywrightSupport: true,
              given: 'Test given',
              when: 'Test when',
              then: 'Test then',
            },
          ],
        },
      ];
      
      const mockPaths: ProcessPath[] = [
        {
          startEvent: 'start',
          endEvent: 'end',
          featureGoals: ['test-id'],
          gatewayConditions: [],
        },
      ];
      
      const mockExtractions = new Map([
        [
          'test.bpmn::test-id',
          {
            callActivityId: 'test-id',
            bpmnFile: 'test.bpmn',
            testScenarios: [
              {
                id: 'test-scenario-1',
                name: 'Test Scenario',
                description: 'Test description',
                status: 'pending',
                category: 'happy-path',
                riskLevel: 'P1',
                assertionType: 'functional',
                source: 'e2e-to-feature-goal',
              },
            ],
            sourceE2eScenarios: ['e2e-1'],
            gatewayContexts: new Map(),
          },
        ],
      ]);
      
      vi.mocked(extractFeatureGoalTestsWithGatewayContext).mockResolvedValue(mockExtractions);
      vi.mocked(savePlannedScenarios).mockResolvedValue({
        success: true,
        saved: 1,
        skipped: 0,
      });
      
      // Mock parseBpmnFile to return empty result (no Call Activities found)
      const { parseBpmnFile } = await import('@/lib/bpmnParser');
      vi.mocked(parseBpmnFile).mockResolvedValue({
        elements: [],
        subprocesses: [],
        sequenceFlows: [],
        meta: { name: 'test-process' },
      } as any);
      
      const result = await generateFeatureGoalTestsFromE2e({
        e2eScenarios: mockE2eScenarios,
        paths: mockPaths,
        bpmnFiles: ['test.bpmn'],
      });
      
      expect(result.generated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(extractFeatureGoalTestsWithGatewayContext).toHaveBeenCalledWith(
        mockE2eScenarios,
        mockPaths,
        expect.any(Map) // featureGoalDocs
      );
      expect(savePlannedScenarios).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { extractFeatureGoalTestsWithGatewayContext } = await import('@/lib/e2eToFeatureGoalTestExtractor');
      const { savePlannedScenarios } = await import('@/lib/plannedScenariosHelper');
      
      const mockE2eScenarios: E2eScenario[] = [];
      const mockPaths: ProcessPath[] = [];
      
      const mockExtractions = new Map([
        [
          'test.bpmn::test-id',
          {
            callActivityId: 'test-id',
            bpmnFile: 'test.bpmn',
            testScenarios: [
              {
                id: 'test-scenario-1',
                name: 'Test Scenario',
                description: 'Test description',
                status: 'pending',
                category: 'happy-path',
                riskLevel: 'P1',
                assertionType: 'functional',
                source: 'e2e-to-feature-goal',
              },
            ],
            sourceE2eScenarios: [],
            gatewayContexts: new Map(),
          },
        ],
      ]);
      
      vi.mocked(extractFeatureGoalTestsWithGatewayContext).mockResolvedValue(mockExtractions);
      vi.mocked(savePlannedScenarios).mockResolvedValue({
        success: false,
        saved: 0,
        skipped: 1,
        error: new Error('Database error'),
      });
      
      // Mock parseBpmnFile
      const { parseBpmnFile } = await import('@/lib/bpmnParser');
      vi.mocked(parseBpmnFile).mockResolvedValue({
        elements: [],
        subprocesses: [],
        sequenceFlows: [],
        meta: { name: 'test-process' },
      } as any);
      
      const result = await generateFeatureGoalTestsFromE2e({
        e2eScenarios: mockE2eScenarios,
        paths: mockPaths,
        bpmnFiles: ['test.bpmn'],
      });
      
      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].callActivityId).toBe('test-id');
    });

    it('should load Feature Goal documentation from storage', async () => {
      const { parseBpmnFile } = await import('@/lib/bpmnParser');
      const { getFeatureGoalDocStoragePaths } = await import('@/lib/artifactUrls');
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock getFeatureGoalDocStoragePaths to return paths
      vi.mocked(getFeatureGoalDocStoragePaths).mockReturnValue([
        'feature-goals/test.bpmn/test-id.html',
      ]);
      
      // Mock BPMN file with Call Activity
      vi.mocked(parseBpmnFile).mockResolvedValue({
        elements: [
          {
            id: 'test-id',
            type: 'bpmn:CallActivity',
            name: 'Test Feature Goal',
            bpmnFile: 'test.bpmn',
          },
        ],
        subprocesses: [],
        sequenceFlows: [],
        meta: { name: 'test-process' },
      } as any);
      
      // Mock storage download
      const mockBlob = {
        text: vi.fn().mockResolvedValue(`
          <html>
            <script type="application/json">
              {
                "summary": "Test summary",
                "flowSteps": ["Step 1", "Step 2"],
                "prerequisites": ["Prereq 1"],
                "dependencies": ["Dep 1"],
                "userStories": []
              }
            </script>
          </html>
        `),
      };
      
      const mockStorageFrom = vi.fn(() => ({
        download: vi.fn().mockResolvedValue({ data: mockBlob, error: null }),
      }));
      
      vi.mocked(supabase.storage.from).mockImplementation(mockStorageFrom);
      
      // Call generateFeatureGoalTestsFromE2e which will trigger loadFeatureGoalDocs
      const { extractFeatureGoalTestsWithGatewayContext } = await import('@/lib/e2eToFeatureGoalTestExtractor');
      const { savePlannedScenarios } = await import('@/lib/plannedScenariosHelper');
      
      vi.mocked(extractFeatureGoalTestsWithGatewayContext).mockResolvedValue(new Map());
      vi.mocked(savePlannedScenarios).mockResolvedValue({
        success: true,
        saved: 0,
        skipped: 0,
      });
      
      const result = await generateFeatureGoalTestsFromE2e({
        e2eScenarios: [],
        paths: [],
        bpmnFiles: ['test.bpmn'],
      });
      
      // Verify that parseBpmnFile was called
      expect(parseBpmnFile).toHaveBeenCalledWith('test.bpmn');
      
      // Verify that getFeatureGoalDocStoragePaths was called
      expect(getFeatureGoalDocStoragePaths).toHaveBeenCalled();
      
      // Verify that storage download was attempted
      expect(mockStorageFrom).toHaveBeenCalled();
    });
  });
});

