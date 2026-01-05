/**
 * Local LLM Client (Llama 3.1 8B via Ollama)
 *
 * Implementerar LlmClient-interface för lokala LLM-instanser via Ollama API.
 *
 * Konfiguration via env-variabler:
 * - VITE_LLM_LOCAL_BASE_URL (t.ex. http://localhost:11434)
 * - VITE_LLM_LOCAL_MODEL (t.ex. llama3.1:8b-instruct)
 */

export type LlmProvider = 'cloud' | 'ollama';

// Stöd både Vite (import.meta.env) och Node/skript (process.env)
const VITE_ENV: Record<string, any> =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env as Record<string, any>)
    : {};

const NODE_ENV: Record<string, any> =
  typeof process !== 'undefined' && (process as any).env
    ? ((process as any).env as Record<string, any>)
    : {};

const LOCAL_BASE_URL =
  (VITE_ENV.VITE_LLM_LOCAL_BASE_URL as string | undefined)?.trim() ||
  (NODE_ENV.VITE_LLM_LOCAL_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:11434';

const LOCAL_MODEL =
  (VITE_ENV.VITE_LLM_LOCAL_MODEL as string | undefined)?.trim() ||
  (NODE_ENV.VITE_LLM_LOCAL_MODEL as string | undefined)?.trim() ||
  'llama3.1:8b-instruct';

const LOCAL_TIMEOUT_MS = (() => {
  const raw =
    (VITE_ENV.VITE_LLM_LOCAL_TIMEOUT_MS as string | number | undefined) ??
    NODE_ENV.VITE_LLM_LOCAL_TIMEOUT_MS;
  const str = raw !== undefined ? String(raw).trim() : '';
  const parsed = str ? Number.parseInt(str, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 600000;
})();

import type { LlmClient } from '../llmClientAbstraction';

export class LocalLlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalLlmUnavailableError';
  }
}

export class LocalLlmClient implements LlmClient {
  readonly modelName = LOCAL_MODEL;
  readonly provider: 'ollama' = 'ollama';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string = LOCAL_BASE_URL, timeoutMs: number = LOCAL_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async generateText(args: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: { type: 'json_schema'; json_schema: any };
    abortSignal?: AbortSignal;
  }): Promise<string | null> {
    if (!this.baseUrl || !this.modelName) {
      console.error(
        'Local LLM client not configured: VITE_LLM_LOCAL_BASE_URL and VITE_LLM_LOCAL_MODEL must be set'
      );
      return null;
    }

    // Ollama API format: POST /api/generate
    const endpoint = `${this.baseUrl}/api/generate`;

    // Kombinera system och user prompt för Ollama
    // Ollama använder en enkel "prompt" field, så vi kombinerar system och user
    let combinedPrompt = args.userPrompt;
    if (args.systemPrompt) {
      combinedPrompt = `${args.systemPrompt}\n\n${args.userPrompt}`;
    }

    const requestBody = {
      model: this.modelName,
      prompt: combinedPrompt,
      system: args.systemPrompt || '',
      stream: false,
      options: {
        temperature: args.temperature ?? 0.35,
        num_predict: args.maxTokens ?? 1800,
      },
    };

    // Om JSON schema format krävs, lägg till i prompt istället
    // (Ollama stödjer inte json_schema direkt)
    if (args.responseFormat?.type === 'json_schema') {
      console.warn(
        'JSON schema response format not directly supported by Ollama. Consider adding schema instructions to the prompt.'
      );
    }

    try {
      // Skapa AbortController för timeout och användaravbrytning
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      
      // Om en abort signal finns (från användaravbrytning), koppla den till vår controller
      if (args.abortSignal) {
        // Om abort signal redan är aborted, avbryt omedelbart
        if (args.abortSignal.aborted) {
          clearTimeout(timeoutId);
          throw new Error('Avbrutet av användaren');
        }
        // Lyssna på abort signal och propagera till vår controller
        args.abortSignal.addEventListener('abort', () => {
          controller.abort();
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Specifik hantering för olika felkoder
        if (response.status === 404) {
          console.error(
            `Local LLM model not found (404): ${this.modelName}. Make sure the model is pulled in Ollama.`
          );
          throw new LocalLlmUnavailableError(
            `Modellen "${this.modelName}" hittades inte. Kontrollera att modellen är nedladdad i Ollama.`
          );
        }

        console.error(
          `Local LLM request failed: ${response.status} ${response.statusText}`,
          errorText
        );
        throw new LocalLlmUnavailableError(
          `Lokal LLM-motor svarade med fel: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Ollama returnerar: { response: "...", done: true, ... }
      const content = data.response;

      if (typeof content === 'string') {
        return content.trim();
      }

      console.warn('Unexpected response format from Ollama:', data);
      throw new LocalLlmUnavailableError('Oväntat svarformat från lokal LLM-motor');
    } catch (error) {
      if (error instanceof LocalLlmUnavailableError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        // Kontrollera om det var användaravbrytning eller timeout
        if (args.abortSignal?.aborted) {
          throw new Error('Avbrutet av användaren');
        }
        console.error('Local LLM request timeout:', this.timeoutMs, 'ms');
        throw new LocalLlmUnavailableError(
          `Lokal LLM-motor svarade inte inom ${this.timeoutMs / 1000} sekunder`
        );
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Local LLM connection error:', error.message);
        throw new LocalLlmUnavailableError(
          'Kan inte ansluta till lokal LLM-motor. Kontrollera att Ollama körs.'
        );
      }

      console.error('Local LLM generation error:', error);
      throw new LocalLlmUnavailableError(
        `Okänt fel vid kommunikation med lokal LLM-motor: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const localLlmClientInstance = new LocalLlmClient();
