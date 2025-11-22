import { describe, it, expect } from 'vitest';
import { renderFeatureGoalDoc } from '@/lib/documentationTemplates';
import type { NodeDocumentationContext } from '@/lib/documentationContext';

const buildContext = (): NodeDocumentationContext => {
  const featureNode = {
    id: 'mortgage:Call_Feature',
    name: 'Application Assessment',
    type: 'callActivity' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Call_Feature',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Start',
    name: 'Start Application',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Start',
    children: [] as any[],
  };

  const epicNode = {
    id: 'mortgage:Task_Collect',
    name: 'Collect Applicant Data',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Collect',
    children: [] as any[],
  };

  return {
    node: featureNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [epicNode as any],
    siblingNodes: [],
    descendantNodes: [],
  };
};

describe('renderFeatureGoalDoc', () => {
  it('renders feature goal doc with expected section headings in order (local)', () => {
    const context = buildContext();
    const html = renderFeatureGoalDoc(context, {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      docLink: undefined,
      dorLink: undefined,
      testLink: 'tests/mortgage.application-assessment.spec.ts',
      dmnLink: undefined,
    });

    const h1Index = html.indexOf('<h1>');
    const summaryIndex = html.indexOf('Sammanfattning &amp; scope');
    const scopeIndex = html.indexOf('Omfattning &amp; Avgränsningar');
    const epicsIndex = html.indexOf('Ingående Epics');
    const flowIndex = html.indexOf('Affärsflöde');
    const depsIndex = html.indexOf('Kritiska beroenden');
    const scenariosIndex = html.indexOf('Affärs-scenarion');
    const testsIndex = html.indexOf('Koppling till automatiska tester');
    const implIndex = html.indexOf('Implementation Notes (för dev)');
    const relatedIndex = html.indexOf('Relaterade regler / subprocesser');

    expect(h1Index).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(h1Index);
    expect(scopeIndex).toBeGreaterThan(summaryIndex);
    expect(epicsIndex).toBeGreaterThan(scopeIndex);
    expect(flowIndex).toBeGreaterThan(epicsIndex);
    expect(depsIndex).toBeGreaterThan(flowIndex);
    expect(scenariosIndex).toBeGreaterThan(depsIndex);
    expect(testsIndex).toBeGreaterThan(scenariosIndex);
    expect(implIndex).toBeGreaterThan(testsIndex);
    expect(relatedIndex).toBeGreaterThan(implIndex);
  });
}
);

