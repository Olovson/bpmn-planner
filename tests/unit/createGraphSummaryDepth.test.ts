import { describe, it, expect, vi } from 'vitest';
import type { BpmnProcessGraph, BpmnProcessNode } from '@/lib/bpmnProcessGraph';

const chain = (): BpmnProcessNode => ({
  id: 'root:Root',
  name: 'Root',
  type: 'process',
  bpmnFile: 'root.bpmn',
  bpmnElementId: 'root',
  children: [
    {
      id: 'root:Call_A',
      name: 'Call A',
      type: 'callActivity',
      bpmnFile: 'root.bpmn',
      bpmnElementId: 'Call_A',
      children: [
        {
          id: 'child:Call_B',
          name: 'Call B',
          type: 'callActivity',
          bpmnFile: 'child.bpmn',
          bpmnElementId: 'Call_B',
          children: [
            {
              id: 'grand:Task_1',
              name: 'Deep Task',
              type: 'userTask',
              bpmnFile: 'grand.bpmn',
              bpmnElementId: 'Task_1',
              children: [],
            },
          ],
        },
      ],
    },
  ],
});

describe('createGraphSummary', () => {
  it(
    'calculates depth based on all levels (nodes), not just edges',
    async () => {
    // Provide localStorage mock before importing supabase client consumers
    const memoryStorage = (() => {
      const store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k]);
        },
      };
    })();
    vi.stubGlobal('localStorage', memoryStorage);

    // Dynamic import after stubbing globals
    const { createGraphSummary } = await import('../../src/lib/bpmnProcessGraph.ts');

    const root = chain();
    const graph: BpmnProcessGraph = {
      rootFile: 'root.bpmn',
      root,
      allNodes: new Map([
        [root.id, root],
        [root.children[0].id, root.children[0]],
        [root.children[0].children[0].id, root.children[0].children[0]],
        [root.children[0].children[0].children[0].id, root.children[0].children[0].children[0]],
      ]),
      fileNodes: new Map([
        ['root.bpmn', [root, root.children[0]]],
        ['child.bpmn', [root.children[0].children[0]]],
        ['grand.bpmn', [root.children[0].children[0].children[0]]],
      ]),
      missingDependencies: [],
    };

    const summary = createGraphSummary(graph);
    expect(summary.hierarchyDepth).toBe(4); // Root + Call A + Call B + Deep Task
  },
    15000,
  );
});
