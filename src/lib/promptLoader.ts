/**
 * Central Prompt Loader
 * 
 * Laddar prompts från markdown-filer och exponerar dem via tydliga funktioner.
 * Säkerställer att både cloud och local LLM använder samma promptkällor.
 */

import featureEpicPromptMd from '../../prompts/llm/feature_epic_prompt.md?raw';
import dmnBusinessRulePromptMd from '../../prompts/llm/dmn_businessrule_prompt.md?raw';
import testscriptPromptMd from '../../prompts/llm/testscript_prompt.md?raw';
import testScenarioPromptMd from '../../prompts/llm/test_scenario_prompt.md?raw';
import e2eScenarioPromptMd from '../../prompts/llm/e2e_scenario_prompt.md?raw';

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
 * Hämtar prompt för test scenario-generering med Claude.
 * 
 * Prompten instruerar LLM att analysera user stories och BPMN-processflöde
 * för att generera högkvalitativa test scenarios.
 * Se prompts/llm/test_scenario_prompt.md för detaljer.
 */
export function getTestScenarioPrompt(): string {
  return testScenarioPromptMd;
}

/**
 * Hämtar prompt för E2E-scenario-generering med Claude.
 * 
 * Prompten instruerar LLM att generera kompletta E2E-scenarios baserat på
 * BPMN-processgraf, paths, gateway-conditions och Feature Goal-dokumentation.
 * Se prompts/llm/e2e_scenario_prompt.md för detaljer.
 */
export function getE2eScenarioPrompt(): string {
  return e2eScenarioPromptMd;
}

/**
 * Hämtar prompt för en specifik dokumentationstyp.
 * 
 * @param docType - Dokumentationstyp ('epic', 'feature', 'businessRule', 'testScenario')
 * @returns Prompt-sträng
 */
export function getPromptForDocType(
  docType: 'epic' | 'feature' | 'businessRule' | 'testScenario'
): string {
  switch (docType) {
    case 'epic':
      return getEpicPrompt();
    case 'feature':
      return getFeaturePrompt();
    case 'businessRule':
      return getBusinessRulePrompt();
    case 'testScenario':
      return getTestScenarioPrompt();
    default:
      throw new Error(`Unknown docType: ${docType}`);
  }
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

