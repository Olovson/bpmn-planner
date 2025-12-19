/**
 * Integration test for bpmnMapStorage.ts
 * 
 * Tests that bpmn-map.json is automatically created when missing from storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadBpmnMapFromStorage,
  saveBpmnMapToStorage,
  bpmnMapExistsInStorage,
} from '../../src/lib/bpmn/bpmnMapStorage';

// Mock Supabase client
const mockDownload = vi.fn();
const mockUpload = vi.fn();
const mockList = vi.fn();

vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: mockDownload,
        upload: mockUpload,
        list: mockList,
      })),
    },
  },
}));

// Mock the raw bpmn-map.json import
vi.mock('../../../bpmn-map.json', () => ({
  default: {
    processes: [
      {
        bpmn_file: 'test.bpmn',
        call_activities: [],
      },
    ],
  },
}), { virtual: true });

describe('bpmnMapStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadBpmnMapFromStorage', () => {
    it('should automatically create bpmn-map.json when missing from storage', async () => {
      // Mock: First download attempt fails (file missing)
      const mockDownloadError = {
        statusCode: 400,
        message: '{}',
        name: 'StorageUnknownError',
      };

      // First attempt: file missing
      // Second check (in mutex): still missing
      // Upload: succeeds
      mockDownload
        .mockResolvedValueOnce({ data: null, error: mockDownloadError })
        .mockResolvedValueOnce({ data: null, error: null });
      mockUpload.mockResolvedValue({ error: null });

      const result = await loadBpmnMapFromStorage();

      expect(result.valid).toBe(true);
      expect(result.source).toBe('created');
      expect(result.map).not.toBeNull();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should return valid map from storage when it exists', async () => {
      const mockMapContent = {
        processes: [
          {
            bpmn_file: 'test.bpmn',
            call_activities: [],
          },
        ],
      };

      const mockBlob = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockMapContent)),
      };

      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      const result = await loadBpmnMapFromStorage();

      expect(result.valid).toBe(true);
      expect(result.source).toBe('storage');
      expect(result.map).not.toBeNull();
    });

    it('should handle corrupt bpmn-map.json in storage gracefully', async () => {
      const mockBlob = {
        text: vi.fn().mockResolvedValue('invalid json'),
      };

      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      const result = await loadBpmnMapFromStorage();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.source).toBe('storage');
    });

    it('should not overwrite corrupt file in storage', async () => {
      const mockBlob = {
        text: vi.fn().mockResolvedValue('invalid json'),
      };

      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await loadBpmnMapFromStorage();

      // Should not attempt to upload (overwrite corrupt file)
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe('bpmnMapExistsInStorage', () => {
    it('should return true when file exists', async () => {
      mockList.mockResolvedValue({ data: [{ name: 'bpmn-map.json' }], error: null });

      const exists = await bpmnMapExistsInStorage();

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockList.mockResolvedValue({ data: [], error: null });

      const exists = await bpmnMapExistsInStorage();

      expect(exists).toBe(false);
    });
  });
});

