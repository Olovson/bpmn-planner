import { describe, it, expect } from 'vitest';
import { wrapDocument } from '@/lib/documentationTemplates';

describe('wrapDocument LLM fallback banner', () => {
  it('renders fallback banner when fallbackUsed=true and finalProvider=local', () => {
    const html = wrapDocument(
      'Test Title',
      '<section><h2>Innehåll</h2><p>Body</p></section>',
      {
        llmMetadata: {
          provider: 'local',
          model: 'llama3.1:8b',
        },
        fallbackUsed: true,
        finalProvider: 'local',
      },
    );

    expect(html).toContain('class=\"llm-fallback-banner\"');
    expect(html).toContain('ChatGPT (moln-LLM) kunde inte nås. Detta dokument är genererat av lokal LLM (Ollama) som fallback.');
    expect(html).toContain('data-llm-fallback-used=\"true\"');
  });

  it('does not render banner when fallbackUsed is false', () => {
    const html = wrapDocument(
      'Test Title',
      '<section><h2>Innehåll</h2><p>Body</p></section>',
      {
        llmMetadata: {
          provider: 'cloud',
          model: 'gpt-4o',
        },
        fallbackUsed: false,
        finalProvider: 'cloud',
      },
    );

    expect(html).not.toContain('<div class=\"llm-fallback-banner\"');
    expect(html).toContain('data-llm-provider=\"cloud\"');
  });
});
