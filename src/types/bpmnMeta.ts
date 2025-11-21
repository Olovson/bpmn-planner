import type { DiagnosticsEntry } from '@/lib/bpmn/types';

/**
 * Canonical BPMN parsing schema used by both frontend and backend.
 * This ensures consistent understanding of BPMN structure across the entire system.
 */
export interface BpmnProcessMeta {
  id: string;
  name: string;
  callActivities: Array<{
    id: string;
    name: string;
    calledElement: string | null;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    type: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask';
  }>;
  parseDiagnostics?: DiagnosticsEntry[];
}

export interface BpmnMeta {
  /** Legacy single-process metadata kept for backward compatibility. */
  processId: string;
  name: string;
  callActivities: Array<{
    id: string;
    name: string;
    calledElement: string | null;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    type: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask';
  }>;
  subprocesses: Array<{
    id: string;
    name: string;
  }>;
  /** Full multi-process metadata (one entry per <process> in the XML). */
  processes?: BpmnProcessMeta[];
}

/**
 * Normalize a BPMN key for consistent matching across frontend and backend.
 */
export function normalizeBpmnKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}
