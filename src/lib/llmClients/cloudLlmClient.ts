/**
 * Cloud LLM Client (Claude/Anthropic)
 * 
 * Wrappar Anthropic Claude-integration för att implementera LlmClient-interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient } from '../llmClientAbstraction';

const USE_LLM =
  String(import.meta.env.VITE_USE_LLM ?? '').trim().toLowerCase() === 'true';
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODE = import.meta.env.MODE;
const ALLOW_LLM_IN_TESTS =
  String(import.meta.env.VITE_ALLOW_LLM_IN_TESTS ?? '')
    .trim()
    .toLowerCase() === 'true';

const FULL_MODEL = 'claude-sonnet-4-20250514'; // Claude Sonnet 4.5
const IS_BROWSER = typeof window !== 'undefined';

// Normalfall: LLM är aktiverat i dev/prod när VITE_USE_LLM=true och vi har API-nyckel.
// I tester är LLM som standard AV, men kan explicit slås på via VITE_ALLOW_LLM_IN_TESTS=true
// för utvalda e2e-scenarion.
const shouldEnableLlm =
  USE_LLM && !!API_KEY && (MODE !== 'test' || ALLOW_LLM_IN_TESTS);

let anthropicClient: Anthropic | null = null;

if (shouldEnableLlm) {
  anthropicClient = new Anthropic({
    apiKey: API_KEY,
    ...(IS_BROWSER ? { dangerouslyAllowBrowser: true } : {}),
  });
}

/**
 * Error som kastas när Claude-kontot är inaktivt eller har billing-problem.
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
    if (!shouldEnableLlm || !anthropicClient) return null;

    // Stoppa alla anrop om kontot är inaktivt
    if (accountInactive) {
      console.warn('[Cloud LLM] Account is inactive - skipping request to avoid costs');
      throw new CloudLlmAccountInactiveError('Claude account is inactive. Please check billing details.');
    }

    // Claude använder system message som separat parameter
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: args.userPrompt }
    ];

    // Claude stödjer structured outputs via response_format
    // Format: { type: 'json_schema', json_schema: { name, strict, schema } }
    const responseFormat: Anthropic.MessageCreateParams.ResponseFormat | undefined =
      args.responseFormat
        ? {
            type: 'json_schema',
            json_schema: args.responseFormat.json_schema,
          }
        : undefined;

    try {
      const response = await anthropicClient.messages.create({
        model: this.modelName,
        temperature: args.temperature ?? 0.35,
        max_tokens: args.maxTokens ?? 1800,
        system: args.systemPrompt,
        messages,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      });

      // Claude returnerar content som en array, första elementet är text
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
      return null;
    } catch (error: any) {
      // Hantera 429 Rate Limit fel
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        const errorMessage = error?.message || error?.error?.message || 'Rate limit exceeded';
        
        // Kontrollera om det är ett permanent fel (t.ex. inaktivt konto)
        const isAccountInactive = 
          errorMessage.toLowerCase().includes('account is not active') ||
          errorMessage.toLowerCase().includes('billing') ||
          errorMessage.toLowerCase().includes('payment') ||
          errorMessage.toLowerCase().includes('authentication') ||
          errorMessage.toLowerCase().includes('invalid api key');
        
        if (isAccountInactive) {
          accountInactive = true;
          console.error('[Cloud LLM] Account is inactive - stopping all future requests');
          throw new CloudLlmAccountInactiveError(
            `Claude account is inactive: ${errorMessage}. Please check billing details on https://console.anthropic.com/settings/billing`
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
