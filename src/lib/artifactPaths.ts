import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;
export type ArtifactProvider = 'cloud' | 'local' | 'fallback' | null | undefined;

/**
 * Build storage paths for documentation HTML with BPMN file version support.
 * 
 * Format: 
 * - BPMN versioned: docs/{mode}/{provider}/{bpmnFileName}/{bpmnVersionHash}/{docFileName}
 * Legacy: docs/{docFileName} (for backward compatibility)
 * 
 * Note: We use only BPMN file versioning, not per-element artifact versioning.
 * For manual improvements to specific nodes, use node-docs overrides instead.
 */
export const buildDocStoragePaths = (
  docFileName: string,
  mode: ArtifactMode,
  provider?: ArtifactProvider,
  bpmnFileName?: string,
  bpmnVersionHash?: string | null
) => {
  const normalized = normalizeMode(mode);
  const legacyPath = `docs/${docFileName}`;
  
  if (!normalized) {
    return { modePath: legacyPath, legacyPath };
  }

  // If BPMN version hash is provided, include it in the path
  if (bpmnVersionHash && bpmnFileName) {
    const basePath = normalized === 'local' || provider === 'fallback'
      ? `docs/local/${bpmnFileName}/${bpmnVersionHash}`
      : provider === 'cloud'
      ? `docs/slow/chatgpt/${bpmnFileName}/${bpmnVersionHash}`
      : provider === 'local'
      ? `docs/slow/ollama/${bpmnFileName}/${bpmnVersionHash}`
      : `docs/slow/${bpmnFileName}/${bpmnVersionHash}`;
    
    return { 
      modePath: `${basePath}/${docFileName}`, 
      legacyPath 
    };
  }

  // Fallback to old structure if no version hash
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

const normalizeMode = (mode: ArtifactMode): 'local' | 'slow' | null => {
  if (mode === 'slow' || mode === 'local') return mode;
  // Legacy: 'fast' behandlas som 'slow'
  if (mode === 'fast') return 'slow';
  return null;
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
