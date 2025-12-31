import type { GenerationMode } from '@/pages/BpmnFileManager';

export type ArtifactMode = GenerationMode | null | undefined;
export type ArtifactProvider = 'cloud' | 'local' | 'fallback' | null | undefined;

/**
 * Build storage paths for documentation HTML with BPMN file version support.
 * 
 * Format: 
 * - BPMN versioned: docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}
 * 
 * VIKTIGT: Version hash är OBLIGATORISKT. Ingen bakåtkompatibilitet.
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

  // Version hash is REQUIRED - no fallback
  if (!bpmnVersionHash || !bpmnFileName) {
    throw new Error(
      `buildDocStoragePaths: version hash and bpmnFileName are required. ` +
      `docFileName: ${docFileName}, bpmnFileName: ${bpmnFileName || 'missing'}, versionHash: ${bpmnVersionHash || 'missing'}`
    );
  }

  const basePath = `docs/${providerName}/${bpmnFileName}/${bpmnVersionHash}`;
  
  return { 
    modePath: `${basePath}/${docFileName}`
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
