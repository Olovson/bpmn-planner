import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Detta test är opt-in för att undvika hårt beroende av lokal Ollama i alla körningar.
// Kör med:
//   LLM_HEALTH_TEST=true npx vitest run tests/integration/llm.health.local.test.ts
//
const RUN_HEALTH_TEST = process.env.LLM_HEALTH_TEST === 'true';

(RUN_HEALTH_TEST ? describe : describe.skip)('LLM health – lokal Ollama', () => {
  it('rapporterar att lokal LLM är tillgänglig', async () => {
    const { data, error } = await supabase.functions.invoke('llm-health', {
      method: 'GET',
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    const status = data as {
      local: { available: boolean; model: string; error?: string };
      cloud: { available: boolean; model: string };
    };

    expect(status.local.available).toBe(true);
  }, 20000);
});
