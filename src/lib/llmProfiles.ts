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
      maxTokens: 900,
      temperature: 0.3,
      // Lokal modell behöver extra tydlighet om JSON-format
      extraSystemPrefix:
        'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. ' +
        'Börja direkt med { och avsluta med }. ' +
        'Ingen text före eller efter JSON-objektet. ' +
        'Inga extra fält utöver de som finns i JSON-modellen (summary, inputs, decisionLogic, outputs, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems).',
    },
  },
  feature: {
    cloud: {
      // OBS: Claude Sonnet 4.5 har 8K output tokens/min rate limit
      // 6000 lämnar marginal för rate limiting och säkerställer fortfarande fullständig JSON
      maxTokens: 6000, // Ökad från 2000 för att säkerställa fullständig JSON för komplexa Feature Goals
      temperature: 0.35,
    },
    local: {
      maxTokens: 900,
      temperature: 0.3,
      extraSystemPrefix:
        'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. ' +
        'Börja direkt med { och avsluta med }. ' +
        'Ingen text före eller efter JSON-objektet. ' +
        'Inga extra fält som bpmnContext eller liknande – endast fälten i Feature/Epic-modellen.',
    },
  },
  epic: {
    cloud: {
      maxTokens: 1800,
      temperature: 0.35,
    },
    local: {
      maxTokens: 900,
      temperature: 0.3,
      extraSystemPrefix:
        'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. ' +
        'Börja direkt med { och avsluta med }. ' +
        'Ingen text före eller efter JSON-objektet. ' +
        'Inga extra fält som bpmnContext eller liknande – endast fälten i Epic-modellen.',
    },
  },
  testscript: {
    cloud: {
      maxTokens: 900,
      temperature: 0.3,
    },
    local: {
      maxTokens: 600,
      temperature: 0.25,
      extraSystemPrefix:
        'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. ' +
        'Börja direkt med { och avsluta med }. ' +
        'Ingen text före eller efter JSON-objektet. ' +
        'JSON-objektet måste följa exakt schemat.',
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

/**
 * Returnerar en faktor (0–1) för när vi ska börja varna för hög token-budget
 * för en given provider. Local har lägre gräns än cloud eftersom maxTokens är lägre.
 */
export function getTokenWarningThresholdForProvider(provider: LlmProvider): number {
  if (provider === 'local') {
    // Varna tidigare för lokal modell för att undvika out-of-memory/problem
    return 0.7;
  }
  // Cloud-tjänster klarar sig oftast närmare maxTokens
  return 0.85;
}
