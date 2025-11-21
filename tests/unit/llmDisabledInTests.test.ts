import { describe, it, expect, vi } from 'vitest';

// Vi importerar direkt från den verkliga modulen för att verifiera testbeteende.
import { isLlmEnabled } from '@/lib/llmClient';
import * as llmClient from '@/lib/llmClient';

describe('LLM is disabled in Vitest environment', () => {
  it('isLlmEnabled() returns false under tests', () => {
    // Vitest kör med import.meta.env.MODE === "test" via Vite/Vitest.
    expect(isLlmEnabled()).toBe(false);
  });

  it('generateChatCompletion returns null when LLM is disabled', async () => {
    const result = await llmClient.generateChatCompletion(
      [{ role: 'user', content: 'hello' }],
      {},
    );

    expect(result).toBeNull();
  });
});
