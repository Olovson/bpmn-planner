/**
 * LLM Fallback Strategy
 * 
 * Hanterar LLM-generering med provider-fallback (för närvarande INAKTIVERAT).
 * 
 * VIKTIGT: 
 * - Detta är ENDAST för LLM-generering (useLlm = true).
 * - I local mode (useLlm = false) ska INTE LLM anropas alls - använd template-fallback istället.
 * - Provider-fallback (local ↔ cloud) är INAKTIVERAT för tillfället för enklare debugging.
 * - Om LLM misslyckas, använd template-fallback direkt istället för att försöka med annan provider.
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

// OBS: LLM provider-fallback är INAKTIVERAT för tillfället.
// Om LLM misslyckas, använd template-fallback direkt istället.
// Detta gör det lättare att debugga LLM-problem utan att förvirra med fallback-mellan-providers.
// 
// Deprecated - inte längre använd:
// const FALLBACK_TO_CLOUD_ENABLED = ... (always false)
// const FALLBACK_TO_LOCAL_ENABLED = ... (always false)

export interface GenerateWithFallbackOptions {
  docType: DocType;
  resolution: LlmResolution;
  systemPrompt: string;
  userPrompt: string;
  validateResponse?: (response: string) => { valid: boolean; errors: string[] };
  responseFormat?: { type: 'json_schema'; json_schema: any };
  abortSignal?: AbortSignal;
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

    // VIKTIGT: Ingen LLM provider-fallback för tillfället.
    // Om LLM misslyckas, använd template-fallback direkt istället.
    // Detta gör det lättare att debugga LLM-problem utan att förvirra med fallback-mellan-providers.
    //
    // OBS: Detta gäller ENDAST när useLlm = true (LLM-läge).
    // I local mode (useLlm = false) anropas INTE LLM alls - använd template-fallback direkt.
    //
    // Om local fallback ska aktiveras igen i framtiden:
    // - shouldFallbackToLocal = true betyder: cloud LLM → local LLM fallback (när useLlm = true)
    // - Detta är INTE samma sak som "local mode" (useLlm = false) som inte använder LLM alls
    const shouldFallbackToCloud = false; // ALDRIG fallback från local LLM till cloud LLM (när useLlm = true)
    const shouldFallbackToLocal = false; // ALDRIG fallback från cloud LLM till local LLM (när useLlm = true)

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
          abortSignal: options.abortSignal,
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
