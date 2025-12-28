import { describe, it, expect } from 'vitest';
import { getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';

/**
 * Test that validates the exact path generation logic used in DocViewer.tsx
 * for Feature Goals, especially for process nodes.
 * 
 * This test simulates the exact scenario:
 * - docId: nodes/mortgage-se-application/internal-data-gathering
 * - baseName: mortgage-se-application (parent file)
 * - elementSegment: internal-data-gathering
 * - nodeContext.node.bpmnFile: mortgage-se-internal-data-gathering.bpmn (subprocess file)
 * - Expected file: mortgage-se-internal-data-gathering.html
 * - Expected full path: docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-internal-data-gathering.html
 */
describe('DocViewer Feature Goal path generation (process nodes)', () => {
  it('should generate correct path for process node: mortgage-se-application/internal-data-gathering', () => {
    // Simulate what DocViewer does for process nodes:
    const baseName = 'mortgage-se-application'; // Parent file (from docId)
    const elementSegment = 'internal-data-gathering'; // Process ID (from docId)
    
    // For process nodes, nodeContext.node.bpmnFile should be the subprocess file
    // But if it's not set, we fall back to elementSegment
    const nodeBpmnFile = 'mortgage-se-internal-data-gathering.bpmn'; // From nodeContext.node.bpmnFile
    const featureGoalBpmnFile = nodeBpmnFile ? nodeBpmnFile.replace('.bpmn', '') : elementSegment;
    const isProcessNode = true;
    const parentBpmnFile = baseName + '.bpmn'; // For version hash (where process is referenced)
    
    // Build Feature Goal path (same as DocViewer.tsx line 246-250)
    const featureGoalPath = getFeatureGoalDocFileKey(
      featureGoalBpmnFile, // subprocess BPMN file
      elementSegment, // elementId
      undefined, // no version suffix
      isProcessNode ? undefined : parentBpmnFile // NO parent for process nodes
    );
    
    // Expected: feature-goals/mortgage-se-internal-data-gathering.html
    expect(featureGoalPath).toBe('feature-goals/mortgage-se-internal-data-gathering.html');
    
    // Build full versioned path (same as DocViewer.tsx line 272-276)
    const bpmnFileForVersion = isProcessNode 
      ? (baseName + '.bpmn') // For process nodes, use the PARENT file (where the process is referenced)
      : (parentBpmnFile || baseName + '.bpmn');
    
    const versionHash = '0a6ddc365ebca42a83d8dad2f101c737294b14da5ba9fab039785ccd70fc428a';
    const fullPath = `docs/claude/${bpmnFileForVersion}/${versionHash}/${featureGoalPath}`;
    
    // Expected full path matches the actual file in Supabase
    expect(fullPath).toBe(
      'docs/claude/mortgage-se-application.bpmn/0a6ddc365ebca42a83d8dad2f101c737294b14da5ba9fab039785ccd70fc428a/feature-goals/mortgage-se-internal-data-gathering.html'
    );
  });

  it('should handle case where nodeContext.node.bpmnFile is not set (fallback to elementSegment)', () => {
    const baseName = 'mortgage-se-application';
    const elementSegment = 'internal-data-gathering';
    const nodeBpmnFile = undefined; // nodeContext.node.bpmnFile not set
    const featureGoalBpmnFile = nodeBpmnFile ? nodeBpmnFile.replace('.bpmn', '') : elementSegment;
    const isProcessNode = true;
    
    const featureGoalPath = getFeatureGoalDocFileKey(
      featureGoalBpmnFile, // = elementSegment when nodeBpmnFile is undefined
      elementSegment,
      undefined,
      isProcessNode ? undefined : undefined
    );
    
    // When featureGoalBpmnFile = elementSegment, getFeatureGoalDocFileKey should return
    // feature-goals/internal-data-gathering.html (since elementSegment contains itself)
    expect(featureGoalPath).toBe('feature-goals/internal-data-gathering.html');
  });
});














