/**
 * Cloud LLM Client (OpenAI/ChatGPT)
 * 
 * Wrappar befintlig OpenAI-integration för att implementera LlmClient-interface.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
} from 'openai/resources/index.mjs';
import type { LlmClient } from '../llmClientAbstraction';

const USE_LLM =
  String(import.meta.env.VITE_USE_LLM ?? '').trim().toLowerCase() === 'true';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODE = import.meta.env.MODE;
const ALLOW_LLM_IN_TESTS =
  String(import.meta.env.VITE_ALLOW_LLM_IN_TESTS ?? '')
    .trim()
    .toLowerCase() === 'true';

const FULL_MODEL = 'gpt-4o';
const IS_BROWSER = typeof window !== 'undefined';

// Normalfall: LLM är aktiverat i dev/prod när VITE_USE_LLM=true och vi har API-nyckel.
// I tester är LLM som standard AV, men kan explicit slås på via VITE_ALLOW_LLM_IN_TESTS=true
// för utvalda e2e-scenarion.
const shouldEnableLlm =
  USE_LLM && !!API_KEY && (MODE !== 'test' || ALLOW_LLM_IN_TESTS);

let openAiClient: OpenAI | null = null;

if (shouldEnableLlm) {
  openAiClient = new OpenAI({
    apiKey: API_KEY,
    ...(IS_BROWSER ? { dangerouslyAllowBrowser: true } : {}),
  });
}

/**
 * Error som kastas när OpenAI-kontot är inaktivt eller har billing-problem.
 * Detta stoppar alla ytterligare anrop för att undvika onödiga kostnader.
 */
export class CloudLlmAccountInactiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudLlmAccountInactiveError';
  }
}

/**
 * Error som kastas vid rate limiting (429).
 * Kan vara tillfälligt eller permanent beroende på orsak.
 */
export class CloudLlmRateLimitError extends Error {
  readonly isPermanent: boolean;
  readonly retryAfter?: number;

  constructor(message: string, isPermanent: boolean = false, retryAfter?: number) {
    super(message);
    this.name = 'CloudLlmRateLimitError';
    this.isPermanent = isPermanent;
    this.retryAfter = retryAfter;
  }
}

// Global flagga för att stoppa alla anrop när kontot är inaktivt
let accountInactive = false;

export function isCloudLlmAccountInactive(): boolean {
  return accountInactive;
}

export function resetCloudLlmAccountStatus(): void {
  accountInactive = false;
}

export class CloudLlmClient implements LlmClient {
  readonly modelName = FULL_MODEL;
  readonly provider: 'cloud' = 'cloud';

  async generateText(args: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: { type: 'json_schema'; json_schema: any };
  }): Promise<string | null> {
    if (!shouldEnableLlm || !openAiClient) return null;

    // Stoppa alla anrop om kontot är inaktivt
    if (accountInactive) {
      console.warn('[Cloud LLM] Account is inactive - skipping request to avoid costs');
      throw new CloudLlmAccountInactiveError('OpenAI account is inactive. Please check billing details.');
    }

    const messages: ChatCompletionMessageParam[] = [];
    if (args.systemPrompt) {
      messages.push({ role: 'system', content: args.systemPrompt });
    }
    messages.push({ role: 'user', content: args.userPrompt });

    const responseFormat: ChatCompletionCreateParams.ResponseFormat | undefined =
      args.responseFormat
        ? {
            type: 'json_schema',
            json_schema: {
              name: args.responseFormat.json_schema.name || 'ResponseSchema',
              strict: args.responseFormat.json_schema.strict ?? true,
              schema: args.responseFormat.json_schema.schema,
            },
          }
        : undefined;

    try {
      const response = await openAiClient.chat.completions.create({
        model: this.modelName,
        temperature: args.temperature ?? 0.35,
        max_tokens: args.maxTokens ?? 1800,
        messages,
        response_format: responseFormat,
      });

      return response.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (error: any) {
      // Hantera 429 Rate Limit fel
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        const errorMessage = error?.message || error?.error?.message || 'Rate limit exceeded';
        
        // Kontrollera om det är ett permanent fel (t.ex. inaktivt konto)
        const isAccountInactive = 
          errorMessage.toLowerCase().includes('account is not active') ||
          errorMessage.toLowerCase().includes('billing') ||
          errorMessage.toLowerCase().includes('payment');
        
        if (isAccountInactive) {
          accountInactive = true;
          console.error('[Cloud LLM] Account is inactive - stopping all future requests');
          throw new CloudLlmAccountInactiveError(
            `OpenAI account is inactive: ${errorMessage}. Please check billing details on https://platform.openai.com/account/billing`
          );
        }
        
        // Tillfällig rate limit
        const retryAfter = error?.headers?.['retry-after'] || error?.retryAfter;
        throw new CloudLlmRateLimitError(
          `Rate limit exceeded: ${errorMessage}`,
          false,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }
      
      // Hantera andra fel
      console.error('Cloud LLM generation error:', error);
      return null;
    }
  }
}

export const cloudLlmClientInstance = new CloudLlmClient();
