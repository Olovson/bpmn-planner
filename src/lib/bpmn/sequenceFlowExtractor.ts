import type { BpmnParseResult } from '@/lib/bpmnParser';
import type { ProcessGraphNode } from './processGraph';

export interface NormalizedSequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
  condition?: string;
}

export function extractSequenceFlows(parseResult: BpmnParseResult): NormalizedSequenceFlow[] {
  return (parseResult.sequenceFlows || []).map((flow) => ({
    id: flow.id,
    sourceRef: flow.sourceRef,
    targetRef: flow.targetRef,
    // BpmnSequenceFlow har idag ingen condition – reserverad för framtiden.
    condition: undefined,
  }));
}

export function buildSequenceGraph(
  nodes: ProcessGraphNode[],
  flows: NormalizedSequenceFlow[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const node of nodes) {
    graph.set(node.id, []);
  }

  for (const flow of flows) {
    const sourceNode = nodes.find((n) => n.bpmnElementId === flow.sourceRef);
    const targetNode = nodes.find((n) => n.bpmnElementId === flow.targetRef);
    if (sourceNode && targetNode) {
      graph.get(sourceNode.id)!.push(targetNode.id);
    }
  }

  return graph;
}

export function findStartNodes(
  nodes: ProcessGraphNode[],
  flows: NormalizedSequenceFlow[],
): string[] {
  const targets = new Set(flows.map((f) => f.targetRef));
  return nodes
    .filter((n) => !targets.has(n.bpmnElementId))
    .map((n) => n.id);
}

