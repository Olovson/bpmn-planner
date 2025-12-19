/**
 * LLM Fallback Strategy
 * 
 * Hanterar fallback från local till cloud när local LLM failar.
 */

import type { LlmProvider } from './llmClientAbstraction';
import type { DocType } from './llmProfiles';
import { getLlmClient } from './llmClients';
import { getLlmProfile, getTokenWarningThresholdForProvider } from './llmProfiles';
import {
  getFeaturePrompt,
  getEpicPrompt,
  getBusinessRulePrompt,
  getTestscriptPrompt,
  buildSystemPrompt,
} from './promptLoader';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
import { 
  CloudLlmAccountInactiveError, 
  CloudLlmRateLimitError,
  isCloudLlmAccountInactive 
} from './llmClients/cloudLlmClient';
import type { LlmResolution } from './llmProviderResolver';
import { estimatePromptTokens } from './tokenUtils';
import { getProviderLabel, logLlmEvent } from './llmLogging';

const FALLBACK_TO_CLOUD_ENABLED =
  String(import.meta.env.VITE_LLM_FALLBACK_TO_CLOUD_ON_LOCAL_ERROR ?? 'true')
    .trim()
    .toLowerCase() === 'true';

const FALLBACK_TO_LOCAL_ENABLED =
  String(import.meta.env.VITE_LLM_FALLBACK_TO_LOCAL_ON_CLOUD_ERROR ?? 'true')
    .trim()
    .toLowerCase() === 'true';

export interface GenerateWithFallbackOptions {
  docType: DocType;
  resolution: LlmResolution;
  systemPrompt: string;
  userPrompt: string;
  validateResponse?: (response: string) => { valid: boolean; errors: string[] };
  responseFormat?: { type: 'json_schema'; json_schema: any };
}

export interface GenerateWithFallbackResult {
  text: string;
  provider: LlmProvider;
  fallbackUsed: boolean;
  attemptedProviders: LlmProvider[];
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
 * Genererar text med LLM med automatisk fallback från local till cloud.
 * 
 * Beteende:
 * 1. Försök med chosen provider från resolution
 * 2. Om chosen === 'local' och anropet failar eller validering failar:
 *    - Om fallback är tillåten → försök med cloud
 *    - Annars → kasta fel
 * 3. Returnera resultat med information om vilken provider som faktiskt användes
 */
export async function generateWithFallback(
  options: GenerateWithFallbackOptions
): Promise<GenerateWithFallbackResult> {
  const { docType, resolution, systemPrompt, userPrompt, validateResponse } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;
  let lastResponse: string | null = null;

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

  try {
    // Försök med chosen provider först
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
      fallbackUsed: false,
      attemptedProviders: [chosenProvider],
      latencyMs,
    };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    lastResponse = null;

    // Försök med alternativ provider om fallback är aktiverad och möjlig
    const chosenProvider = resolution.chosen;
    const alternativeProvider =
      resolution.attempted.find((p) => p !== chosenProvider) ?? null;

    const shouldFallbackToCloud =
      chosenProvider === 'local' &&
      alternativeProvider === 'cloud' &&
      FALLBACK_TO_CLOUD_ENABLED;

    const shouldFallbackToLocal =
      chosenProvider === 'cloud' &&
      alternativeProvider === 'local' &&
      FALLBACK_TO_LOCAL_ENABLED;

    if (alternativeProvider && (shouldFallbackToCloud || shouldFallbackToLocal)) {
      // Om vi försöker fallback till cloud men kontot är inaktivt, hoppa över
      if (alternativeProvider === 'cloud' && isCloudLlmAccountInactive()) {
        throw new CloudLlmAccountInactiveError(
          'Cannot fallback to cloud: account is inactive. ' +
          'Please check billing details on https://console.anthropic.com/settings/billing'
        );
      }

      try {
        const altClient = getLlmClient(alternativeProvider);
        const altProfile = getLlmProfile(docType, alternativeProvider);
        const altSystemPrompt = buildSystemPrompt(systemPrompt, altProfile.extraSystemPrefix);

        // Local LLM (Ollama) stödjer inte json_schema direkt, så ta bort responseFormat vid fallback till local
        // Cloud LLM stödjer json_schema, så behåll responseFormat vid fallback till cloud
        const shouldIncludeResponseFormat = 
          alternativeProvider === 'cloud' && options.responseFormat;

        const altResponse = await altClient.generateText({
          systemPrompt: altSystemPrompt,
          userPrompt,
          maxTokens: altProfile.maxTokens,
          temperature: altProfile.temperature,
          ...(shouldIncludeResponseFormat ? { responseFormat: options.responseFormat } : {}),
        });

        if (!altResponse) {
          throw new Error(`${alternativeProvider} LLM returned null response`);
        }

        if (validateResponse) {
          const validation = validateResponse(altResponse);
          if (!validation.valid) {
            throw new LlmValidationError(
              `${alternativeProvider} validation failed: ${validation.errors.join(', ')}`,
              alternativeProvider,
              altResponse,
              validation.errors
            );
          }
        }

        const latencyMs = Date.now() - startTime;
        return {
          text: altResponse,
          provider: alternativeProvider,
          fallbackUsed: true,
          attemptedProviders:
            chosenProvider === alternativeProvider
              ? [chosenProvider]
              : [chosenProvider, alternativeProvider],
          latencyMs,
        };
      } catch (altError) {
        // Både first och alternativ provider failade
        throw new Error(
          `Both ${chosenProvider} and ${alternativeProvider} LLM failed. ` +
            `${chosenProvider}: ${lastError?.message ?? 'unknown error'}, ` +
            `${alternativeProvider}: ${altError instanceof Error ? altError.message : String(altError)}`
        );
      }
    }

    // Ingen fallback eller fallback inte tillåten → kasta originalfel
    throw lastError;
  }
}
