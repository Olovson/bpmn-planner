/**
 * Shared BPMN hierarchy and matching types used across the application.
 * These types intentionally avoid breaking existing consumers by keeping all
 * properties optional where integration work is still pending.
 */

export type DiagnosticsEntry = {
  /** Severity level for the diagnostic entry. */
  severity: 'info' | 'warning' | 'error';
  /** Stable code describing the issue (e.g. NO_MATCH, AMBIGUOUS_MATCH). */
  code: string;
  /** Human-readable explanation of the diagnostic. */
  message: string;
  /** Optional contextual metadata for debugging. */
  context?: Record<string, unknown>;
  /** ISO timestamp when the diagnostic was generated. */
  timestamp: string;
};

export type MatchCandidate = {
  processId: string;
  processName: string;
  fileName: string;
  score: number;
  reason: string;
};

export type SubprocessLink = {
  callActivityId: string;
  callActivityName?: string;
  calledElement?: string;
  matchedProcessId?: string;
  matchedFileName?: string;
  matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  confidence: number;
  candidates: MatchCandidate[];
  diagnostics: DiagnosticsEntry[];
};

export type ProcessDefinition = {
  /** BPMN process ID as defined in the XML. */
  id: string;
  /** BPMN process name (may be empty). */
  name?: string;
  /** BPMN file name containing this process. */
  fileName: string;
  /** Storage bucket path for the file (if known). */
  storagePath?: string;
  /** Call activities contained in the process. */
  callActivities: Array<{
    id: string;
    name?: string;
    calledElement?: string;
  }>;
  /**
   * Utökad lista över subprocess-kandidater. Innehåller både riktiga
   * CallActivities och vissa SubProcess-noder. Denna används inte
   * fullt ut ännu, men fylls av parsern för framtida hierarkistöd.
   */
  subprocessCandidates?: Array<{
    id: string;
    name?: string;
    kind?: 'callActivity' | 'subProcess';
  }>;
  /** Task-like nodes (UserTask, ServiceTask, BusinessRuleTask, etc.). */
  tasks: Array<{
    id: string;
    name?: string;
    type?: string;
  }>;
  /** Diagnostics captured while parsing this process. */
  parseDiagnostics?: DiagnosticsEntry[];
};

export type HierarchyNode = {
  nodeId: string;
  bpmnType:
    | 'process'
    | 'callActivity'
    | 'task'
    | 'userTask'
    | 'serviceTask'
    | 'businessRuleTask'
    | 'gateway'
    | 'event'
    | 'group';
  displayName: string;
  processId?: string;
  parentId?: string;
  children: HierarchyNode[];
  /** Subprocess link metadata if this node represents a Call Activity. */
  link?: SubprocessLink;
  diagnostics?: DiagnosticsEntry[];
};
