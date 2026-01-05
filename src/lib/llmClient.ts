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

// Stöd både Vite (import.meta.env) och Node/skript (process.env)
const VITE_ENV: Record<string, any> =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env as Record<string, any>)
    : {};

const NODE_ENV: Record<string, any> =
  typeof process !== 'undefined' && (process as any).env
    ? ((process as any).env as Record<string, any>)
    : {};

const USE_LLM =
  String(
    VITE_ENV.VITE_USE_LLM ?? NODE_ENV.VITE_USE_LLM ?? '',
  )
    .trim()
    .toLowerCase() === 'true';

const API_KEY: string | undefined =
  (VITE_ENV.VITE_ANTHROPIC_API_KEY as string | undefined) ??
  (NODE_ENV.VITE_ANTHROPIC_API_KEY as string | undefined);

const MODE: string =
  (VITE_ENV.MODE as string | undefined) ??
  (NODE_ENV.MODE as string | undefined) ??
  (NODE_ENV.NODE_ENV as string | undefined) ??
  'development';

const ALLOW_LLM_IN_TESTS =
  String(
    VITE_ENV.VITE_ALLOW_LLM_IN_TESTS ??
      NODE_ENV.VITE_ALLOW_LLM_IN_TESTS ??
      '',
  )
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
