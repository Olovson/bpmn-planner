import { describe, it, expect } from 'vitest';
import { getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';

describe('Feature Goal path generation for process nodes', () => {
  it('should generate correct path for process node: mortgage-se-internal-data-gathering', () => {
    // For process nodes: subprocess file = mortgage-se-internal-data-gathering
    // elementId = internal-data-gathering
    // NO parent (process nodes don't use hierarchical naming)
    const result = getFeatureGoalDocFileKey(
      'mortgage-se-internal-data-gathering', // subprocess BPMN file
      'internal-data-gathering', // elementId
      undefined, // no version suffix
      undefined // NO parent for process nodes
    );
    
    // Expected: mortgage-se-internal-data-gathering.html
    // (because elementId is already in the subprocess file name)
    expect(result).toBe('feature-goals/mortgage-se-internal-data-gathering.html');
  });

  it('should generate correct path for process node with different elementId', () => {
    // If elementId doesn't match subprocess file name
    const result = getFeatureGoalDocFileKey(
      'mortgage-se-internal-data-gathering', // subprocess BPMN file
      'some-other-element', // elementId
      undefined,
      undefined
    );
    
    // Should be: subprocess-file-elementId
    expect(result).toBe('feature-goals/mortgage-se-internal-data-gathering-some-other-element.html');
  });

  it('should match the actual file in Supabase', () => {
    // The actual file in Supabase is:
    // docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-internal-data-gathering.html
    const result = getFeatureGoalDocFileKey(
      'mortgage-se-internal-data-gathering', // subprocess file
      'internal-data-gathering', // elementId
      undefined,
      undefined // NO parent
    );
    
    expect(result).toBe('feature-goals/mortgage-se-internal-data-gathering.html');
  });
});

