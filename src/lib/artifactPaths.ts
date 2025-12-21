import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;
export type ArtifactProvider = 'cloud' | 'local' | 'fallback' | null | undefined;

/**
 * Build storage paths for documentation HTML with BPMN file version support.
 * 
 * Format: 
 * - BPMN versioned: docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}
 * - Non-versioned: docs/claude/{docFileName}
 * 
 * Note: We use only BPMN file versioning, not per-element artifact versioning.
 * For manual improvements to specific nodes, use node-docs overrides instead.
 * 
 * Claude-only: All documentation is generated using Claude (cloud LLM).
 */
export const buildDocStoragePaths = (
  docFileName: string,
  mode: ArtifactMode,
  provider?: ArtifactProvider,
  bpmnFileName?: string,
  bpmnVersionHash?: string | null
) => {
  const normalized = normalizeMode(mode);
  
  // Claude-only: Always use 'claude' as provider
  const providerName = 'claude';

  // If BPMN version hash is provided, include it in the path
  if (bpmnVersionHash && bpmnFileName) {
    const basePath = `docs/${providerName}/${bpmnFileName}/${bpmnVersionHash}`;
    
    return { 
      modePath: `${basePath}/${docFileName}`
    };
  }

  // Non-versioned path (used when version hash is not available)
  return { 
    modePath: `docs/${providerName}/${docFileName}`
  };
};

const normalizeMode = (mode: ArtifactMode): 'slow' | null => {
  if (mode === 'slow') return mode;
  // 'fast' mode is treated as 'slow' (same generation approach)
  if (mode === 'fast') return 'slow';
  // 'local' mode is no longer supported
  return null;
};


/**
 * Bygger lagringssökvägar för testspecar.
 */
export const buildTestStoragePaths = (testFileName: string, mode: ArtifactMode) => {
  const normalized = normalizeMode(mode);
  if (!normalized) {
    return { modePath: `tests/${testFileName}` };
  }
  const modePath = `tests/${normalized}/${testFileName}`;
  return { modePath };
};
