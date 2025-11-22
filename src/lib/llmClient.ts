import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
} from 'openai/resources/index.mjs';

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

export const isLlmEnabled = (): boolean => shouldEnableLlm;

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: 'slow';
  responseFormat?: ChatCompletionCreateParams.ResponseFormat;
}

export async function generateChatCompletion(
  messages: ChatCompletionMessageParam[],
  options: CompletionOptions = {}
): Promise<string | null> {
  if (!isLlmEnabled() || !openAiClient) return null;

  const resolvedModel = FULL_MODEL;

  const response = await openAiClient.chat.completions.create({
    model: resolvedModel,
    temperature: options.temperature ?? 0.35,
    max_tokens: options.maxTokens ?? 1800,
    messages,
    response_format: options.responseFormat,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? null;
}
