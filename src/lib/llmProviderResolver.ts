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
   * Om lokal LLM är tillgänglig (från healthcheck/cache)
   */
  localAvailable: boolean;
  /**
   * Om fallback till cloud ska tillåtas vid local-fel
   */
  allowFallback?: boolean;
}

/**
 * Resolverar vilken LLM-provider som ska användas.
 * 
 * Logik:
 * 1. Om userChoice finns:
 *    - Om userChoice === 'local' och localAvailable === true → använd local
 *    - Om userChoice === 'local' men localAvailable === false → använd cloud (med source 'auto-fallback')
 *    - Om userChoice === 'cloud' → använd cloud
 * 
 * 2. Om ingen userChoice, men projectDefault finns:
 *    - Använd projectDefault (med samma localAvailable-check)
 * 
 * 3. Annars → använd globalDefault (med localAvailable-check)
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
    localAvailable,
    allowFallback = true,
  } = options;

  // Prioritet 1: Användarens val
  if (userChoice !== undefined) {
    if (userChoice === 'local') {
      if (localAvailable) {
        return {
          chosen: 'local',
          source: 'user',
          attempted: allowFallback ? ['local', 'cloud'] : ['local'],
        };
      } else {
        // Local vald men inte tillgänglig → fallback till cloud
        return {
          chosen: 'cloud',
          source: 'auto-fallback',
          attempted: ['local', 'cloud'],
        };
      }
    } else {
      // userChoice === 'cloud'
      return {
        chosen: 'cloud',
        source: 'user',
        attempted: allowFallback ? ['cloud', 'local'] : ['cloud'],
      };
    }
  }

  // Prioritet 2: Projekt-default
  if (projectDefault !== undefined) {
    if (projectDefault === 'local') {
      if (localAvailable) {
        return {
          chosen: 'local',
          source: 'project',
          attempted: allowFallback ? ['local', 'cloud'] : ['local'],
        };
      } else {
        // Project default är local men inte tillgänglig → fallback till cloud
        return {
          chosen: 'cloud',
          source: 'auto-fallback',
          attempted: ['local', 'cloud'],
        };
      }
    } else {
      return {
        chosen: 'cloud',
        source: 'project',
        attempted: allowFallback ? ['cloud', 'local'] : ['cloud'],
      };
    }
  }

  // Prioritet 3: Global default
  if (globalDefault === 'local') {
    if (localAvailable) {
      return {
        chosen: 'local',
        source: 'global',
        attempted: allowFallback ? ['local', 'cloud'] : ['local'],
      };
    } else {
      // Global default är local men inte tillgänglig → fallback till cloud
      return {
        chosen: 'cloud',
        source: 'auto-fallback',
        attempted: ['local', 'cloud'],
      };
    }
  } else {
    return {
      chosen: 'cloud',
      source: 'global',
      attempted: allowFallback ? ['cloud', 'local'] : ['cloud'],
    };
  }
}
