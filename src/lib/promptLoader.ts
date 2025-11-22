/**
 * Central Prompt Loader
 * 
 * Laddar prompts från markdown-filer och exponerar dem via tydliga funktioner.
 * Säkerställer att både cloud och local LLM använder samma promptkällor.
 */

import featureEpicPromptMd from '../../prompts/llm/feature_epic_prompt.md?raw';
import dmnBusinessRulePromptMd from '../../prompts/llm/dmn_businessrule_prompt.md?raw';
import testscriptPromptMd from '../../prompts/llm/testscript_prompt.md?raw';

/**
 * Hämtar prompt för Feature Goal-dokumentation.
 * 
 * Prompten instruerar LLM att returnera ett JSON-objekt som matchar FeatureGoalDocModel.
 * Se prompts/llm/feature_epic_prompt.md för detaljer.
 */
export function getFeaturePrompt(): string {
  return featureEpicPromptMd;
}

/**
 * Hämtar prompt för Epic-dokumentation.
 * 
 * Prompten instruerar LLM att returnera ett JSON-objekt som matchar EpicDocModel.
 * Se prompts/llm/feature_epic_prompt.md för detaljer.
 */
export function getEpicPrompt(): string {
  return featureEpicPromptMd;
}

/**
 * Hämtar prompt för Business Rule / DMN-dokumentation.
 * 
 * Prompten instruerar LLM att returnera ett JSON-objekt som matchar BusinessRuleDocModel.
 * Se prompts/llm/dmn_businessrule_prompt.md för detaljer.
 */
export function getBusinessRulePrompt(): string {
  return dmnBusinessRulePromptMd;
}

/**
 * Hämtar prompt för testscript-generering.
 * 
 * Prompten instruerar LLM att returnera ren JSON med testscenarier.
 * Se prompts/llm/testscript_prompt.md för detaljer.
 */
export function getTestscriptPrompt(): string {
  return testscriptPromptMd;
}

/**
 * Bygger fullständig system prompt med ev. extra prefix för provider.
 * 
 * @param basePrompt - Basprompt från md-fil
 * @param extraPrefix - Ev. extra instruktioner per provider (t.ex. för lokal modell)
 * @returns Fullständig system prompt
 */
export function buildSystemPrompt(basePrompt: string, extraPrefix?: string): string {
  if (extraPrefix) {
    return `${extraPrefix}\n\n${basePrompt}`;
  }
  return basePrompt;
}

