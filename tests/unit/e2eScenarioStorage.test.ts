/**
 * Unit tests for E2E scenario storage
 * 
 * Tests the storage functionality for E2E scenarios including:
 * - Saving scenarios to Supabase Storage
 * - Loading scenarios from Supabase Storage
 * - Loading all scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveE2eScenariosToStorage, loadE2eScenariosFromStorage, loadAllE2eScenarios } from '@/lib/e2eScenarioStorage';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockList = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        download: mockDownload,
        list: mockList,
      })),
    },
  },
}));

describe('E2E Scenario Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveE2eScenariosToStorage', () => {
    it('should save E2E scenarios to storage as JSON', async () => {
      const mockScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test Scenario 1',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-application.bpmn',
          testFile: 'tests/e2e/e2e-1.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-1.spec.ts',
          summary: 'Test scenario summary',
          given: 'Test given',
          when: 'Test when',
          then: 'Test then',
          notesForBankProject: 'Test notes',
          pathMetadata: {
            startEvent: 'start',
            endEvent: 'end',
            featureGoals: ['application'],
            gatewayConditions: [],
            nodeIds: ['start', 'application', 'end'],
          },
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      mockUpload.mockResolvedValue({ error: null });

      await saveE2eScenariosToStorage('mortgage.bpmn', mockScenarios);

      // Verify upload was called
      expect(mockUpload).toHaveBeenCalledTimes(1);
      
      // Verify correct storage path
      const uploadCall = mockUpload.mock.calls[0];
      expect(uploadCall[0]).toBe('e2e-scenarios/mortgage-scenarios.json');
      
      // Verify content type
      expect(uploadCall[2]?.contentType).toBe('application/json');
      expect(uploadCall[2]?.upsert).toBe(true);
      
      // Verify blob contains JSON
      const blob = uploadCall[1] as Blob;
      expect(blob.type).toBe('application/json');
      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed).toEqual(mockScenarios);
    });

    it('should handle storage errors gracefully', async () => {
      const mockScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test Scenario 1',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-application.bpmn',
          testFile: 'tests/e2e/e2e-1.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-1.spec.ts',
          summary: 'Test scenario summary',
          given: 'Test given',
          when: 'Test when',
          then: 'Test then',
          notesForBankProject: 'Test notes',
          pathMetadata: {
            startEvent: 'start',
            endEvent: 'end',
            featureGoals: ['application'],
            gatewayConditions: [],
            nodeIds: ['start', 'application', 'end'],
          },
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      const storageError = { message: 'Storage error', statusCode: 500 };
      mockUpload.mockResolvedValue({ error: storageError });

      await expect(saveE2eScenariosToStorage('mortgage.bpmn', mockScenarios)).rejects.toEqual(storageError);
    });
  });

  describe('loadE2eScenariosFromStorage', () => {
    it('should load E2E scenarios from storage', async () => {
      const mockScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test Scenario 1',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-application.bpmn',
          testFile: 'tests/e2e/e2e-1.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-1.spec.ts',
          summary: 'Test scenario summary',
          given: 'Test given',
          when: 'Test when',
          then: 'Test then',
          notesForBankProject: 'Test notes',
          pathMetadata: {
            startEvent: 'start',
            endEvent: 'end',
            featureGoals: ['application'],
            gatewayConditions: [],
            nodeIds: ['start', 'application', 'end'],
          },
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      const mockBlob = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockScenarios)),
      };

      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      const result = await loadE2eScenariosFromStorage('mortgage.bpmn');

      // Verify download was called with correct path
      expect(mockDownload).toHaveBeenCalledWith('e2e-scenarios/mortgage-scenarios.json');
      
      // Verify scenarios are parsed correctly
      expect(result).toEqual(mockScenarios);
    });

    it('should return empty array if file does not exist', async () => {
      mockDownload.mockResolvedValue({ data: null, error: { message: 'File not found' } });

      const result = await loadE2eScenariosFromStorage('nonexistent.bpmn');

      expect(result).toEqual([]);
    });

    it('should return empty array on parse error', async () => {
      const mockBlob = {
        text: vi.fn().mockResolvedValue('invalid json'),
      };

      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      const result = await loadE2eScenariosFromStorage('mortgage.bpmn');

      expect(result).toEqual([]);
    });
  });

  describe('loadAllE2eScenarios', () => {
    it('should load all E2E scenarios from storage', async () => {
      const mockScenarios1: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test Scenario 1',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-application.bpmn',
          testFile: 'tests/e2e/e2e-1.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-1.spec.ts',
          summary: 'Test scenario summary 1',
          given: 'Test given 1',
          when: 'Test when 1',
          then: 'Test then 1',
          notesForBankProject: 'Test notes 1',
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      const mockScenarios2: E2eScenario[] = [
        {
          id: 'e2e-2',
          name: 'Test Scenario 2',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-credit-evaluation.bpmn',
          testFile: 'tests/e2e/e2e-2.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-2.spec.ts',
          summary: 'Test scenario summary 2',
          given: 'Test given 2',
          when: 'Test when 2',
          then: 'Test then 2',
          notesForBankProject: 'Test notes 2',
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      // Mock list to return two files
      mockList.mockResolvedValue({
        data: [
          { name: 'mortgage-scenarios.json' },
          { name: 'other-scenarios.json' },
        ],
        error: null,
      });

      // Mock download for each file
      const mockBlob1 = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockScenarios1)),
      };
      const mockBlob2 = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockScenarios2)),
      };

      mockDownload
        .mockResolvedValueOnce({ data: mockBlob1, error: null })
        .mockResolvedValueOnce({ data: mockBlob2, error: null });

      const result = await loadAllE2eScenarios();

      // Verify list was called
      expect(mockList).toHaveBeenCalledWith('e2e-scenarios', { search: '.json' });
      
      // Verify download was called for each file
      expect(mockDownload).toHaveBeenCalledWith('e2e-scenarios/mortgage-scenarios.json');
      expect(mockDownload).toHaveBeenCalledWith('e2e-scenarios/other-scenarios.json');
      
      // Verify all scenarios are combined
      expect(result).toEqual([...mockScenarios1, ...mockScenarios2]);
    });

    it('should return empty array if no files exist', async () => {
      mockList.mockResolvedValue({ data: [], error: null });

      const result = await loadAllE2eScenarios();

      expect(result).toEqual([]);
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it('should return empty array on list error', async () => {
      mockList.mockResolvedValue({ data: null, error: { message: 'List error' } });

      const result = await loadAllE2eScenarios();

      expect(result).toEqual([]);
    });

    it('should skip files that fail to parse', async () => {
      const mockScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Test Scenario 1',
          priority: 'P1',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage.bpmn',
          featureGoalFile: 'mortgage-se-application.bpmn',
          testFile: 'tests/e2e/e2e-1.spec.ts',
          command: 'npx playwright test tests/e2e/e2e-1.spec.ts',
          summary: 'Test scenario summary',
          given: 'Test given',
          when: 'Test when',
          then: 'Test then',
          notesForBankProject: 'Test notes',
          pathMetadata: {
            startEvent: 'start',
            endEvent: 'end',
            featureGoals: ['application'],
            gatewayConditions: [],
            nodeIds: ['start', 'application', 'end'],
          },
          bankProjectTestSteps: [],
          subprocessSteps: [],
        },
      ];

      mockList.mockResolvedValue({
        data: [
          { name: 'mortgage-scenarios.json' },
          { name: 'invalid-scenarios.json' },
        ],
        error: null,
      });

      const mockBlob1 = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockScenarios)),
      };
      const mockBlob2 = {
        text: vi.fn().mockResolvedValue('invalid json'),
      };

      mockDownload
        .mockResolvedValueOnce({ data: mockBlob1, error: null })
        .mockResolvedValueOnce({ data: mockBlob2, error: null });

      const result = await loadAllE2eScenarios();

      // Should only include valid scenarios
      expect(result).toEqual(mockScenarios);
    });
  });
});

