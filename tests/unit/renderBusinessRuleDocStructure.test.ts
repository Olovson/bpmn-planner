import { describe, it, expect } from 'vitest';
import { renderBusinessRuleDoc } from '@/lib/documentationTemplates';
import type { NodeDocumentationContext } from '@/lib/documentationContext';

describe('renderBusinessRuleDoc', () => {
  const buildContext = (): NodeDocumentationContext => {
    const ruleNode = {
      id: 'mortgage:Rule_1',
      name: 'Pre-screen Party Rules',
      type: 'businessRuleTask' as const,
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Rule_1',
      children: [] as any[],
    };

    const upstreamNode = {
      id: 'mortgage:Task_PreScreen',
      name: 'Pre-screen Party',
      type: 'userTask' as const,
      bpmnFile: 'mortgage.mpmn',
      bpmnElementId: 'Task_PreScreen',
      children: [] as any[],
    };

    return {
      node: ruleNode as any,
      parentChain: [upstreamNode as any],
      childNodes: [],
      siblingNodes: [],
      descendantNodes: [],
    };
  };

  it('renders business rule doc with expected section headings in order', () => {
    const context = buildContext();
    const html = renderBusinessRuleDoc(context, {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      dmnLink: '/dmn/pre-screen-party.dmn',
      testLink: 'tests/pre-screen-party.rules.spec.ts',
      dorLink: undefined,
      docLink: undefined,
    });

    const h1Index = html.indexOf('<h1>');
    const summaryIndex = html.indexOf('Sammanfattning &amp; scope');
    const contextIndex = html.indexOf('Förutsättningar &amp; kontext');
    const inputsIndex = html.indexOf('Inputs &amp; datakällor');
    const logicIndex = html.indexOf('Beslutslogik (DMN / regler)');
    const outputIndex = html.indexOf('Output &amp; effekter');
    const policyIndex = html.indexOf('Affärsregler &amp; policystöd');
    const scenariosIndex = html.indexOf('Nyckelscenarier / testkriterier (affärsnivå)');
    const implIndex = html.indexOf('Implementation &amp; integrationsnoter');
    const relatedIndex = html.indexOf('Relaterade regler &amp; subprocesser');

    expect(h1Index).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(h1Index);
    expect(contextIndex).toBeGreaterThan(summaryIndex);
    expect(inputsIndex).toBeGreaterThan(contextIndex);
    expect(logicIndex).toBeGreaterThan(inputsIndex);
    expect(outputIndex).toBeGreaterThan(logicIndex);
    expect(policyIndex).toBeGreaterThan(outputIndex);
    expect(scenariosIndex).toBeGreaterThan(policyIndex);
    expect(implIndex).toBeGreaterThan(scenariosIndex);
    expect(relatedIndex).toBeGreaterThan(implIndex);
  });
});
