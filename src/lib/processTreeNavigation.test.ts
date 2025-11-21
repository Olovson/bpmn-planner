import { describe, it, expect } from 'vitest';
import type { ProcessTreeNode } from '@/lib/processTree';
import { buildSubprocessNavigationMap } from '@/lib/processTreeNavigation';

describe('buildSubprocessNavigationMap', () => {
  const tree: ProcessTreeNode = {
    id: 'root',
    label: 'Root Process',
    type: 'process',
    bpmnFile: 'root.bpmn',
    bpmnElementId: 'Process_1',
    subprocessFile: undefined,
    children: [
      {
        id: 'root:Call_1',
        label: 'Call Feature',
        type: 'callActivity',
        bpmnFile: 'root.bpmn',
        bpmnElementId: 'Call_1',
        subprocessFile: 'feature.bpmn',
        children: [
          {
            id: 'feature:Task_1',
            label: 'Do work',
            type: 'userTask',
            bpmnFile: 'feature.bpmn',
            bpmnElementId: 'Task_1',
            children: [],
          },
        ],
      },
      {
        id: 'root:Call_2',
        label: 'Unresolved call',
        type: 'callActivity',
        bpmnFile: 'root.bpmn',
        bpmnElementId: 'Call_2',
        children: [],
      },
      {
        id: 'root:Decision_1',
        label: 'Decision node',
        type: 'dmnDecision',
        bpmnFile: 'root.bpmn',
        bpmnElementId: 'Decision_1',
        subprocessFile: 'should-not-be-used.bpmn',
        children: [],
      },
    ],
  };

  it('maps call activities with matched subprocess files', () => {
    const map = buildSubprocessNavigationMap(tree);
    expect(map.get('root.bpmn:Call_1')).toBe('feature.bpmn');
  });

  it('ignores call activities without a matched subprocess', () => {
    const map = buildSubprocessNavigationMap(tree);
    expect(map.has('root.bpmn:Call_2')).toBe(false);
  });

  it('ignores non-call activity nodes even if they have subprocess metadata', () => {
    const map = buildSubprocessNavigationMap(tree);
    expect(map.has('root.bpmn:Decision_1')).toBe(false);
  });
});
