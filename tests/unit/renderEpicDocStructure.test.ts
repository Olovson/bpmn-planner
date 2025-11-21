import { describe, it, expect } from 'vitest';
import { renderEpicDoc } from '@/lib/documentationTemplates';
import type { NodeDocumentationContext } from '@/lib/documentationContext';

const buildContext = (type: 'userTask' | 'serviceTask'): NodeDocumentationContext => {
  const epicNode = {
    id: 'mortgage:Task_Approve',
    name: type === 'userTask' ? 'Granska ansökan' : 'Beräkna kreditunderlag',
    type,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Approve',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Previous',
    name: 'Föregående steg',
    type: 'userTask',
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Previous',
    children: [] as any[],
  };

  const downstreamNode = {
    id: 'mortgage:Task_Next',
    name: 'Nästa steg',
    type: 'serviceTask',
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Next',
    children: [] as any[],
  };

  return {
    node: epicNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [downstreamNode as any],
    siblingNodes: [],
    descendantNodes: [],
  };
};

describe('renderEpicDoc', () => {
  it('renders epic doc with expected section headings in order for User Task', () => {
    const context = buildContext('userTask');
    const html = renderEpicDoc(context, {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      docLink: undefined,
      dorLink: undefined,
      testLink: 'tests/mortgage.granska-ansokan.spec.ts',
      dmnLink: undefined,
    });

    const h1Index = html.indexOf('<h1>');
    const scopeIndex = html.indexOf('Syfte &amp; Scope');
    const triggerIndex = html.indexOf('Trigger &amp; Förutsättningar');
    const flowIndex = html.indexOf('Huvudflöde (High-level scenario)');
    const interactionsIndex = html.indexOf('Interaktioner &amp; Kanaler');
    const dataIndex = html.indexOf('Data &amp; Kontrakt');
    const rulesIndex = html.indexOf('Affärsregler &amp; Policykoppling');
    const testsIndex = html.indexOf('Testkriterier (affärsnivå)');
    const implIndex = html.indexOf('Implementation Notes (för dev/test)');
    const relatedIndex = html.indexOf('Relaterade steg &amp; artefakter');

    expect(h1Index).toBeGreaterThan(-1);
    expect(scopeIndex).toBeGreaterThan(h1Index);
    expect(triggerIndex).toBeGreaterThan(scopeIndex);
    expect(flowIndex).toBeGreaterThan(triggerIndex);
    expect(interactionsIndex).toBeGreaterThan(flowIndex);
    expect(dataIndex).toBeGreaterThan(interactionsIndex);
    expect(rulesIndex).toBeGreaterThan(dataIndex);
    expect(testsIndex).toBeGreaterThan(rulesIndex);
    expect(implIndex).toBeGreaterThan(testsIndex);
    expect(relatedIndex).toBeGreaterThan(implIndex);
  });
});

