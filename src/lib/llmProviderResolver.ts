/**
 * LLM Provider Resolver
 * 
 * Smart resolver för att välja rätt LLM-provider baserat på:
 * - användarens val i UI
 * - projekt-/session-default
 * - global default
 * - healthcheck / tillgänglighet
 */

import type { LlmProvider } from './llmClientAbstraction';

export type LlmProviderSource = 'user' | 'project' | 'global' | 'auto-fallback';

export interface LlmResolution {
  chosen: LlmProvider;
  source: LlmProviderSource;
  attempted: LlmProvider[];
}

export interface ResolveLlmProviderOptions {
  /**
   * Användarens val från UI (om satt)
   */
  userChoice?: LlmProvider;
  /**
   * Projekt-/session-default (kan vara null/undefined)
   */
  projectDefault?: LlmProvider;
  /**
   * Global default från env (t.ex. 'cloud')
   */
  globalDefault: LlmProvider;
  /**
   * Om fallback till cloud ska tillåtas vid ollama-fel
   */
  allowFallback?: boolean;
}

/**
 * Resolverar vilken LLM-provider som ska användas.
 * 
 * Logik:
 * 1. Om userChoice finns → använd userChoice
 * 2. Om ingen userChoice, men projectDefault finns → använd projectDefault
 * 3. Annars → använd globalDefault
 * 
 * attempted innehåller alla providers som kan komma att användas (inkl. fallback).
 */
export function resolveLlmProvider(
  options: ResolveLlmProviderOptions
): LlmResolution {
  const {
    userChoice,
    projectDefault,
    globalDefault,
    allowFallback = true,
  } = options;

  // Prioritet 1: Användarens val
  if (userChoice !== undefined) {
    return {
      chosen: userChoice,
      source: 'user',
      attempted: allowFallback && userChoice === 'ollama' ? ['ollama', 'cloud'] : [userChoice],
    };
  }

  // Prioritet 2: Projekt-default
  if (projectDefault !== undefined) {
    return {
      chosen: projectDefault,
      source: 'project',
      attempted: allowFallback && projectDefault === 'ollama' ? ['ollama', 'cloud'] : [projectDefault],
    };
  }

  // Prioritet 3: Global default
  return {
    chosen: globalDefault,
    source: 'global',
    attempted: allowFallback && globalDefault === 'ollama' ? ['ollama', 'cloud'] : [globalDefault],
  };
}
