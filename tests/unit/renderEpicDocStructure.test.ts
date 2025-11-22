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
    const scopeIndex = html.indexOf('Syfte &amp; Effekt');
    const inputsIndex = html.indexOf('Inputs');
    const flowIndex = html.indexOf('Funktionellt flöde');
    const outputIndex = html.indexOf('Output');
    const rulesIndex = html.indexOf('Affärsregler som triggas');
    const scenariosIndex = html.indexOf('Affärs-scenarion (tabell)');
    const testsIndex = html.indexOf('Koppling till automatiska tester');
    const implIndex = html.indexOf('Implementation Notes');
    const dorIndex = html.indexOf('Definition of Ready');
    const dodIndex = html.indexOf('Definition of Done');

    expect(h1Index).toBeGreaterThan(-1);
    expect(scopeIndex).toBeGreaterThan(h1Index);
    expect(inputsIndex).toBeGreaterThan(scopeIndex);
    expect(flowIndex).toBeGreaterThan(inputsIndex);
    expect(outputIndex).toBeGreaterThan(flowIndex);
    expect(rulesIndex).toBeGreaterThan(outputIndex);
    expect(scenariosIndex).toBeGreaterThan(rulesIndex);
    expect(testsIndex).toBeGreaterThan(scenariosIndex);
    expect(implIndex).toBeGreaterThan(testsIndex);
    expect(dorIndex).toBeGreaterThan(implIndex);
    expect(dodIndex).toBeGreaterThan(dorIndex);
  });
});
