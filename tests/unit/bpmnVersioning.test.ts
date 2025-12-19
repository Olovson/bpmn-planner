/**
 * Unit tests for bpmnVersioning.ts
 * 
 * Tests versioning functionality, especially edge cases that could cause 406 errors.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentVersion,
  getPreviousVersion,
  getVersionByHash,
  getCurrentVersionHash,
  calculateContentHash,
} from '../../src/lib/bpmnVersioning';
import { supabase } from '../../src/integrations/supabase/client';

// Mock Supabase client
vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('bpmnVersioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentVersion', () => {
    it('should return null when no version exists (no 406 error)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getCurrentVersion('nonexistent.bpmn');

      expect(result).toBeNull();
      expect(mockQuery.maybeSingle).toHaveBeenCalled(); // Should use maybeSingle, not single
    });

    it('should return version when it exists', async () => {
      const mockVersion = {
        id: 'version-1',
        file_name: 'test.bpmn',
        version_number: 1,
        is_current: true,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockVersion, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getCurrentVersion('test.bpmn');

      expect(result).toEqual(mockVersion);
      expect(mockQuery.eq).toHaveBeenCalledWith('file_name', 'test.bpmn');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_current', true);
    });
  });

  describe('getPreviousVersion', () => {
    it('should return null when current version is 1 (no previous version)', async () => {
      // Mock getCurrentVersion to return version 1
      const mockCurrentVersion = {
        id: 'version-1',
        file_name: 'test.bpmn',
        version_number: 1,
        is_current: true,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockCurrentVersion, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      // First call to getCurrentVersion (inside getPreviousVersion)
      const result = await getPreviousVersion('test.bpmn');

      expect(result).toBeNull();
      // Should not query for version 0 (version_number - 1 = 0)
      // The check for version_number <= 1 should prevent the query
    });

    it('should return previous version when it exists', async () => {
      const mockCurrentVersion = {
        id: 'version-2',
        file_name: 'test.bpmn',
        version_number: 2,
        is_current: true,
      };

      const mockPreviousVersion = {
        id: 'version-1',
        file_name: 'test.bpmn',
        version_number: 1,
        is_current: false,
      };

      // Mock query chain: first call returns current version, second returns previous
      let callCount = 0;
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getCurrentVersion
            return Promise.resolve({ data: mockCurrentVersion, error: null });
          } else {
            // Second call: getPreviousVersion
            return Promise.resolve({ data: mockPreviousVersion, error: null });
          }
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getPreviousVersion('test.bpmn');

      expect(result).toEqual(mockPreviousVersion);
      expect(mockQuery.eq).toHaveBeenCalledWith('file_name', 'test.bpmn');
      // Should query for version_number = 1 (current version_number - 1)
      expect(mockQuery.eq).toHaveBeenCalledWith('version_number', 1);
    });

    it('should return null when previous version does not exist (no 406 error)', async () => {
      const mockCurrentVersion = {
        id: 'version-2',
        file_name: 'test.bpmn',
        version_number: 2,
        is_current: true,
      };

      // Mock query chain: first call returns current version, second returns null (no previous)
      let callCount = 0;
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getCurrentVersion
            return Promise.resolve({ data: mockCurrentVersion, error: null });
          } else {
            // Second call: getPreviousVersion (no previous version exists)
            return Promise.resolve({ data: null, error: null });
          }
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getPreviousVersion('test.bpmn');

      expect(result).toBeNull();
      expect(mockQuery.maybeSingle).toHaveBeenCalled(); // Should use maybeSingle, not single
    });
  });

  describe('getVersionByHash', () => {
    it('should return null when version does not exist (no 406 error)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getVersionByHash('test.bpmn', 'nonexistent-hash');

      expect(result).toBeNull();
      expect(mockQuery.maybeSingle).toHaveBeenCalled(); // Should use maybeSingle, not single
    });
  });

  describe('getCurrentVersionHash', () => {
    it('should return null when file does not exist (no 406 error)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getCurrentVersionHash('nonexistent.bpmn');

      expect(result).toBeNull();
      expect(mockQuery.maybeSingle).toHaveBeenCalled(); // Should use maybeSingle, not single
    });
  });

  describe('calculateContentHash', () => {
    it('should calculate consistent hash for same content', async () => {
      const content = '<bpmn>test</bpmn>';
      const hash1 = await calculateContentHash(content);
      const hash2 = await calculateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex characters
    });

    it('should normalize whitespace', async () => {
      // The normalization in calculateContentHash does: trim() and replace(/\s+/g, ' ')
      // So multiple spaces/newlines/tabs become single spaces
      // '<bpmn>  test  </bpmn>' -> trim -> '<bpmn>  test</bpmn>' -> replace -> '<bpmn> test</bpmn>'
      // '<bpmn>\n\ttest\n</bpmn>' -> trim -> '<bpmn>\n\ttest</bpmn>' -> replace -> '<bpmn> test</bpmn>'
      const content1 = '<bpmn>  test  </bpmn>'; // Multiple spaces
      const content2 = '<bpmn>\n\ttest\n</bpmn>'; // Newlines and tabs
      const content3 = '<bpmn> test </bpmn>'; // Single spaces (what they normalize to)

      const hash1 = await calculateContentHash(content1);
      const hash2 = await calculateContentHash(content2);
      const hash3 = await calculateContentHash(content3);

      // All should produce the same hash after normalization (all become '<bpmn> test</bpmn>')
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should produce different hashes for different content', async () => {
      const hash1 = await calculateContentHash('<bpmn>test1</bpmn>');
      const hash2 = await calculateContentHash('<bpmn>test2</bpmn>');

      expect(hash1).not.toBe(hash2);
    });
  });
});

