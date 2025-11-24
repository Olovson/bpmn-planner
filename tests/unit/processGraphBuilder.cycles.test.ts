/**
 * ProcessGraphBuilder – Cycles & map-mismatch
 *
 * Tester att cykler i subprocess-kedjan detekteras och att bpmn-map mismatch
 * ger MissingDependency.
 */

import { describe, it, expect } from 'vitest';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';

// Minimal BpmnParseResult-typ för test (importerar inte full parser här)
interface MinimalProcess {
  id: string;
  name?: string;
  callActivities?: Array<{ id: string; name?: string; calledElement?: string | null }>;
  tasks?: Array<{ id: string; name?: string; type: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' }>;
}

interface MinimalMeta {
  processes: MinimalProcess[];
}

interface MinimalParseResult {
  meta: MinimalMeta;
  sequenceFlows: { id: string; sourceRef: string; targetRef: string }[];
}

describe('buildProcessGraph – cycles & map mismatch', () => {
  it('detekterar enkel cykel mellan två processer via subprocess-edges', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    // process-a.bpmn
    parseResults.set('process-a.bpmn', {
      meta: {
        processes: [
          {
            id: 'process-a',
            callActivities: [{ id: 'to-b', name: 'To B', calledElement: 'process-b' }],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    // process-b.bpmn
    parseResults.set('process-b.bpmn', {
      meta: {
        processes: [
          {
            id: 'process-b',
            callActivities: [{ id: 'to-a', name: 'To A', calledElement: 'process-a' }],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    const graph: ProcessGraph = buildProcessGraph(
      parseResults as unknown as Map<string, any>,
      {},
    );

    expect(graph.cycles.length).toBeGreaterThan(0);
    const cycleNodes = graph.cycles[0].nodes;
    expect(cycleNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('flaggar MissingDependency när bpmn-map saknar subprocess-fil', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    parseResults.set('root.bpmn', {
      meta: {
        processes: [
          {
            id: 'root',
            callActivities: [
              { id: 'ca-missing', name: 'Missing CA', calledElement: 'missing-proc' },
            ],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    const fakeMap = {
      processes: [
        {
          id: 'root',
          bpmn_file: 'root.bpmn',
          process_id: 'root',
          call_activities: [
            {
              bpmn_id: 'ca-missing',
              name: 'Missing CA',
              called_element: 'missing-proc',
              subprocess_bpmn_file: 'non-existent.bpmn',
            },
          ],
        },
      ],
    };

    const graph: ProcessGraph = buildProcessGraph(
      parseResults as unknown as Map<string, any>,
      { bpmnMap: fakeMap as any },
    );

    expect(graph.missingDependencies.length).toBeGreaterThan(0);
    const reasons = graph.missingDependencies.map((m) => m.context?.reason);
    expect(reasons).toContain('map-file-not-found');
  });

  it('tilldelar lokalt orderIndex per fil baserat på sequence flows', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    parseResults.set('simple.bpmn', {
      meta: {
        processes: [
          {
            id: 'simple',
            callActivities: [],
            tasks: [
              { id: 'Task_1', name: 'First', type: 'UserTask' },
              { id: 'Task_2', name: 'Second', type: 'UserTask' },
              { id: 'Task_3', name: 'Third', type: 'UserTask' },
            ],
          },
        ],
      },
      sequenceFlows: [
        { id: 'Flow_1', sourceRef: 'Task_1', targetRef: 'Task_2' },
        { id: 'Flow_2', sourceRef: 'Task_2', targetRef: 'Task_3' },
      ],
    });

    const graph: ProcessGraph = buildProcessGraph(
      parseResults as unknown as Map<string, any>,
      {},
    );

    const nodes = Array.from(graph.nodes.values()).filter(
      (n) => n.bpmnFile === 'simple.bpmn' && n.type === 'userTask',
    );
    const orderIndexes = nodes
      .map((n) => n.metadata.orderIndex as number)
      .sort((a, b) => a - b);

    expect(orderIndexes).toEqual([0, 1, 2]);
  });
});

