/**
 * Cloud LLM Client (Claude/Anthropic)
 * 
 * Wrappar Anthropic Claude-integration för att implementera LlmClient-interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient } from '../llmClientAbstraction';
import { waitIfNeeded, recordRequest } from './rateLimiter';

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
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
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
    // Viktigt: json_schema får bara innehålla name, strict, och schema - inga extra fält
    // OBS: response_format objektet på toppnivån får bara innehålla type och json_schema
    let cleanJsonSchema: { name: string; strict: boolean; schema: any } | undefined = undefined;
    
    if (args.responseFormat) {
      const inputSchema = args.responseFormat.json_schema;
      
      // Extrahera bara de tillåtna fälten - Claude accepterar bara name, strict, schema
      // Om inputSchema innehåller extra fält, ignorera dem
      // Skapa ett helt nytt objekt för att säkerställa inga extra fält
      cleanJsonSchema = {
        name: String(inputSchema?.name || ''),
        strict: Boolean(inputSchema?.strict ?? true),
        schema: inputSchema?.schema || {},
      };
      
      // Debug: logga vad vi skickar (endast i dev)
      if (import.meta.env.DEV) {
        console.log('[Cloud LLM] cleanJsonSchema keys:', Object.keys(cleanJsonSchema));
        console.log('[Cloud LLM] cleanJsonSchema structure:', JSON.stringify(cleanJsonSchema, null, 2));
      }
    }

    try {
      // Bygg request-objektet som ett helt nytt objekt för att undvika extra fält från SDK-typer
      // Skapa ett minimalt objekt med bara de fält som behövs
      const requestBody: any = {
        model: this.modelName,
        temperature: args.temperature ?? 0.35,
        max_tokens: args.maxTokens ?? 1800,
        messages,
      };
      
      // Lägg till system prompt om det finns
      if (args.systemPrompt) {
        requestBody.system = args.systemPrompt;
      }
      
      // OBS: response_format används INTE - Claude returnerar JSON i texten istället
      // Den robusta JSON-parsingen i llmDocumentation.ts hanterar detta
      // Detta undviker "Extra inputs are not permitted" fel från API:et
      
      // Debug: logga vad som skickas
      if (import.meta.env.DEV) {
        console.log('[Cloud LLM] Request body keys:', Object.keys(requestBody));
        if (cleanJsonSchema) {
          console.log('[Cloud LLM] JSON schema requested (men används INTE i response_format - Claude får instruktioner i prompten istället)');
        }
      }
      
      // Rate limiting: vänta om nödvändigt för att undvika rate limits
      // Uppskatta output tokens baserat på max_tokens (Claude kan använda upp till max_tokens)
      const estimatedOutputTokens = requestBody.max_tokens;
      await waitIfNeeded(estimatedOutputTokens);
      
      // Använd SDK:ets create-metod - INGEN response_format
      const response = await anthropicClient.messages.create({
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
        messages: requestBody.messages,
        ...(requestBody.system && { system: requestBody.system }),
      } as Anthropic.MessageCreateParams);

      // Registrera request för rate limiting
      const actualOutputTokens = response.usage?.output_tokens || estimatedOutputTokens;
      recordRequest(actualOutputTokens);

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
      
      // Hantera response_format-fel specifikt
      if (error?.status === 400 && error?.error?.message?.includes('response_format')) {
        const errorMessage = error?.error?.message || 'Invalid response_format';
        console.error('[Cloud LLM] response_format error:', errorMessage);
        // Kasta fel istället för att returnera null, så att fallback kan hantera det korrekt
        throw new Error(`Cloud LLM response_format error: ${errorMessage}`);
      }
      
      // Hantera andra fel
      console.error('Cloud LLM generation error:', error);
      return null;
    }
  }
}

export const cloudLlmClientInstance = new CloudLlmClient();
