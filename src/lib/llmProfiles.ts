/**
 * LLM Provider Profiles
 * 
 * Definierar provider-specifika inställningar (maxTokens, temperature, etc.)
 * för olika dokumentationstyper. Säkerställer att både cloud och local
 * LLM använder samma prompts men med provider-optimerade parametrar.
 */

import type { LlmProvider } from './llmClientAbstraction';

export type DocType = 'businessRule' | 'feature' | 'epic' | 'testscript';

export interface LlmProfile {
  maxTokens: number;
  temperature: number;
  /**
   * Ev. extra system prompt prefix för provider-specifika instruktioner.
   * T.ex. för lokal modell kan vi behöva vara extra tydliga med "endast JSON".
   * Lämna tomt om inte nödvändigt.
   */
  extraSystemPrefix?: string;
}

export type LlmProfiles = {
  [K in DocType]: Record<LlmProvider, LlmProfile>;
};

/**
 * Default LLM-profiler per dokumenttyp och provider.
 * 
 * Cloud: högre maxTokens, lägre temperature (mer förutsägbart)
 * Local: lägre maxTokens, mer konservativ temperature (för bättre stabilitet)
 */
const DEFAULT_PROFILES: LlmProfiles = {
  businessRule: {
    cloud: {
      maxTokens: 1800,
      temperature: 0.35,
    },
    local: {
      maxTokens: 1600,
      temperature: 0.3,
      // Lokal modell kan behöva extra tydlighet om JSON-format
      extraSystemPrefix: 'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences.',
    },
  },
  feature: {
    cloud: {
      maxTokens: 2000,
      temperature: 0.35,
    },
    local: {
      maxTokens: 1800,
      temperature: 0.3,
      extraSystemPrefix: 'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences.',
    },
  },
  epic: {
    cloud: {
      maxTokens: 1800,
      temperature: 0.35,
    },
    local: {
      maxTokens: 1600,
      temperature: 0.3,
      extraSystemPrefix: 'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences.',
    },
  },
  testscript: {
    cloud: {
      maxTokens: 900,
      temperature: 0.3,
    },
    local: {
      maxTokens: 800,
      temperature: 0.25,
      extraSystemPrefix: 'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. JSON-objektet måste följa exakt schemat.',
    },
  },
};

/**
 * Hämtar LLM-profil för en specifik dokumenttyp och provider.
 * 
 * @param docType - Dokumenttyp (businessRule, feature, epic, testscript)
 * @param provider - LLM-provider (cloud eller local)
 * @returns LlmProfile med maxTokens, temperature och ev. extraSystemPrefix
 */
export function getLlmProfile(docType: DocType, provider: LlmProvider): LlmProfile {
  return DEFAULT_PROFILES[docType][provider];
}

/**
 * Hämtar alla profiler för en provider (användbart för debugging/översikt).
 */
export function getLlmProfilesForProvider(provider: LlmProvider): Record<DocType, LlmProfile> {
  return {
    businessRule: DEFAULT_PROFILES.businessRule[provider],
    feature: DEFAULT_PROFILES.feature[provider],
    epic: DEFAULT_PROFILES.epic[provider],
    testscript: DEFAULT_PROFILES.testscript[provider],
  };
}

