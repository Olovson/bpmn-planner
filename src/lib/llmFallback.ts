/**
 * LLM Fallback Strategy
 * 
 * Hanterar fallback från local till cloud när local LLM failar.
 */

import type { LlmProvider } from './llmClientAbstraction';
import type { DocType } from './llmProfiles';
import { getLlmClient } from './llmClients';
import { getLlmProfile } from './llmProfiles';
import {
  getFeaturePrompt,
  getEpicPrompt,
  getBusinessRulePrompt,
  getTestscriptPrompt,
  buildSystemPrompt,
} from './promptLoader';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
import type { LlmResolution } from './llmProviderResolver';

const FALLBACK_TO_CLOUD_ENABLED =
  String(import.meta.env.VITE_LLM_FALLBACK_TO_CLOUD_ON_LOCAL_ERROR ?? 'true')
    .trim()
    .toLowerCase() === 'true';

export interface GenerateWithFallbackOptions {
  docType: DocType;
  resolution: LlmResolution;
  systemPrompt: string;
  userPrompt: string;
  validateResponse?: (response: string) => { valid: boolean; errors: string[] };
}

export interface GenerateWithFallbackResult {
  text: string;
  provider: LlmProvider;
  fallbackUsed: boolean;
  attemptedProviders: LlmProvider[];
  latencyMs: number;
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

  // Försök med chosen provider först
  const chosenProvider = resolution.chosen;
  const llmClient = getLlmClient(chosenProvider);
  const profile = getLlmProfile(docType, chosenProvider);

  try {
    const fullSystemPrompt = buildSystemPrompt(systemPrompt, profile.extraSystemPrefix);
    const response = await llmClient.generateText({
      systemPrompt: fullSystemPrompt,
      userPrompt,
      maxTokens: profile.maxTokens,
      temperature: profile.temperature,
    });

    if (!response) {
      throw new Error('LLM returned null response');
    }

    // Validera response om validering är konfigurerad
    if (validateResponse) {
      const validation = validateResponse(response);
      if (!validation.valid) {
        throw new Error(
          `Validation failed: ${validation.errors.join(', ')}`
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

    // Om chosen är local och fallback är tillåten, försök med cloud
    if (
      chosenProvider === 'local' &&
      FALLBACK_TO_CLOUD_ENABLED &&
      resolution.attempted.includes('cloud')
    ) {
      try {
        const cloudClient = getLlmClient('cloud');
        const cloudProfile = getLlmProfile(docType, 'cloud');
        const cloudSystemPrompt = buildSystemPrompt(systemPrompt, cloudProfile.extraSystemPrefix);

        const cloudResponse = await cloudClient.generateText({
          systemPrompt: cloudSystemPrompt,
          userPrompt,
          maxTokens: cloudProfile.maxTokens,
          temperature: cloudProfile.temperature,
        });

        if (!cloudResponse) {
          throw new Error('Cloud LLM returned null response');
        }

        // Validera cloud response
        if (validateResponse) {
          const validation = validateResponse(cloudResponse);
          if (!validation.valid) {
            throw new Error(
              `Cloud validation failed: ${validation.errors.join(', ')}`
            );
          }
        }

        const latencyMs = Date.now() - startTime;
        return {
          text: cloudResponse,
          provider: 'cloud',
          fallbackUsed: true,
          attemptedProviders: ['local', 'cloud'],
          latencyMs,
        };
      } catch (cloudError) {
        // Både local och cloud failade
        throw new Error(
          `Both local and cloud LLM failed. Local: ${lastError.message}, Cloud: ${cloudError instanceof Error ? cloudError.message : String(cloudError)}`
        );
      }
    }

    // Ingen fallback eller fallback inte tillåten → kasta originalfel
    throw lastError;
  }
}

