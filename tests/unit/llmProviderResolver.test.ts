/**
 * Unit tests for LLM Provider Resolver
 */

import { describe, it, expect } from 'vitest';
import { resolveLlmProvider } from '@/lib/llmProviderResolver';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

describe('resolveLlmProvider', () => {
  it('should use user choice when provided and local is available', () => {
    const result = resolveLlmProvider({
      userChoice: 'local',
      globalDefault: 'cloud',
      localAvailable: true,
    });

    expect(result.chosen).toBe('local');
    expect(result.source).toBe('user');
    expect(result.attempted).toContain('local');
  });

  it('should fallback to cloud when user chooses local but local is not available', () => {
    const result = resolveLlmProvider({
      userChoice: 'local',
      globalDefault: 'cloud',
      localAvailable: false,
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('auto-fallback');
    expect(result.attempted).toEqual(['local', 'cloud']);
  });

  it('should use user choice cloud when provided', () => {
    const result = resolveLlmProvider({
      userChoice: 'cloud',
      globalDefault: 'local',
      localAvailable: true,
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('user');
    expect(result.attempted).toEqual(['cloud']);
  });

  it('should use project default when no user choice', () => {
    const result = resolveLlmProvider({
      projectDefault: 'local',
      globalDefault: 'cloud',
      localAvailable: true,
    });

    expect(result.chosen).toBe('local');
    expect(result.source).toBe('project');
    expect(result.attempted).toContain('local');
  });

  it('should fallback to cloud when project default is local but not available', () => {
    const result = resolveLlmProvider({
      projectDefault: 'local',
      globalDefault: 'cloud',
      localAvailable: false,
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('auto-fallback');
    expect(result.attempted).toEqual(['local', 'cloud']);
  });

  it('should use global default when no user choice or project default', () => {
    const result = resolveLlmProvider({
      globalDefault: 'cloud',
      localAvailable: true,
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('global');
    expect(result.attempted).toEqual(['cloud']);
  });

  it('should fallback to cloud when global default is local but not available', () => {
    const result = resolveLlmProvider({
      globalDefault: 'local',
      localAvailable: false,
    });

    expect(result.chosen).toBe('cloud');
    expect(result.source).toBe('auto-fallback');
    expect(result.attempted).toEqual(['local', 'cloud']);
  });

  it('should not include cloud in attempted when fallback is disabled', () => {
    const result = resolveLlmProvider({
      userChoice: 'local',
      globalDefault: 'cloud',
      localAvailable: true,
      allowFallback: false,
    });

    expect(result.chosen).toBe('local');
    expect(result.source).toBe('user');
    expect(result.attempted).toEqual(['local']);
  });
});

