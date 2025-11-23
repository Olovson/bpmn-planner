import type { BpmnNodeData } from '@/hooks/useAllBpmnNodes';

export const NODE_TYPE_FILTER_OPTIONS = [
  'Alla',
  'UserTask',
  'CallActivity',
  'BusinessRuleTask',
  'ServiceTask',
] as const;

export type NodeTypeFilterValue = (typeof NODE_TYPE_FILTER_OPTIONS)[number];

const normalizeType = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase();

/**
 * Filter helper for NodeMatrix "Typ"-kolumnen.
 * "Alla" returnerar ofiltrerad lista, annars filtreras på exakt node.nodeType.
 */
export function filterNodesByType(
  nodes: BpmnNodeData[],
  selectedType: NodeTypeFilterValue,
): BpmnNodeData[] {
  if (selectedType === 'Alla') {
    return [...nodes];
  }
  const target = normalizeType(selectedType);
  return nodes.filter(
    (node) => normalizeType(node.nodeType) === target,
  );
}

export function countNodesByType(
  nodes: BpmnNodeData[],
  type: NodeTypeFilterValue,
): number {
  if (type === 'Alla') {
    return nodes.length;
  }
  const target = normalizeType(type);
  return nodes.filter(
    (node) => normalizeType(node.nodeType) === target,
  ).length;
}
