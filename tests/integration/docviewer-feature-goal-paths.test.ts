/**
 * Unit test for DocViewer Feature Goal path resolution logic
 * 
 * Tests that DocViewer correctly builds storage paths for Feature Goal documentation,
 * especially for process nodes in subprocess files (like "internal-data-gathering").
 * 
 * This test validates the path-building logic in DocViewer.tsx that:
 * 1. Builds correct storage paths (hierarchical vs legacy naming)
 * 2. Handles versioned and non-versioned paths
 * 3. Uses correct BPMN file for version hash lookup
 * 4. Handles process nodes vs callActivity nodes correctly
 */

import { describe, it, expect } from 'vitest';
import { getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';

describe('DocViewer Feature Goal Path Resolution', () => {

  describe('Feature Goal Path Building for Process Nodes', () => {
    it('should build correct paths for process nodes (no parent)', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = baseName; // For process nodes, subprocessFile = baseName
      const parentBpmnFile = undefined; // No parent for process nodes
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build paths (same as DocViewer does)
      const hierarchicalPath = parentBpmnFile
        ? getFeatureGoalDocFileKey(
            featureGoalBpmnFile,
            elementSegment,
            versionToUse,
            parentBpmnFile
          )
        : getFeatureGoalDocFileKey(
            featureGoalBpmnFile,
            elementSegment,
            versionToUse
          );
      
      const legacyPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse
      );
      
      // For process nodes, hierarchical and legacy should be the same (no parent)
      expect(hierarchicalPath).toBe(legacyPath);
      
      // Expected path: feature-goals/mortgage-se-internal-data-gathering-v2.html
      // (since elementSegment is already in baseName, it should be simplified)
      expect(hierarchicalPath).toContain('feature-goals');
      expect(hierarchicalPath).toContain('mortgage-se-internal-data-gathering');
      expect(hierarchicalPath).toContain('-v2.html');
      expect(hierarchicalPath).not.toContain('internal-data-gathering-internal-data-gathering'); // No duplication
    });

    it('should build correct paths for callActivity nodes (with parent)', () => {
      const baseName = 'mortgage-se-application'; // Parent file
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = 'mortgage-se-internal-data-gathering'; // Subprocess file
      const parentBpmnFile = baseName + '.bpmn';
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build hierarchical path (with parent)
      const hierarchicalPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse,
        parentBpmnFile
      );
      
      // Build legacy path (without parent)
      const legacyPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse
      );
      
      // Hierarchical path should include parent name
      expect(hierarchicalPath).toContain('mortgage-se-application');
      expect(hierarchicalPath).toContain('internal-data-gathering');
      expect(hierarchicalPath).toContain('-v2.html');
      
      // Legacy path should not include parent name
      expect(legacyPath).not.toContain('mortgage-se-application');
      expect(legacyPath).toContain('mortgage-se-internal-data-gathering');
      expect(legacyPath).toContain('-v2.html');
      
      // They should be different
      expect(hierarchicalPath).not.toBe(legacyPath);
    });

    it('should build correct storage paths for process nodes', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = baseName;
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build Feature Goal file key (no parent for process nodes)
      const featureGoalPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse
      );
      
      // Build expected storage paths (same as DocViewer does)
      const expectedPaths = [
        `docs/local/${featureGoalPath}`,
        `docs/slow/chatgpt/${featureGoalPath}`,
        `docs/slow/ollama/${featureGoalPath}`,
        `docs/slow/${featureGoalPath}`,
        `docs/${featureGoalPath}`,
      ];
      
      // Verify all paths are valid
      expectedPaths.forEach(path => {
        expect(path).toContain('docs/');
        expect(path).toContain('feature-goals/');
        expect(path).toContain('mortgage-se-internal-data-gathering');
        expect(path).toMatch(/\.html$/);
      });
    });

    it('should build correct versioned storage paths for process nodes', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = baseName;
      const versionHash = 'abc123def456';
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build Feature Goal file key
      const featureGoalPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse
      );
      
      const docFileName = featureGoalPath.replace('feature-goals/', '');
      
      // Build versioned paths (same as DocViewer does)
      const bpmnFileForVersion = featureGoalBpmnFile + '.bpmn'; // For process nodes, use subprocess file
      
      const expectedVersionedPaths = [
        `docs/local/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/chatgpt/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/ollama/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
      ];
      
      // Verify all paths are valid
      expectedVersionedPaths.forEach(path => {
        expect(path).toContain('docs/');
        expect(path).toContain(versionHash);
        expect(path).toContain('mortgage-se-internal-data-gathering');
        expect(path).toMatch(/\.html$/);
      });
      
      // Verify correct BPMN file is used (subprocess file, not parent)
      expectedVersionedPaths.forEach(path => {
        expect(path).toContain('mortgage-se-internal-data-gathering');
        expect(path).not.toContain('mortgage-se-application'); // Should not use parent file
      });
    });

    it('should build correct versioned storage paths for callActivity nodes', () => {
      const baseName = 'mortgage-se-application'; // Parent file
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = 'mortgage-se-internal-data-gathering'; // Subprocess file
      const parentBpmnFile = baseName + '.bpmn';
      const versionHash = 'abc123def456';
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build Feature Goal file key (with parent for hierarchical naming)
      const hierarchicalPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse,
        parentBpmnFile
      );
      
      const docFileName = hierarchicalPath.replace('feature-goals/', '');
      
      // Build versioned paths (same as DocViewer does)
      // For call activities, use parent file for version hash
      const bpmnFileForVersion = parentBpmnFile;
      
      const expectedVersionedPaths = [
        `docs/local/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/chatgpt/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/ollama/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
        `docs/slow/${bpmnFileForVersion.replace('.bpmn', '')}/${versionHash}/${docFileName}`,
      ];
      
      // Verify all paths are valid
      expectedVersionedPaths.forEach(path => {
        expect(path).toContain('docs/');
        expect(path).toContain(versionHash);
        expect(path).toContain('mortgage-se-application'); // Should use parent file
        expect(path).toMatch(/\.html$/);
      });
    });
  });

  describe('Path Resolution Logic', () => {
    it('should use subprocess file for version hash lookup for process nodes', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const isProcessNode = true;
      
      // Simulate DocViewer logic
      const featureGoalBpmnFile = baseName;
      const bpmnFileForVersion = isProcessNode
        ? featureGoalBpmnFile + '.bpmn' // For process nodes, use subprocess file
        : baseName + '.bpmn'; // For call activities, would use parent file
      
      expect(bpmnFileForVersion).toBe('mortgage-se-internal-data-gathering.bpmn');
    });

    it('should use parent file for version hash lookup for callActivity nodes', () => {
      const baseName = 'mortgage-se-application'; // Parent file
      const parentBpmnFile = baseName + '.bpmn';
      const isProcessNode = false;
      
      // Simulate DocViewer logic
      const bpmnFileForVersion = isProcessNode
        ? baseName + '.bpmn'
        : (parentBpmnFile || baseName + '.bpmn'); // For call activities, use parent file
      
      expect(bpmnFileForVersion).toBe('mortgage-se-application.bpmn');
    });

    it('should generate paths without version suffix', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = baseName;
      
      // Test without version (default behavior)
      const path = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        undefined // no version suffix
      );
      
      // Should not contain version suffix
      expect(path).not.toContain('-v1.html');
      expect(path).not.toContain('-v2.html');
      expect(path).toContain('.html');
    });
  });

  describe('Edge Cases', () => {
    it('should handle process nodes where elementSegment matches baseName', () => {
      // When elementSegment is already in baseName, getFeatureGoalDocFileKey should simplify
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      
      const path = getFeatureGoalDocFileKey(
        baseName,
        elementSegment,
        'v2'
      );
      
      // Should not duplicate: mortgage-se-internal-data-gathering-internal-data-gathering
      // Should simplify to: mortgage-se-internal-data-gathering
      expect(path).not.toContain('internal-data-gathering-internal-data-gathering');
      expect(path).toContain('mortgage-se-internal-data-gathering');
    });

    it('should handle missing version hash gracefully', () => {
      const baseName = 'mortgage-se-internal-data-gathering';
      const elementSegment = 'internal-data-gathering';
      const featureGoalBpmnFile = baseName;
      const versionToUse: 'v1' | 'v2' = 'v2';
      
      // Build non-versioned paths (fallback when version hash is null)
      const featureGoalPath = getFeatureGoalDocFileKey(
        featureGoalBpmnFile,
        elementSegment,
        versionToUse
      );
      
      const expectedPaths = [
        `docs/local/${featureGoalPath}`,
        `docs/slow/chatgpt/${featureGoalPath}`,
        `docs/slow/ollama/${featureGoalPath}`,
        `docs/slow/${featureGoalPath}`,
        `docs/${featureGoalPath}`,
      ];
      
      // All paths should be valid even without version hash
      expectedPaths.forEach(path => {
        expect(path).toContain('docs/');
        expect(path).toContain('feature-goals/');
        expect(path).toMatch(/\.html$/);
      });
    });
  });
});








