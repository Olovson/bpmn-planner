import { describe, it, expect, vi } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { GenerationError } from '@/lib/engine/types';

vi.mock('@/lib/bpmnProcessGraph', () => ({
  buildBpmnProcessGraph: vi.fn(async () => {
    throw new Error('graph-failed');
  }),
  createGraphSummary: vi.fn(() => ({
    totalFiles: 0,
    totalNodes: 0,
    filesIncluded: [],
    hierarchyDepth: 0,
  })),
  getTestableNodes: vi.fn(() => []),
}));

// Ensure we never hit real Supabase or LLM in this test.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(async () => ({ data: null, error: null })),
        list: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

vi.mock('@/lib/llmClient', () => ({
  isLlmEnabled: () => false,
}));

describe('generateAllFromBpmnWithGraph – error handling', () => {
  it('wraps hierarchical failures in GenerationError', async () => {
    try {
      await generateAllFromBpmnWithGraph(
        'mortgage.bpmn',
        ['mortgage.bpmn'],
        [],
        true, // useHierarchy = true to avoid legacy fallback
        false, // useLlm = false so we avoid LLM checks
      );
      throw new Error('Expected generateAllFromBpmnWithGraph to throw');
    } catch (error) {
      const err = error as GenerationError;
      expect(err).toBeInstanceOf(GenerationError);
      expect(err.kind).toBe('generation');
      expect(err.context?.bpmnFileName).toBe('mortgage.bpmn');
      expect(err.cause).toBeInstanceOf(Error);
    }
  });
});

