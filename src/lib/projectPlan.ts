import type { BpmnNodeData } from '@/hooks/useAllBpmnNodes';
import type { ProcessTreeNode } from '@/lib/processTree';

export type ProjectPlanLevel = 'FG' | 'Epic' | 'Story' | 'Task' | 'Defect';

export interface ProjectPlanRow {
  processOrder: number;
  processStepName: string;
  level: ProjectPlanLevel;
  summary: string;
  parent: string | null;
  bpmnFile: string;
  bpmnNodeId: string;
  labels: string[];
  dependencies: string[];
}

/**
 * Bygger en enkel, linjär projektplanslista baserad på BPMN-noder.
 * Första versionen använder ordningen i bpmnNodes-arrayen som processOrder.
 */
export function buildProjectPlanRows(
  processTree: ProcessTreeNode | null | undefined,
  bpmnNodes: BpmnNodeData[],
): ProjectPlanRow[] {
  if (!bpmnNodes || bpmnNodes.length === 0) return [];

  // Indexera BPMN-noder per (fil, elementId)
  const nodeMap = new Map<string, BpmnNodeData>();
  bpmnNodes.forEach((n) => {
    nodeMap.set(`${n.bpmnFile}:${n.elementId}`, n);
  });

  const rows: ProjectPlanRow[] = [];

  const getProcessStepName = (node: BpmnNodeData): string => {
    return node.hierarchyPath || node.elementName || node.elementId;
  };

  const mapLevel = (node: BpmnNodeData): ProjectPlanLevel => {
    if (node.jiraType === 'feature goal') return 'FG';
    if (node.jiraType === 'epic') return 'Epic';
    // För nu mappar vi resten till Story, Task/Defect kan införas senare vid behov
    return 'Story';
  };

  const addRowForNode = (node: BpmnNodeData, parentStepName: string | null, processOrder: number) => {
    const processStepName = getProcessStepName(node);

    const level = mapLevel(node);
    const summary =
      node.jiraName ||
      node.elementName ||
      node.hierarchyPath ||
      `${node.bpmnFile} - ${node.elementId}`;

    rows.push({
      processOrder,
      processStepName,
      level,
      summary,
      parent: parentStepName,
      bpmnFile: node.bpmnFile,
      bpmnNodeId: node.elementId,
      labels: [node.nodeType, node.jiraType || ''].filter(Boolean),
      dependencies: [],
    });
  };

  const visitTree = (node: ProcessTreeNode, parentStepName: string | null) => {
    const elementId = node.bpmnElementId || node.id;
    const key = `${node.bpmnFile}:${elementId}`;
    const bpmnNode = nodeMap.get(key);

    let currentStepName = parentStepName;

    if (bpmnNode) {
      const processOrder =
        typeof bpmnNode.orderIndex === 'number' ? bpmnNode.orderIndex + 1 : rows.length + 1;
      addRowForNode(bpmnNode, parentStepName, processOrder);
      currentStepName = getProcessStepName(bpmnNode);
    }

    node.children?.forEach((child) => {
      visitTree(child, currentStepName);
    });
  };

  if (processTree) {
    visitTree(processTree, null);
  } else {
    // Fallback: behåll bara befintlig ordning i bpmnNodes om vi inte har något träd
    bpmnNodes.forEach((node) => {
      addRowForNode(node, null, rows.length + 1);
    });
  }

  return rows;
}
