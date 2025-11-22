import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import type { LlmResolution } from '@/lib/llmProviderResolver';

vi.mock('@/lib/llmClients', () => {
  return {
    getLlmClient: (provider: LlmProvider) => {
      if (provider === 'cloud') {
        return {
          provider: 'cloud' as const,
          modelName: 'gpt-4o',
          generateText: vi.fn().mockRejectedValue(new Error('Cloud connection failed')),
        };
      }
      return {
        provider: 'local' as const,
        modelName: 'llama3.1:8b',
        generateText: vi.fn().mockResolvedValue('{"summary":"ok"}'),
      };
    },
  };
});

vi.mock('@/lib/llmProfiles', () => {
  return {
    getLlmProfile: (docType: string, provider: LlmProvider) => ({
      provider,
      docType,
      maxTokens: 256,
      temperature: 0,
      extraSystemPrefix: '',
    }),
  };
});

vi.mock('@/lib/promptLoader', () => ({
  buildSystemPrompt: (base: string, extra: string) => `${extra}${base}`,
}));

describe('generateWithFallback cloud → local', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('falls back to local when cloud fails and local is attempted', async () => {
    const { generateWithFallback } = await import('@/lib/llmFallback');

    const resolution: LlmResolution = {
      chosen: 'cloud',
      source: 'user',
      attempted: ['cloud', 'local'],
    };

    const result = await generateWithFallback({
      docType: 'feature',
      resolution,
      systemPrompt: 'system',
      userPrompt: '{"foo":"bar"}',
      validateResponse: () => ({ valid: true, errors: [] }),
    });

    expect(result.provider).toBe('local');
    expect(result.fallbackUsed).toBe(true);
    expect(result.attemptedProviders).toEqual(['cloud', 'local']);
  });
});

