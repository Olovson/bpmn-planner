/**
 * Cloud LLM Client (Claude/Anthropic)
 * 
 * Wrappar Anthropic Claude-integration för att implementera LlmClient-interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient } from '../llmClientAbstraction';
import { waitIfNeeded, recordRequest } from './rateLimiter';

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

const FULL_MODEL = 'claude-sonnet-4-5-20250929'; // Claude Sonnet 4.5 (stödjer structured outputs)
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
    abortSignal?: AbortSignal;
  }): Promise<string | null> {
    if (!shouldEnableLlm || !anthropicClient) return null;

    // Kontrollera om användaren har avbrutit INNAN vi gör API-anropet
    // (Cloud LLM SDK stödjer inte AbortController direkt, så vi kan bara kontrollera före anropet)
    if (args.abortSignal?.aborted) {
      throw new Error('Avbrutet av användaren');
    }

    // Stoppa alla anrop om kontot är inaktivt
    if (accountInactive) {
      console.warn('[Cloud LLM] Account is inactive - skipping request to avoid costs');
      throw new CloudLlmAccountInactiveError('Claude account is inactive. Please check billing details.');
    }

    // Claude använder system message som separat parameter
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: args.userPrompt }
    ];

    // Claude stödjer structured outputs via output_format
    // Format: { type: 'json_schema', schema: <schema> }
    // OBS: output_format använder schema direkt, INTE json_schema med name/strict
    let cleanJsonSchema: { name: string; strict: boolean; schema: any } | undefined = undefined;
    
    if (args.responseFormat) {
      const inputSchema = args.responseFormat.json_schema;
      
      // Extrahera bara de tillåtna fälten - Claude accepterar bara name, strict, schema
      // Om inputSchema innehåller extra fält, ignorera dem
      // Skapa ett helt nytt objekt för att säkerställa inga extra fält
      // Viktigt: Vi måste också säkerställa att schema-objektet inte innehåller extra fält
      // genom att skapa en deep copy av bara de fält som behövs
      const inputName = inputSchema?.name;
      const inputStrict = inputSchema?.strict;
      const inputSchemaObj = inputSchema?.schema;
      
      // Skapa ett helt nytt objekt med bara de tre tillåtna fälten
      cleanJsonSchema = {
        name: String(inputName || ''),
        strict: Boolean(inputStrict ?? true),
        // Schema-objektet kopieras som det är - det är JSON Schema-formatet som Claude förväntar sig
        schema: inputSchemaObj ? JSON.parse(JSON.stringify(inputSchemaObj)) : {},
      };
      
      // Debug: logga vad vi skickar (endast i dev)
      if (import.meta.env.DEV) {
        console.log('[Cloud LLM] cleanJsonSchema keys:', Object.keys(cleanJsonSchema));
        console.log('[Cloud LLM] cleanJsonSchema structure:', JSON.stringify(cleanJsonSchema, null, 2));
        // Verifiera att det inte finns extra fält
        const extraKeys = Object.keys(cleanJsonSchema).filter(k => !['name', 'strict', 'schema'].includes(k));
        if (extraKeys.length > 0) {
          console.warn('[Cloud LLM] WARNING: Extra keys found in cleanJsonSchema:', extraKeys);
        }
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
      
      // Lägg till output_format om JSON schema finns
      // Claude stödjer structured outputs via output_format med beta-header
      // Strukturen: { type: 'json_schema', schema: <schema> } - INTE json_schema wrapper
      if (cleanJsonSchema) {
        // Skapa ett helt nytt objekt för att säkerställa inga extra fält
        const cleanSchema = cleanJsonSchema.schema ? JSON.parse(JSON.stringify(cleanJsonSchema.schema)) : {};
        requestBody.output_format = {
          type: 'json_schema',
          schema: cleanSchema, // Schema direkt - INTE json_schema wrapper
        };
        
        // Debug: verifiera att output_format bara innehåller tillåtna fält
        if (import.meta.env.DEV) {
          const outputFormatKeys = Object.keys(requestBody.output_format);
          const allowedKeys = ['type', 'schema'];
          const extraKeys = outputFormatKeys.filter(k => !allowedKeys.includes(k));
          if (extraKeys.length > 0) {
            console.warn('[Cloud LLM] WARNING: Extra keys in output_format:', extraKeys);
          }
        }
      }
      
      // Debug: logga vad som skickas
      if (import.meta.env.DEV) {
        console.log('[Cloud LLM] Request body keys:', Object.keys(requestBody));
        if (cleanJsonSchema) {
          console.log('[Cloud LLM] Using structured outputs with JSON schema:', cleanJsonSchema.name);
        }
      }
      
      // Rate limiting: vänta om nödvändigt för att undvika rate limits
      // Uppskatta output tokens baserat på max_tokens (Claude kan använda upp till max_tokens)
      const estimatedOutputTokens = requestBody.max_tokens;
      await waitIfNeeded(estimatedOutputTokens);
      
      // Skapa ett minimalt objekt med bara de fält som behövs
      // Använd samma struktur som fungerar i testerna
      const createParams: any = {
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
        messages: requestBody.messages,
      };
      
      if (requestBody.system) {
        createParams.system = requestBody.system;
      }
      
      // Lägg till output_format om JSON schema finns
      // Strukturen enligt dokumentation: { type: 'json_schema', schema: <schema> }
      // INTE json_schema wrapper - bara schema direkt
      if (cleanJsonSchema) {
        // Skapa schema-objektet först genom att serialisera och deserialisera
        const cleanSchema = cleanJsonSchema.schema ? JSON.parse(JSON.stringify(cleanJsonSchema.schema)) : {};
        
        // Skapa output_format direkt som literal utan mellanliggande variabler
        // Detta förhindrar att SDK:et eller TypeScript lägger till extra fält
        createParams.output_format = {
          type: 'json_schema',
          schema: cleanSchema, // Schema direkt - INTE json_schema wrapper
        };
        
        // Debug: Verifiera exakt struktur INNAN SDK-anrop
        if (import.meta.env.DEV) {
          const serialized = JSON.stringify(createParams.output_format);
          const parsed = JSON.parse(serialized);
          console.log('[Cloud LLM] Final output_format (serialized):', serialized);
          console.log('[Cloud LLM] Final output_format keys:', Object.keys(parsed));
          
          // Kontrollera om det finns några enumerable properties som inte syns
          const allKeys: string[] = [];
          for (const key in parsed) {
            allKeys.push(key);
          }
          if (allKeys.length !== Object.keys(parsed).length) {
            console.warn('[Cloud LLM] WARNING: Non-enumerable properties found in output_format');
          }
          
          // Kontrollera om det finns några extra fält i createParams
          const createParamsKeys = Object.keys(createParams);
          const allowedCreateParamsKeys = ['model', 'max_tokens', 'temperature', 'messages', 'system', 'output_format'];
          console.log('[Cloud LLM] Final output_format structure:', JSON.stringify(createParams.output_format, null, 2));
          const extraCreateParamsKeys = createParamsKeys.filter(k => !allowedCreateParamsKeys.includes(k));
          if (extraCreateParamsKeys.length > 0) {
            console.warn('[Cloud LLM] WARNING: Extra keys in createParams:', extraCreateParamsKeys);
          }
        }
      }
      
      // Använd SDK:et med 'as any' för att kringgå TypeScript-typer
      // (samma approach som används i testerna)
      const response = await anthropicClient.messages.create(createParams as any);
      
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
      
      // Hantera output_format-fel specifikt
      if (error?.status === 400 && (error?.error?.message?.includes('output_format') || error?.error?.message?.includes('response_format'))) {
        const errorMessage = error?.error?.message || 'Invalid output_format';
        console.error('[Cloud LLM] output_format error:', errorMessage);
        // Kasta fel istället för att returnera null, så att fallback kan hantera det korrekt
        throw new Error(`Cloud LLM output_format error: ${errorMessage}`);
      }
      
      // Hantera andra fel
      console.error('Cloud LLM generation error:', error);
      return null;
    }
  }
}

export const cloudLlmClientInstance = new CloudLlmClient();
