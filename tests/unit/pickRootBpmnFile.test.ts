import { describe, it, expect, vi } from 'vitest';

const memoryStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
})();

describe('pickRootBpmnFile', () => {
  vi.stubGlobal('localStorage', memoryStorage);

  const getPicker = async () => {
    const mod = await import('@/hooks/useRootBpmnFile');
    return mod.pickRootBpmnFile;
  };

  const files = [
    { file_name: 'mortgage.bpmn' },
    { file_name: 'child.bpmn' },
  ];

  it('returns mortgage.bpmn when dependencies are empty and mortgage exists', async () => {
    const pickRootBpmnFile = await getPicker();
    expect(pickRootBpmnFile(files, [])).toBe('mortgage.bpmn');
  });

  it('returns first file when mortgage is missing and no dependencies', async () => {
    const pickRootBpmnFile = await getPicker();
    const customFiles = [{ file_name: 'alpha.bpmn' }, { file_name: 'beta.bpmn' }];
    expect(pickRootBpmnFile(customFiles, [])).toBe('alpha.bpmn');
  });

  it('prefers parent that is never a child', async () => {
    const pickRootBpmnFile = await getPicker();
    const deps = [
      { parent_file: 'mortgage.bpmn', child_file: 'child.bpmn' },
      { parent_file: 'child.bpmn', child_file: null },
    ];
    expect(pickRootBpmnFile(files, deps)).toBe('mortgage.bpmn');
  });

  it('falls back to first available when no clear root', async () => {
    const pickRootBpmnFile = await getPicker();
    const customFiles = [{ file_name: 'alpha.bpmn' }, { file_name: 'beta.bpmn' }];
    const deps = [
      { parent_file: 'alpha.bpmn', child_file: 'beta.bpmn' },
      { parent_file: 'beta.bpmn', child_file: 'alpha.bpmn' },
    ];
    expect(pickRootBpmnFile(customFiles, deps)).toBe('alpha.bpmn');
  });
});
