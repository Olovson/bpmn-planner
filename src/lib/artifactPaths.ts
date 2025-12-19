import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;
export type ArtifactProvider = 'cloud' | 'local' | 'fallback' | null | undefined;

const normalizeMode = (mode: ArtifactMode): 'local' | 'slow' | null => {
  if (mode === 'slow' || mode === 'local') return mode;
  // Legacy: 'fast' behandlas som 'slow'
  if (mode === 'fast') return 'slow';
  return null;
};

/**
 * Bygger lagringssökvägar för dokumentations-HTML.
 *
 * - Lokal fallback (ingen LLM): docs/local/<docFileName>
 * - LLM (Claude): docs/slow/chatgpt/<docFileName>
 * - LLM (Ollama): docs/slow/ollama/<docFileName>
 *
 * legacyPath behålls som docs/<docFileName> för bakåtkompatibilitet.
 */
export const buildDocStoragePaths = (
  docFileName: string,
  mode: ArtifactMode,
  provider?: ArtifactProvider,
) => {
  const normalized = normalizeMode(mode);
  const legacyPath = `docs/${docFileName}`;
  if (!normalized) {
    return { modePath: legacyPath, legacyPath };
  }

  if (normalized === 'local' || provider === 'fallback') {
    return { modePath: `docs/local/${docFileName}`, legacyPath };
  }

  // normalized === 'slow' (LLM-läge)
  if (provider === 'cloud') {
    return { modePath: `docs/slow/chatgpt/${docFileName}`, legacyPath };
  }
  if (provider === 'local') {
    return { modePath: `docs/slow/ollama/${docFileName}`, legacyPath };
  }

  // Generisk LLM-slow (t.ex. äldre körningar utan provider-info)
  return { modePath: `docs/slow/${docFileName}`, legacyPath };
};

/**
 * Bygger lagringssökvägar för testspecar.
 * Just nu särskiljer vi endast på lokal vs LLM-läge.
 */
export const buildTestStoragePaths = (testFileName: string, mode: ArtifactMode) => {
  const normalized = normalizeMode(mode);
  const legacyPath = `tests/${testFileName}`;
  if (!normalized) {
    return { modePath: legacyPath, legacyPath };
  }
  const modePath = `tests/${normalized}/${testFileName}`;
  return { modePath, legacyPath };
};
