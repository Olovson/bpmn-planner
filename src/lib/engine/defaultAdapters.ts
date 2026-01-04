import { createLlmGenerationService } from './services/llmGeneration';
import { createGenerationStorageService } from './services/generationStorage';
import type { EngineAdapters, Logger } from './types';

const consoleLogger: Logger = {
  debug: (...args: unknown[]) => console.debug('[engine]', ...args),
  info: (...args: unknown[]) => console.info('[engine]', ...args),
  warn: (...args: unknown[]) => console.warn('[engine]', ...args),
  error: (...args: unknown[]) => console.error('[engine]', ...args),
};

export function createDefaultEngineAdapters(): EngineAdapters {
  return {
    llm: createLlmGenerationService(),
    storage: createGenerationStorageService(),
    logger: consoleLogger,
  };
}

