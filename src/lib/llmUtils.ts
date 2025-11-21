import type { BpmnElement } from './bpmnParser';

export function buildBpmnElementSummary(element: BpmnElement) {
  return {
    id: element.id,
    name: element.name,
    type: element.type,
    documentation: element.documentation,
    incoming: element.incoming,
    outgoing: element.outgoing,
  };
}
