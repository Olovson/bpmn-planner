import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;
export type ArtifactProvider = 'cloud' | 'local' | 'fallback' | null | undefined;

/**
 * Build storage paths for documentation HTML with BPMN file version support.
 * 
 * Format: 
 * - BPMN versioned: docs/{provider}/{bpmnFileName}/{bpmnVersionHash}/{docFileName}
 *   - provider: 'claude' (cloud LLM), 'ollama' (local LLM), 'local' (fallback)
 * - Legacy (no version): docs/{provider}/{docFileName}
 * - Older legacy: docs/{docFileName}
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

  // Map provider to storage path name
  const providerName = provider === 'cloud' 
    ? 'claude' 
    : provider === 'local' && normalized === 'slow'
    ? 'ollama'
    : 'local';

  // If BPMN version hash is provided, include it in the path
  if (bpmnVersionHash && bpmnFileName) {
    const basePath = `docs/${providerName}/${bpmnFileName}/${bpmnVersionHash}`;
    
    return { 
      modePath: `${basePath}/${docFileName}`, 
      legacyPath 
    };
  }

  // Fallback to old structure if no version hash
  // Legacy paths for backward compatibility
  return { 
    modePath: `docs/${providerName}/${docFileName}`, 
    legacyPath 
  };
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
