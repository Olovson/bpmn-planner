/**
 * Canonical BPMN parsing schema used by both frontend and backend.
 * This ensures consistent understanding of BPMN structure across the entire system.
 */
export interface BpmnMeta {
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
}

/**
 * Normalize a BPMN key for consistent matching across frontend and backend.
 */
export function normalizeBpmnKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}
