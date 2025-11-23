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

export const TOKEN_WARNING_THRESHOLDS = {
  // ChatGPT har generöst context-fönster, så vi varnar först när
  // prompt-estimatet är mer än ca 2.2x output-budgeten (maxTokens).
  chatgpt: 2.2,
  // Lokal/Ollama hålls striktare för att undvika tunga prompts.
  ollama: 0.6,
} as const;

export function getTokenWarningThresholdForProvider(
  provider: LlmProvider,
): number {
  if (provider === 'cloud') return TOKEN_WARNING_THRESHOLDS.chatgpt;
  if (provider === 'local') return TOKEN_WARNING_THRESHOLDS.ollama;
  return 0.75;
}

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
      maxTokens: 2000,
      temperature: 0.35,
    },
    local: {
      maxTokens: 900,
      temperature: 0.3,
      extraSystemPrefix:
        'Svara endast med ren JSON. Inga rubriker, ingen markdown, inga code fences. ' +
        'Börja direkt med { och avsluta med }. ' +
        'Ingen text före eller efter JSON-objektet. ' +
        'För Feature Goal måste du inkludera ALLA följande fält: summary, effectGoals, scopeIncluded, scopeExcluded, epics, flowSteps, dependencies, scenarios, testDescription, implementationNotes, relatedItems. ' +
        'Inga extra fält som "type", "bpmnContext", "prerequisites", "inputs", "interactions", "dataContracts" – dessa är för Epic eller input, inte Feature Goal output. ' +
        'List-fält (effectGoals, scopeIncluded, scopeExcluded, flowSteps, dependencies, implementationNotes, relatedItems) måste vara arrays av strängar, inte objekt.',
    },
  },
  epic: {
    cloud: {
      maxTokens: 2200,
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
