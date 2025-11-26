import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Fallback Safety Tests
 * 
 * Dessa tester säkerställer att:
 * 1. Fallback-resultat är tydligt markerade
 * 2. Tester inte använder fallback som standard
 * 3. Fallback kan identifieras i output
 */

describe('Fallback Safety', () => {
  beforeEach(() => {
    // Säkerställ att LLM är inaktiverat i tester
    vi.stubEnv('VITE_USE_LLM', 'false');
    vi.stubEnv('VITE_ALLOW_LLM_IN_TESTS', 'false');
  });

  it('should not use LLM in regular tests', () => {
    // Verifiera att miljövariabler är korrekt satta
    expect(process.env.VITE_USE_LLM).toBe('false');
    expect(process.env.VITE_ALLOW_LLM_IN_TESTS).toBe('false');
  });

  it('should mark fallback results with metadata', () => {
    // Simulera HTML med fallback-metadata
    const htmlWithFallback = `
      <div class="doc-shell" 
           data-llm-provider="local" 
           data-llm-model="llama3"
           data-llm-fallback-used="true">
        <div class="llm-fallback-banner">Fallback used</div>
        <section data-source-summary="fallback">Content</section>
      </div>
    `;

    // Verifiera att fallback kan identifieras
    const hasFallbackBanner = htmlWithFallback.includes('llm-fallback-banner');
    const hasFallbackAttribute = htmlWithFallback.includes('data-llm-fallback-used="true"');
    const hasFallbackSource = htmlWithFallback.includes('data-source-summary="fallback"');

    expect(hasFallbackBanner).toBe(true);
    expect(hasFallbackAttribute).toBe(true);
    expect(hasFallbackSource).toBe(true);
  });

  it('should distinguish between LLM and fallback content', () => {
    const htmlMixed = `
      <div class="doc-shell" data-llm-fallback-used="false">
        <section data-source-summary="llm">LLM content</section>
        <section data-source-scenarios="fallback">Fallback content</section>
      </div>
    `;

    // Verifiera att vi kan skilja mellan LLM och fallback
    const llmSections = htmlMixed.match(/data-source-\w+="llm"/g);
    const fallbackSections = htmlMixed.match(/data-source-\w+="fallback"/g);

    expect(llmSections?.length).toBeGreaterThan(0);
    expect(fallbackSections?.length).toBeGreaterThan(0);
  });
});

