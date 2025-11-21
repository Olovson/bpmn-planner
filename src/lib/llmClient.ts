import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionCreateParams } from 'openai/resources/index.mjs';

const USE_LLM = String(import.meta.env.VITE_USE_LLM ?? '').trim().toLowerCase() === 'true';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const DEFAULT_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini';
const IS_BROWSER = typeof window !== 'undefined';

let openAiClient: OpenAI | null = null;

if (USE_LLM && API_KEY && import.meta.env.MODE !== 'test') {
  openAiClient = new OpenAI({
    apiKey: API_KEY,
    ...(IS_BROWSER ? { dangerouslyAllowBrowser: true } : {}),
  });
}

export const isLlmEnabled = (): boolean =>
  import.meta.env.MODE !== 'test' && USE_LLM && !!openAiClient;

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: ChatCompletionCreateParams.ResponseFormat;
}

export async function generateChatCompletion(
  messages: ChatCompletionMessageParam[],
  options: CompletionOptions = {}
): Promise<string | null> {
  if (!isLlmEnabled() || !openAiClient) return null;

  const response = await openAiClient.chat.completions.create({
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? 0.35,
    max_tokens: options.maxTokens ?? 1800,
    messages,
    response_format: options.responseFormat,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? null;
}
