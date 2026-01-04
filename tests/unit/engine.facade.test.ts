import { describe, it, expect, vi } from 'vitest';
import {
  generateAllFromBpmnWithGraphEngine,
  generateAllFromBpmnWithDefaults,
} from '@/lib/engine';
import type { EngineAdapters } from '@/lib/engine';

const coreGenerateMock = vi.fn(async (...args: any[]) => ({
  docs: new Map(),
  metadata: { calledWith: args },
}));

vi.mock('@/lib/bpmnGenerators', () => ({
  generateAllFromBpmnWithGraph: coreGenerateMock,
}));

describe('engine façade', () => {
  const dummyAdapters: EngineAdapters = {
    // Adapters are currently unused by the façade, but included for future extension.
    llm: {} as any,
    storage: {} as any,
    logger: undefined,
  };

  it('delegates to core generator when using explicit adapters', async () => {
    const result = await generateAllFromBpmnWithGraphEngine(
      dummyAdapters,
      'file.bpmn',
      ['file.bpmn'],
    );

    expect(coreGenerateMock).toHaveBeenCalledTimes(1);
    expect(coreGenerateMock).toHaveBeenCalledWith(
      'file.bpmn',
      ['file.bpmn'],
      [],
      false,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        docs: expect.any(Map),
      }),
    );
  });

  it('delegates to core generator when using default adapters', async () => {
    const result = await generateAllFromBpmnWithDefaults(
      'file.bpmn',
      ['file.bpmn'],
    );

    expect(coreGenerateMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        docs: expect.any(Map),
      }),
    );
  });
});

