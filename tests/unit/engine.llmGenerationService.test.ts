import { describe, it, expect } from 'vitest';
import { createLlmGenerationService } from '@/lib/engine/services/llmGeneration';

describe('createLlmGenerationService', () => {
  it('exposes a default provider and client', () => {
    const service = createLlmGenerationService();
    const provider = service.getDefaultProvider();
    const client = service.getClient(provider);

    expect(provider).toBeTruthy();
    expect(client).toBeTruthy();
  });
});

