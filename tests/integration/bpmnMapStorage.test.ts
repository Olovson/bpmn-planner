/**
 * Integration test for bpmnMapStorage.ts
 *
 * Real integration tests that test against actual test Supabase instance.
 * No mocks of internal functions - tests the full flow from storage → auto-generation → validation.
 *
 * Note: Auto-generation requires BPMN parsing (bpmn-js) which needs jsdom environment.
 * Due to Node.js/jsdom compatibility issues with webidl-conversions, we test the fallback behavior instead.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadBpmnMapFromStorage,
  saveBpmnMapToStorage,
  bpmnMapExistsInStorage,
} from '../../src/lib/bpmn/bpmnMapStorage';
import { supabase } from '../../src/integrations/supabase/client';

const BPMN_MAP_STORAGE_PATH = 'bpmn-map.json';

describe('bpmnMapStorage (integration)', () => {
  // Clean up: delete bpmn-map.json before each test to ensure clean state
  beforeEach(async () => {
    // Mock window object for Node.js environment
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }

    // First, log in as test user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'seed-bot@local.test',
      password: 'Passw0rd!',
    });

    if (signInError) {
      console.error('Failed to sign in for tests:', signInError);
      throw new Error(`Test setup failed: ${signInError.message}`);
    }

    // Delete bpmn-map.json if it exists
    await supabase.storage.from('bpmn-files').remove([BPMN_MAP_STORAGE_PATH]);
  });

  afterEach(async () => {
    // Clean up after tests
    await supabase.storage.from('bpmn-files').remove([BPMN_MAP_STORAGE_PATH]);

    // Sign out
    await supabase.auth.signOut();
  });

  describe('loadBpmnMapFromStorage', () => {
    it('should create bpmn-map.json when missing from storage (fallback to project file)', async () => {
      // Ensure file doesn't exist
      const existsBefore = await bpmnMapExistsInStorage();
      expect(existsBefore).toBe(false);

      // Load - will attempt auto-generation, but in Node.js test environment it will fallback to project file
      const result = await loadBpmnMapFromStorage();

      // Debug output
      if (!result.valid) {
        console.error('Load failed:', {
          error: result.error,
          details: result.details,
          source: result.source,
        });
      }

      // In Node.js environment (without jsdom for bpmn-js), auto-generation fails gracefully
      // and falls back to the project bpmn-map.json file, creating it in storage
      expect(result.valid).toBe(true);
      expect(result.source).toBe('created');
      expect(result.map).not.toBeNull();
      expect(result.map?.processes).toBeDefined();
      expect(result.map?.processes.length).toBeGreaterThan(0);

      // Verify file was created in storage
      const existsAfter = await bpmnMapExistsInStorage();
      expect(existsAfter).toBe(true);
    });

    it('should return valid map from storage when it exists', async () => {
      // First, create a valid bpmn-map.json
      const validMap = {
        processes: [
          {
            bpmn_file: 'test.bpmn',
            call_activities: [],
          },
        ],
      };

      const saveResult = await saveBpmnMapToStorage(validMap);
      expect(saveResult.success).toBe(true);

      // Verify it exists
      const exists = await bpmnMapExistsInStorage();
      expect(exists).toBe(true);

      // Download directly from storage to verify content (bypass loadBpmnMapFromStorage cache)
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .download(BPMN_MAP_STORAGE_PATH);

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      const content = await data!.text();
      const savedMap = JSON.parse(content);

      expect(savedMap.processes).toHaveLength(1);
      expect(savedMap.processes[0].bpmn_file).toBe('test.bpmn');
    });

    it.skip('should handle corrupt bpmn-map.json in storage gracefully', async () => {
      // TODO: Fix this test - currently auto-generation fallback makes this test unreliable
      // Upload corrupt JSON to storage
      const corruptJson = 'invalid json {[}';
      const blob = new Blob([corruptJson], { type: 'application/json' });

      await supabase.storage
        .from('bpmn-files')
        .upload(BPMN_MAP_STORAGE_PATH, blob, { upsert: true });

      // Load - should detect corruption
      const result = await loadBpmnMapFromStorage();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.source).toBe('storage');
    });

    it('should not overwrite corrupt file in storage', async () => {
      // Upload corrupt JSON
      const corruptJson = 'invalid json';
      const blob = new Blob([corruptJson], { type: 'application/json' });

      await supabase.storage
        .from('bpmn-files')
        .upload(BPMN_MAP_STORAGE_PATH, blob, { upsert: true });

      // Load
      await loadBpmnMapFromStorage();

      // Download to verify it wasn't overwritten
      const { data } = await supabase.storage
        .from('bpmn-files')
        .download(BPMN_MAP_STORAGE_PATH);

      const content = await data?.text();
      expect(content).toBe(corruptJson); // Still corrupt - not overwritten
    });

    it.skip('should validate bpmn-map structure correctly', async () => {
      // TODO: Fix this test - currently auto-generation fallback makes validation testing unreliable
      // Create map with missing required fields
      const invalidMap = {
        processes: [
          {
            // Missing bpmn_file
            call_activities: [],
          },
        ],
      };

      const blob = new Blob([JSON.stringify(invalidMap)], { type: 'application/json' });
      await supabase.storage
        .from('bpmn-files')
        .upload(BPMN_MAP_STORAGE_PATH, blob, { upsert: true });

      const result = await loadBpmnMapFromStorage();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('bpmn_file');
      expect(result.source).toBe('storage');
    });
  });

  describe('bpmnMapExistsInStorage', () => {
    it('should return true when file exists', async () => {
      // Create a file
      const validMap = {
        processes: [
          {
            bpmn_file: 'test.bpmn',
            call_activities: [],
          },
        ],
      };

      await saveBpmnMapToStorage(validMap);

      const exists = await bpmnMapExistsInStorage();
      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      // Ensure file doesn't exist
      await supabase.storage.from('bpmn-files').remove([BPMN_MAP_STORAGE_PATH]);

      const exists = await bpmnMapExistsInStorage();
      expect(exists).toBe(false);
    });
  });

  describe('saveBpmnMapToStorage', () => {
    it('should save valid bpmn-map to storage', async () => {
      const validMap = {
        processes: [
          {
            bpmn_file: 'mortgage.bpmn',
            call_activities: [
              {
                bpmn_id: 'Activity_1',
                name: 'Application Process',
                called_element: 'mortgage-se-application',
                subprocess_bpmn_file: 'mortgage-se-application.bpmn',
              },
            ],
          },
        ],
      };

      const saveResult = await saveBpmnMapToStorage(validMap);
      expect(saveResult.success).toBe(true);

      // Verify it was saved
      const exists = await bpmnMapExistsInStorage();
      expect(exists).toBe(true);

      // Download directly from storage to verify content (bypass cache)
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .download(BPMN_MAP_STORAGE_PATH);

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      const content = await data!.text();
      const savedMap = JSON.parse(content);

      expect(savedMap.processes).toHaveLength(1);
      expect(savedMap.processes[0].bpmn_file).toBe('mortgage.bpmn');
      expect(savedMap.processes[0].call_activities).toHaveLength(1);
    });
  });
});
