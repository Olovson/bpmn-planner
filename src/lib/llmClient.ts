/**
 * Legacy LLM Client API (bakåtkompatibilitet)
 * 
 * Detta modul behåller den gamla API:en för bakåtkompatibilitet.
 * Ny kod bör använda llmClients/index.ts och getLlmClient() direkt.
 */

import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
} from 'openai/resources/index.mjs';
import { getLlmClient, getDefaultLlmProvider } from './llmClients';
import type { LlmProvider } from './llmClientAbstraction';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';

const USE_LLM =
  String(import.meta.env.VITE_USE_LLM ?? '').trim().toLowerCase() === 'true';
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODE = import.meta.env.MODE;
const ALLOW_LLM_IN_TESTS =
  String(import.meta.env.VITE_ALLOW_LLM_IN_TESTS ?? '')
    .trim()
    .toLowerCase() === 'true';

// Normalfall: LLM är aktiverat i dev/prod när VITE_USE_LLM=true och vi har API-nyckel.
// I tester är LLM som standard AV, men kan explicit slås på via VITE_ALLOW_LLM_IN_TESTS=true
// för utvalda e2e-scenarion.
const shouldEnableLlm =
  USE_LLM && !!API_KEY && (MODE !== 'test' || ALLOW_LLM_IN_TESTS);

export const isLlmEnabled = (): boolean => shouldEnableLlm;

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: 'slow';
  responseFormat?: ChatCompletionCreateParams.ResponseFormat;
}

/**
 * Legacy funktion för att generera chat completion.
 * Använder standard-provider (cloud som default).
 * 
 * @deprecated Använd getLlmClient() direkt för bättre kontroll över provider.
 */
export async function generateChatCompletion(
  messages: ChatCompletionMessageParam[],
  options: CompletionOptions = {},
  provider?: LlmProvider
): Promise<string | null> {
  if (!isLlmEnabled()) return null;

  const effectiveProvider = provider || getDefaultLlmProvider();
  const llmClient = getLlmClient(effectiveProvider);

  const systemPrompt = messages.find((m) => m.role === 'system')?.content;
  const userPrompt =
    messages.find((m) => m.role === 'user')?.content || messages[0]?.content || '';

  if (!userPrompt) return null;

  const responseFormat =
    options.responseFormat?.type === 'json_schema'
      ? {
          type: 'json_schema' as const,
          json_schema: (options.responseFormat as any).json_schema,
        }
      : undefined;

  try {
    return await llmClient.generateText({
      systemPrompt,
      userPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      responseFormat,
    });
  } catch (error) {
    // Hantera LocalLlmUnavailableError gracefully - returnera null istället för att krascha
    if (error instanceof LocalLlmUnavailableError) {
      console.warn('Local LLM unavailable, returning null:', error.message);
      return null;
    }
    // För andra fel, kasta vidare
    throw error;
  }
}
