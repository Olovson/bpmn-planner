export type ProcessGraphNodeType =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'gateway'
  | 'event'
  | 'dmnDecision';

export interface ProcessGraphNode {
  id: string;
  type: ProcessGraphNodeType;
  name?: string;
  bpmnFile: string;
  bpmnElementId: string;
  processId?: string;
  metadata: Record<string, unknown>;
}

export type ProcessGraphEdgeType =
  | 'subprocess'
  | 'sequence'
  | 'hierarchy';

export interface ProcessGraphEdge {
  id: string;
  from: string;
  to: string;
  type: ProcessGraphEdgeType;
  metadata: Record<string, unknown>;
}

export interface CycleInfo {
  nodes: string[];
  type: 'direct' | 'indirect';
  severity: 'error' | 'warning';
  message?: string;
}

export interface MissingDependency {
  fromNodeId: string;
  missingProcessId?: string;
  missingFileName?: string;
  context?: Record<string, unknown>;
}

export interface ProcessGraph {
  nodes: Map<string, ProcessGraphNode>;
  edges: Map<string, ProcessGraphEdge>;
  roots: string[];
  cycles: CycleInfo[];
  missingDependencies: MissingDependency[];
}

