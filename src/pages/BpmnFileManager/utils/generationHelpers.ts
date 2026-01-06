/**
 * Helper functions for generation
 */

import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { GenerationScope } from '../types';
import type { GenerationPlan, GenerationProgress } from '@/components/GenerationDialog';

export interface ResetGenerationStateParams {
  setCancelGeneration: (value: boolean) => void;
  setCurrentGenerationStep: (value: { step: string; detail?: string } | null) => void;
  setGraphTotals: (value: { files: number; nodes: number }) => void;
  setDocgenProgress: (value: { completed: number; total: number }) => void;
  setDocUploadProgress: (value: { planned: number; completed: number }) => void;
  setGenerationPlan: (plan: GenerationPlan | null) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  setGenerationDialogResult: (result: any) => void;
  cancelGenerationRef: React.MutableRefObject<boolean>;
  hasGenerationResultRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function resetGenerationState(params: ResetGenerationStateParams) {
  const {
    setCancelGeneration,
    setCurrentGenerationStep,
    setGraphTotals,
    setDocgenProgress,
    setDocUploadProgress,
    setGenerationPlan,
    setGenerationProgress,
    setGenerationDialogResult,
    cancelGenerationRef,
    hasGenerationResultRef,
    abortControllerRef,
  } = params;
  
  cancelGenerationRef.current = false;
  setCancelGeneration(false);
  cancelGenerationRef.current = false;
  hasGenerationResultRef.current = false;
  setCurrentGenerationStep(null);
  setGraphTotals({ files: 0, nodes: 0 });
  setDocgenProgress({ completed: 0, total: 0 });
  setDocUploadProgress({ planned: 0, completed: 0 });
  setGenerationPlan(null);
  setGenerationProgress(null);
  setGenerationDialogResult(null);
  // Skapa ny AbortController för nästa generering
  abortControllerRef.current = new AbortController();
}

export function checkCancellation(cancelGenerationRef: React.MutableRefObject<boolean>) {
  if (cancelGenerationRef.current) {
    throw new Error('Avbrutet av användaren');
  }
}

function isBpmnFile(file: BpmnFile): boolean {
  if (!file) return false;
  const name = (file.file_name || '').toLowerCase();
  // Primärt: filnamn eller storage_path som innehåller .bpmn
  if (name.includes('.bpmn')) return true;
  // Sekundärt: explicit file_type-markering
  if (file.file_type === 'bpmn') return true;
  return false;
}

export function validateFileForGeneration(file: BpmnFile): { valid: boolean; error?: string } {
  // Endast BPMN-filer ska gå in i pipeline
  if (!isBpmnFile(file)) {
    return {
      valid: false,
      error: 'Endast BPMN-filer stöds för generering',
    };
  }
  // LLM‑pipen läser BPMN från versionslagring och behöver inte längre
  // lita på storage_path, så vi gör inga fler blockerande kontroller här.
  return { valid: true };
}
