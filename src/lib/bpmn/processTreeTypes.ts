export type ProcessTreeNodeType =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask';

export interface NodeArtifact {
  kind: 'test' | 'doc' | 'dor' | 'dod' | string;
  id: string;
  label?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

export interface DiagnosticsEntry {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface SubprocessLink {
  callActivityId: string;
  callActivityName?: string;
  matchedProcessId?: string;
  matchedFileName?: string;
  matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  matchSource?: 'bpmn-map' | 'fuzzy' | 'calledElement' | 'none';
}

export interface ProcessTreeNode {
  id: string;
  label: string;
  type: ProcessTreeNodeType;

  bpmnFile: string;
  bpmnElementId?: string;
  processId?: string;

  orderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];

  subprocessFile?: string;
  subprocessLink?: SubprocessLink;

  children: ProcessTreeNode[];

  artifacts?: NodeArtifact[];
  diagnostics?: DiagnosticsEntry[];
}

export type ArtifactBuilder = (bpmnFile: string, bpmnElementId?: string) => NodeArtifact[];

