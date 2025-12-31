/**
 * LLM Text Generation
 * 
 * Wrapper för LLM-anrop med validering och error handling.
 * 
 * VIKTIGT: 
 * - Detta är ENDAST för LLM-generering (useLlm = true).
 * - I local mode (useLlm = false) ska INTE LLM anropas alls - använd template-fallback istället.
 * - Om LLM misslyckas, använd template-fallback direkt.
 */

import type { LlmProvider } from './llmClientAbstraction';
import type { DocType } from './llmProfiles';
import { getLlmClient } from './llmClients';
import { getLlmProfile, getTokenWarningThresholdForProvider } from './llmProfiles';
import { buildSystemPrompt } from './promptLoader';
import type { LlmResolution } from './llmProviderResolver';
import { estimatePromptTokens } from './tokenUtils';
import { getProviderLabel, logLlmEvent } from './llmLogging';

export interface GenerateLlmTextOptions {
  docType: DocType;
  resolution: LlmResolution;
  systemPrompt: string;
  userPrompt: string;
  validateResponse?: (response: string) => { valid: boolean; errors: string[] };
  responseFormat?: { type: 'json_schema'; json_schema: any };
  abortSignal?: AbortSignal;
}

export interface GenerateLlmTextResult {
  text: string;
  provider: LlmProvider;
  latencyMs: number;
}

export class LlmValidationError extends Error {
  readonly provider: LlmProvider;
  readonly rawResponse: string;
  readonly validationErrors: string[];

  constructor(message: string, provider: LlmProvider, rawResponse: string, validationErrors: string[]) {
    super(message);
    this.name = 'LlmValidationError';
    this.provider = provider;
    this.rawResponse = rawResponse;
    this.validationErrors = validationErrors;
  }
}

/**
 * Genererar text med LLM med validering.
 * 
 * Beteende:
 * 1. Anropar LLM med vald provider från resolution
 * 2. Validerar response om validateResponse är konfigurerad
 * 3. Returnerar resultat eller kastar fel om det misslyckas
 */
export async function generateLlmText(
  options: GenerateLlmTextOptions
): Promise<GenerateLlmTextResult> {
  const { docType, resolution, systemPrompt, userPrompt, validateResponse } = options;

  const startTime = Date.now();

  // Tokenbudget-varning (approx) för vald provider/docType
  try {
    const chosenProvider = resolution.chosen;
    const profile = getLlmProfile(docType, chosenProvider);
    const estimatedTokens = estimatePromptTokens(systemPrompt, userPrompt);
    const maxTokens = profile.maxTokens;
    const warningFactor = getTokenWarningThresholdForProvider(chosenProvider);
    const warningLimit = maxTokens * warningFactor;
    if (estimatedTokens > warningLimit) {
      const providerLabel = getProviderLabel(chosenProvider, false);
      console.warn(
        `[LLM WARNING] token budget risk for ${docType}/${providerLabel}: ` +
          `estimated=${estimatedTokens}, max=${maxTokens}, threshold=${warningFactor}`,
      );
      logLlmEvent({
        eventType: 'TOKEN_WARNING',
        docType,
        attemptedProviders: resolution.attempted,
        finalProvider: chosenProvider,
        fallbackUsed: false,
        success: true,
        validationOk: undefined,
        latencyMs: undefined,
        estimatedTokens,
        maxTokens,
        warningFactor,
      });
    }
  } catch {
    // Token-estimat får aldrig stoppa anropet
  }

  // Anropa LLM med vald provider
  const chosenProvider = resolution.chosen;
  const llmClient = getLlmClient(chosenProvider);
  const profile = getLlmProfile(docType, chosenProvider);

  const fullSystemPrompt = buildSystemPrompt(systemPrompt, profile.extraSystemPrefix);
  const response = await llmClient.generateText({
    systemPrompt: fullSystemPrompt,
    userPrompt,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    responseFormat: options.responseFormat,
    abortSignal: options.abortSignal,
  });

  if (!response) {
    throw new Error('LLM returned null response');
  }

  // Validera response om validering är konfigurerad
  if (validateResponse) {
    const validation = validateResponse(response);
    if (!validation.valid) {
      throw new LlmValidationError(
        `Validation failed: ${validation.errors.join(', ')}`,
        chosenProvider,
        response,
        validation.errors
      );
    }
  }

  const latencyMs = Date.now() - startTime;
  return {
    text: response,
    provider: chosenProvider,
    latencyMs,
  };
}

// Backward compatibility: export old name as alias
// OBS: Denna wrapper lägger till fallbackUsed och attemptedProviders för backward compatibility
export async function generateWithFallback(
  options: GenerateLlmTextOptions
): Promise<GenerateLlmTextResult & { fallbackUsed: boolean; attemptedProviders: LlmProvider[] }> {
  const result = await generateLlmText(options);
  return {
    ...result,
    fallbackUsed: false, // Alltid false - ingen fallback längre
    attemptedProviders: [result.provider],
  };
}

export type GenerateWithFallbackOptions = GenerateLlmTextOptions;
export type GenerateWithFallbackResult = GenerateLlmTextResult & {
  fallbackUsed: boolean;
  attemptedProviders: LlmProvider[];
};
