import type { GenerationStatus, GenerationOperation } from '@/hooks/useGenerationJobs';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';

/**
 * Formats a file name to a readable root name
 */
export const formatFileRootName = (fileName: string) =>
  fileName
    .replace('.bpmn', '')
    .replace(/^mortgage-se-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Gets CSS classes for status badge
 */
export const getStatusBadgeClasses = (status: GenerationStatus) => {
  switch (status) {
    case 'running':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'succeeded':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'cancelled':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

/**
 * Formats status label for display
 */
export const formatStatusLabel = (status: GenerationStatus) => {
  switch (status) {
    case 'running':
      return 'Pågår';
    case 'succeeded':
      return 'Klar';
    case 'failed':
      return 'Fel';
    case 'cancelled':
      return 'Avbruten';
    default:
      return 'Köad';
  }
};

/**
 * Formats operation label for display
 */
export const formatOperationLabel = (operation: GenerationOperation) => {
  switch (operation) {
    case 'hierarchy':
      return 'Hierarki';
    case 'llm_generation':
    case 'generation':
      return 'Dok/Test (LLM)';
    default:
      return 'Artefakter';
  }
};

/**
 * Creates a filter function for User Task epics from the list
 */
export const createUserTaskEpicFilter = (
  userTaskEpicsList: Array<{ bpmnFile: string; elementId: string }>
): ((node: BpmnProcessNode) => boolean) => {
  // Create a Set for fast lookup: "bpmnFile:elementId"
  const epicKeys = new Set(
    userTaskEpicsList.map(epic => `${epic.bpmnFile}:${epic.elementId}`)
  );

  return (node: BpmnProcessNode): boolean => {
    // Only process User Tasks
    if (node.type !== 'userTask') {
      return false;
    }
    
    // Check if this epic is in our list
    const key = `${node.bpmnFile}:${node.bpmnElementId}`;
    return epicKeys.has(key);
  };
};

