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
    const effectIndex = html.indexOf('Effektmål');
    const epicsIndex = html.indexOf('Ingående Epics');
    const flowIndex = html.indexOf('Affärsflöde');
    const scenariosIndex = html.indexOf('Affärs-scenarion');
    const testsIndex = html.indexOf('Koppling till automatiska tester');
    const implIndex = html.indexOf('Implementation Notes (för dev)');
    const techDepsIndex = html.indexOf('Tekniska &amp; externa beroenden');
    const dorIndex = html.indexOf('Definition of Ready');
    const dodIndex = html.indexOf('Definition of Done');

    expect(h1Index).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(h1Index);
    expect(effectIndex).toBeGreaterThan(summaryIndex);
    expect(epicsIndex).toBeGreaterThan(effectIndex);
    expect(flowIndex).toBeGreaterThan(epicsIndex);
    expect(scenariosIndex).toBeGreaterThan(flowIndex);
    expect(testsIndex).toBeGreaterThan(scenariosIndex);
    expect(implIndex).toBeGreaterThan(testsIndex);
    expect(techDepsIndex).toBeGreaterThan(implIndex);
    expect(dorIndex).toBeGreaterThan(techDepsIndex);
    expect(dodIndex).toBeGreaterThan(dorIndex);
  });
}
);
