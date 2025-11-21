import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  __setUseSchemaRenderingForTests,
} from '@/lib/documentationTemplates';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import { normalizeHtml } from '../utils/htmlNormalize';

const buildFeatureGoalContext = (): NodeDocumentationContext => {
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
    id: 'mortgage:Task_Epic',
    name: 'Collect Applicant Data',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Epic',
    children: [] as any[],
  };

  return {
    node: featureNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [epicNode as any],
    siblingNodes: [],
    descendantNodes: [epicNode as any],
  };
};

const buildEpicContext = (): NodeDocumentationContext => {
  const epicNode = {
    id: 'mortgage:Task_Approve',
    name: 'Approve Application',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Approve',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Previous',
    name: 'Previous Step',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.mpmn',
    bpmnElementId: 'Task_Previous',
    children: [] as any[],
  };

  const downstreamNode = {
    id: 'mortgage:Task_Next',
    name: 'Next Step',
    type: 'serviceTask' as const,
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

const buildBusinessRuleContext = (): NodeDocumentationContext => {
  const ruleNode = {
    id: 'mortgage:Rule_Eligibility',
    name: 'Eligibility Rule',
    type: 'businessRuleTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Rule_Eligibility',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Scoring',
    name: 'Run Scoring',
    type: 'serviceTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Scoring',
    children: [] as any[],
  };

  const downstreamNode = {
    id: 'mortgage:Task_Decision',
    name: 'Final Decision',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Decision',
    children: [] as any[],
  };

  return {
    node: ruleNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [downstreamNode as any],
    siblingNodes: [],
    descendantNodes: [],
  };
};

const links = {
  bpmnViewerLink: '#/bpmn/mortgage.bpmn',
  docLink: undefined,
  dorLink: undefined,
  testLink: 'tests/mortgage.example.spec.ts',
  dmnLink: '/dmn/example.dmn',
};

describe('documentation rendering regression (legacy vs schema)', () => {
  beforeEach(() => {
    __setUseSchemaRenderingForTests(false);
  });

  afterEach(() => {
    __setUseSchemaRenderingForTests(false);
  });

  it('Feature Goal legacy HTML matches snapshot and equals schema HTML (normalized)', () => {
    const ctx = buildFeatureGoalContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = renderFeatureGoalDoc(ctx, links);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('feature-goal-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = renderFeatureGoalDoc(ctx, links);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });

  it('Epic legacy HTML matches snapshot and equals schema HTML (normalized)', () => {
    const ctx = buildEpicContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = renderEpicDoc(ctx, links);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('epic-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = renderEpicDoc(ctx, links);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });

  it('Business Rule legacy HTML matches snapshot and equals schema HTML (normalized)', () => {
    const ctx = buildBusinessRuleContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = renderBusinessRuleDoc(ctx, links);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('business-rule-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = renderBusinessRuleDoc(ctx, links);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });
});
