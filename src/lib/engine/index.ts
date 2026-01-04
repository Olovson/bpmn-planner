import type { EngineAdapters } from './types';
import { createDefaultEngineAdapters } from './defaultAdapters';
import { generateAllFromBpmnWithGraph as coreGenerateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

export type { EngineAdapters } from './types';

/**
 * Engine façade for BPMN generation.
 *
 * For now this delegates to the existing generateAllFromBpmnWithGraph implementation
 * in src/lib/bpmnGenerators.ts. The adapters parameter is reserved for future use
 * and enables tests to mock engine services via module mocking.
 */
export async function generateAllFromBpmnWithGraphEngine(
  _adapters: EngineAdapters | undefined,
  ...args: Parameters<typeof coreGenerateAllFromBpmnWithGraph>
) {
  return coreGenerateAllFromBpmnWithGraph(...args);
}

/**
 * Convenience wrapper that uses the default engine adapters.
 *
 * New callers that don't need custom adapters can import this function directly.
 */
export async function generateAllFromBpmnWithGraphWithDefaults(
  ...args: Parameters<typeof coreGenerateAllFromBpmnWithGraph>
) {
  const adapters = createDefaultEngineAdapters();
  return generateAllFromBpmnWithGraphEngine(adapters, ...args);
}
