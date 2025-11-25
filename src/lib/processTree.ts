import type { DiagnosticsEntry, SubprocessLink } from '@/lib/bpmn/types';

export type ProcessNodeType =
  | 'process'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'dmnDecision';

export type ArtifactType = 'test' | 'doc' | 'dor' | 'dod';

export interface NodeArtifact {
  id: string;
  type: ArtifactType;
  label: string;
  href?: string;
  status?: 'ok' | 'warning' | 'error';
  count?: number;
}

export interface ProcessTreeNode {
  id: string;
  label: string;
  type: ProcessNodeType;
  bpmnFile: string;
  bpmnElementId?: string;
   /** Optional execution ordering metadata propagated from the process model. */
  orderIndex?: number;
  /** Visual ordering index based on BPMN DI coordinates (x, y). Used only when orderIndex is missing. */
  visualOrderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
  /** Matched subprocess BPMN file for call activities (when link resolved). */
  subprocessFile?: string;
  children: ProcessTreeNode[];
  artifacts?: NodeArtifact[];
  subprocessLink?: SubprocessLink;
  diagnostics?: DiagnosticsEntry[];
}

export const PROCESS_NODE_STYLES: Record<ProcessNodeType | 'default', {
  icon: string;
  tailwindColor: string;
  hexColor: string;
  label: string;
}> = {
  process: {
    icon: '📋',
    tailwindColor: 'text-primary',
    hexColor: '#3B82F6',
    label: 'Process',
  },
  callActivity: {
    icon: '📞',
    tailwindColor: 'text-purple-600',
    hexColor: '#8B5CF6',
    label: 'Call Activity',
  },
  userTask: {
    icon: '👤',
    tailwindColor: 'text-green-600',
    hexColor: '#10B981',
    label: 'User Task',
  },
  serviceTask: {
    icon: '⚙️',
    tailwindColor: 'text-orange-600',
    hexColor: '#F97316',
    label: 'Service Task',
  },
  businessRuleTask: {
    icon: '📊',
    tailwindColor: 'text-yellow-600',
    hexColor: '#F59E0B',
    label: 'Business Rule',
  },
  dmnDecision: {
    icon: '🎯',
    tailwindColor: 'text-red-600',
    hexColor: '#DC2626',
    label: 'DMN Decision',
  },
  default: {
    icon: '📄',
    tailwindColor: 'text-muted-foreground',
    hexColor: '#64748B',
    label: 'Node',
  },
};

export const getProcessNodeStyle = (type: ProcessNodeType) => {
  return PROCESS_NODE_STYLES[type] ?? PROCESS_NODE_STYLES.default;
};

export const getNodeIcon = (type: ProcessNodeType): string => {
  return getProcessNodeStyle(type).icon;
};

export const getNodeColor = (type: ProcessNodeType): string => {
  return getProcessNodeStyle(type).tailwindColor;
};
