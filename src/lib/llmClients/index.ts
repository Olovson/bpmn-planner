/**
 * LLM Client Router
 * 
 * Central router för att välja rätt LLM-klient baserat på provider.
 */

import type { LlmClient, LlmProvider } from '../llmClientAbstraction';
import { cloudLlmClientInstance } from './cloudLlmClient';
import { localLlmClientInstance } from './localLlmClient';

/**
 * Hämtar rätt LLM-klient baserat på provider.
 * 
 * @param provider - 'cloud' för Claude/Anthropic, 'ollama' för lokal Llama-instans via Ollama
 * @returns LlmClient-instans
 */
export function getLlmClient(provider: LlmProvider): LlmClient {
  return provider === 'ollama' ? localLlmClientInstance : cloudLlmClientInstance;
}

/**
 * Hämtar standard-provider från env-variabel eller fallback till 'cloud'.
 */
export function getDefaultLlmProvider(): LlmProvider {
  const envProvider = import.meta.env.VITE_LLM_DEFAULT_PROVIDER?.trim().toLowerCase();
  if (envProvider === 'ollama' || envProvider === 'cloud') {
    return envProvider;
  }
  return 'cloud';
}

// Re-export för enkel import
export { 
  cloudLlmClientInstance,
  CloudLlmAccountInactiveError,
  CloudLlmRateLimitError,
  isCloudLlmAccountInactive,
  resetCloudLlmAccountStatus,
} from './cloudLlmClient';
export { localLlmClientInstance } from './localLlmClient';
export type { LlmProvider } from '../llmClientAbstraction';

