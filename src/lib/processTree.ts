export type ProcessNodeType =
  | 'process'
  | 'subprocess'
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
  children: ProcessTreeNode[];
  artifacts?: NodeArtifact[];
}

export const getNodeIcon = (type: ProcessNodeType): string => {
  const icons: Record<ProcessNodeType, string> = {
    process: '📋',
    subprocess: '🔄',
    callActivity: '📞',
    userTask: '👤',
    serviceTask: '⚙️',
    businessRuleTask: '📊',
    dmnDecision: '🎯',
  };
  return icons[type] || '📄';
};

export const getNodeColor = (type: ProcessNodeType): string => {
  const colors: Record<ProcessNodeType, string> = {
    process: 'text-primary',
    subprocess: 'text-blue-600',
    callActivity: 'text-purple-600',
    userTask: 'text-green-600',
    serviceTask: 'text-orange-600',
    businessRuleTask: 'text-yellow-600',
    dmnDecision: 'text-red-600',
  };
  return colors[type] || 'text-muted-foreground';
};
