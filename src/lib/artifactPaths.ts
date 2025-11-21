import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;

const normalizeMode = (mode: ArtifactMode): 'local' | 'fast' | 'slow' | null => {
  if (mode === 'fast' || mode === 'slow' || mode === 'local') return mode;
  return null;
};

export const buildDocStoragePaths = (docFileName: string, mode: ArtifactMode) => {
  const normalized = normalizeMode(mode);
  const legacyPath = `docs/${docFileName}`;
  if (!normalized) {
    return { modePath: legacyPath, legacyPath };
  }
  const modePath = `docs/${normalized}/${docFileName}`;
  return { modePath, legacyPath };
};

export const buildTestStoragePaths = (testFileName: string, mode: ArtifactMode) => {
  const normalized = normalizeMode(mode);
  const legacyPath = `tests/${testFileName}`;
  if (!normalized) {
    return { modePath: legacyPath, legacyPath };
  }
  const modePath = `tests/${normalized}/${testFileName}`;
  return { modePath, legacyPath };
};

