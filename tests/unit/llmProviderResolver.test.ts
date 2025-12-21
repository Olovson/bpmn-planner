/**
 * Unit tests for LLM Provider Resolver
 */

import { describe, it, expect } from 'vitest';
import { resolveLlmProvider } from '@/lib/llmProviderResolver';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

describe('resolveLlmProvider', () => {
  it('should use user choice when provided (cloud)', () => {
    const result = resolveLlmProvider({
      userChoice: 'cloud',
      globalDefault: 'ollama',
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('user');
    expect(result.attempted).toContain('cloud');
  });

  it('should use user choice when provided (ollama)', () => {
    const result = resolveLlmProvider({
      userChoice: 'ollama',
      globalDefault: 'cloud',
    });

    expect(result.chosen).toBe('ollama');
    expect(result.source).toBe('user');
    expect(result.attempted).toContain('ollama');
  });

  it('should use project default when no user choice', () => {
    const result = resolveLlmProvider({
      projectDefault: 'ollama',
      globalDefault: 'cloud',
    });

    expect(result.chosen).toBe('ollama');
    expect(result.source).toBe('project');
    expect(result.attempted).toContain('ollama');
  });

  it('should use global default when no user choice or project default', () => {
    const result = resolveLlmProvider({
      globalDefault: 'cloud',
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('global');
    expect(result.attempted).toEqual(['cloud']);
  });

  it('should include fallback in attempted when ollama is chosen and fallback is enabled', () => {
    const result = resolveLlmProvider({
      userChoice: 'ollama',
      globalDefault: 'cloud',
      allowFallback: true,
    });

    expect(result.chosen).toBe('ollama');
    expect(result.source).toBe('user');
    expect(result.attempted).toEqual(['ollama', 'cloud']);
  });

  it('should not include cloud in attempted when fallback is disabled', () => {
    const result = resolveLlmProvider({
      userChoice: 'ollama',
      globalDefault: 'cloud',
      allowFallback: false,
    });

    expect(result.chosen).toBe('ollama');
    expect(result.source).toBe('user');
    expect(result.attempted).toEqual(['ollama']);
  });
});
