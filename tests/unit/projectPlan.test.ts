import { describe, it, expect } from 'vitest';
import type { BpmnNodeData } from '@/hooks/useAllBpmnNodes';
import { buildProjectPlanRows } from '@/lib/projectPlan';
import type { ProcessTreeNode } from '@/lib/processTree';

const makeNode = (overrides: Partial<BpmnNodeData>): BpmnNodeData => ({
  bpmnFile: 'mortgage.bpmn',
  elementId: 'id',
  elementName: 'Node',
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

describe('buildProjectPlanRows', () => {
  const simpleTree: ProcessTreeNode = {
    id: 'root',
    label: 'Root',
    type: 'process',
    bpmnFile: 'mortgage.bpmn',
    children: [
      {
        id: 'fg',
        label: 'FG',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'fg',
        children: [],
      },
      {
        id: 'ep',
        label: 'EP',
        type: 'userTask',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'ep',
        children: [],
      },
      {
        id: 'st',
        label: 'ST',
        type: 'serviceTask',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'st',
        children: [],
      },
    ],
  } as ProcessTreeNode;

  it('returnerar tom lista för tom input', () => {
    const rows = buildProjectPlanRows(simpleTree, []);
    expect(rows).toEqual([]);
  });

  it('tilldelar processOrder i arrayordning', () => {
    const nodes: BpmnNodeData[] = [
      makeNode({ elementId: 'fg', elementName: 'FG', jiraType: 'feature goal' }),
      makeNode({ elementId: 'ep', elementName: 'EP', jiraType: 'epic' }),
      makeNode({ elementId: 'st', elementName: 'ST', jiraType: null }),
    ];

    const rows = buildProjectPlanRows(simpleTree, nodes);
    expect(rows.map((r) => r.processOrder)).toEqual([1, 2, 3]);
  });

  it('sätter Level baserat på jiraType', () => {
    const nodes: BpmnNodeData[] = [
      makeNode({ elementId: 'fg', elementName: 'FG', jiraType: 'feature goal' }),
      makeNode({ elementId: 'ep', elementName: 'EP', jiraType: 'epic' }),
      makeNode({ elementId: 'st', elementName: 'ST', jiraType: null }),
    ];

    const rows = buildProjectPlanRows(simpleTree, nodes);
    expect(rows.map((r) => r.level)).toEqual(['FG', 'Epic', 'Story']);
  });

  it('kopplar parent till närmaste Feature Goal i samma fil', () => {
    const fg = makeNode({
      elementId: 'fg1',
      elementName: 'Mortgage',
      jiraType: 'feature goal',
      hierarchyPath: 'mortgage',
    });
    const epic = makeNode({
      elementId: 'ep1',
      elementName: 'Application',
      jiraType: 'epic',
      hierarchyPath: 'mortgage - application',
    });

    const tree: ProcessTreeNode = {
      id: 'root',
      label: 'Root',
      type: 'process',
      bpmnFile: 'mortgage.bpmn',
      children: [
        {
          id: 'fg1',
          label: 'Mortgage',
          type: 'callActivity',
          bpmnFile: 'mortgage.bpmn',
          bpmnElementId: 'fg1',
          children: [
            {
              id: 'ep1',
              label: 'Application',
              type: 'userTask',
              bpmnFile: 'mortgage.bpmn',
              bpmnElementId: 'ep1',
              children: [],
            },
          ],
        },
      ],
    } as ProcessTreeNode;

    const rows = buildProjectPlanRows(tree, [fg, epic]);
    const epicRow = rows.find((r) => r.bpmnNodeId === 'ep1')!;

    expect(epicRow.parent).toBe('mortgage');
  });
});
