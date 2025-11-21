import { BpmnProcessGraph, BpmnProcessNode } from './bpmnProcessGraph';

export interface NodeDocumentationContext {
  node: BpmnProcessNode;
  parentChain: BpmnProcessNode[];
  childNodes: BpmnProcessNode[];
  siblingNodes: BpmnProcessNode[];
  descendantNodes: BpmnProcessNode[];
}

function collectDescendants(node: BpmnProcessNode): BpmnProcessNode[] {
  const result: BpmnProcessNode[] = [];
  const stack = [...node.children];
  while (stack.length) {
    const current = stack.shift()!;
    result.push(current);
    if (current.children?.length) {
      stack.push(...current.children);
    }
  }
  return result;
}

function findPath(
  current: BpmnProcessNode,
  targetId: string,
  trail: BpmnProcessNode[] = []
): BpmnProcessNode[] | null {
  const nextTrail = [...trail, current];
  if (current.id === targetId) {
    return nextTrail;
  }
  for (const child of current.children) {
    const match = findPath(child, targetId, nextTrail);
    if (match) {
      return match;
    }
  }
  return null;
}

export function buildNodeDocumentationContext(
  graph: BpmnProcessGraph,
  nodeId: string
): NodeDocumentationContext | null {
  const node = graph.allNodes.get(nodeId);
  if (!node) return null;

  const path = findPath(graph.root, nodeId);
  const parentChain = path ? path.slice(0, -1) : [];
  const parentNode = parentChain.length ? parentChain[parentChain.length - 1] : undefined;
  const siblingNodes = parentNode
    ? parentNode.children.filter((child) => child.id !== node.id)
    : [];

  return {
    node,
    parentChain,
    childNodes: node.children,
    siblingNodes,
    descendantNodes: collectDescendants(node),
  };
}
