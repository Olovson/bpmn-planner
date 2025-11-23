import { describe, it, expect } from 'vitest';
import {
  filterNodesByType,
  NODE_TYPE_FILTER_OPTIONS,
  type NodeTypeFilterValue,
} from '@/lib/nodeMatrixFiltering';
import type { BpmnNodeData } from '@/hooks/useAllBpmnNodes';

const makeNode = (overrides: Partial<BpmnNodeData>): BpmnNodeData => ({
  bpmnFile: 'mortgage.bpmn',
  elementId: 'id',
  elementName: 'Element',
  nodeType: 'UserTask',
  figmaUrl: undefined,
  confluenceUrl: undefined,
  testFilePath: undefined,
  jiraIssues: undefined,
  testReportUrl: undefined,
  dorDodUrl: undefined,
  hasDocs: false,
  hasTestReport: false,
  hasDorDod: false,
  documentationUrl: undefined,
  jiraType: null,
  jiraName: null,
  hierarchyPath: undefined,
  subprocessMatchStatus: undefined,
  diagnosticsSummary: null,
  ...overrides,
});

describe('filterNodesByType (NodeMatrix Typ-filter)', () => {
  const nodes: BpmnNodeData[] = [
    makeNode({ elementId: 'u1', nodeType: 'UserTask' }),
    makeNode({ elementId: 'u2', nodeType: 'UserTask' }),
    makeNode({ elementId: 'c1', nodeType: 'CallActivity' }),
    makeNode({ elementId: 'b1', nodeType: 'BusinessRuleTask' }),
    makeNode({ elementId: 's1', nodeType: 'ServiceTask' }),
  ];

  it('returns all nodes when selectedType is "Alla"', () => {
    const result = filterNodesByType(nodes, 'Alla');
    expect(result.map((n) => n.elementId)).toEqual(['u1', 'u2', 'c1', 'b1', 's1']);
  });

  it('filters only UserTask nodes', () => {
    const result = filterNodesByType(nodes, 'UserTask');
    expect(result.map((n) => n.elementId)).toEqual(['u1', 'u2']);
  });

  it('filters only CallActivity nodes', () => {
    const result = filterNodesByType(nodes, 'CallActivity');
    expect(result.map((n) => n.elementId)).toEqual(['c1']);
  });

  it('filters only BusinessRuleTask nodes', () => {
    const result = filterNodesByType(nodes, 'BusinessRuleTask');
    expect(result.map((n) => n.elementId)).toEqual(['b1']);
  });

  it('filters only ServiceTask nodes', () => {
    const result = filterNodesByType(nodes, 'ServiceTask');
    expect(result.map((n) => n.elementId)).toEqual(['s1']);
  });

  it('normalizes types when filtering (trailing spaces etc.)', () => {
    const dirtyNodes: BpmnNodeData[] = [
      makeNode({ elementId: 'u-dirty', nodeType: 'UserTask ' as any }),
      makeNode({ elementId: 'c-dirty', nodeType: ' callactivity' as any }),
    ];

    const userTasks = filterNodesByType(dirtyNodes, 'UserTask');
    expect(userTasks.map((n) => n.elementId)).toEqual(['u-dirty']);

    const callActivities = filterNodesByType(dirtyNodes, 'CallActivity');
    expect(callActivities.map((n) => n.elementId)).toEqual(['c-dirty']);
  });

  it('uses the same options as the NodeMatrix UI', () => {
    const allOptions: NodeTypeFilterValue[] = NODE_TYPE_FILTER_OPTIONS;
    expect(allOptions).toContain('Alla');
    expect(allOptions).toContain('UserTask');
    expect(allOptions).toContain('CallActivity');
    expect(allOptions).toContain('BusinessRuleTask');
    expect(allOptions).toContain('ServiceTask');
  });
});
