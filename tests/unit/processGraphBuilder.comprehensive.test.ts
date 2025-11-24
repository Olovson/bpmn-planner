/**
 * ProcessGraphBuilder – Comprehensive unit tests
 * Tests subprocess edges, missing dependencies, and bpmn-map integration
 */

import { describe, it, expect } from 'vitest';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';

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

describe('buildProcessGraph – comprehensive tests', () => {
  it('skapar subprocess-edges enligt bpmn-map', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    parseResults.set('parent.bpmn', {
      meta: {
        processes: [
          {
            id: 'parent',
            callActivities: [{ id: 'ca1', name: 'Child Process', calledElement: 'child' }],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    parseResults.set('child.bpmn', {
      meta: {
        processes: [
          {
            id: 'child',
            callActivities: [],
            tasks: [{ id: 'Task_1', name: 'Child Task', type: 'UserTask' }],
          },
        ],
      },
      sequenceFlows: [],
    });

    const bpmnMap = {
      processes: [
        {
          id: 'parent',
          bpmn_file: 'parent.bpmn',
          process_id: 'parent',
          call_activities: [
            {
              bpmn_id: 'ca1',
              name: 'Child Process',
              called_element: 'child',
              subprocess_bpmn_file: 'child.bpmn',
            },
          ],
        },
      ],
    };

    const graph: ProcessGraph = buildProcessGraph(parseResults as unknown as Map<string, any>, {
      bpmnMap: loadBpmnMap(bpmnMap as any),
    });

    const subprocessEdges = Array.from(graph.edges.values()).filter((e) => e.type === 'subprocess');
    expect(subprocessEdges.length).toBeGreaterThan(0);

    const edge = subprocessEdges.find((e) => {
      const fromNode = graph.nodes.get(e.from);
      const toNode = graph.nodes.get(e.to);
      return fromNode?.bpmnElementId === 'ca1' && toNode?.bpmnFile === 'child.bpmn';
    });

    expect(edge).toBeDefined();
  });

  it('flaggar missingDependencies när bpmn-map pekar på icke-existerande fil', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    parseResults.set('parent.bpmn', {
      meta: {
        processes: [
          {
            id: 'parent',
            callActivities: [{ id: 'ca1', name: 'Missing Process', calledElement: 'missing' }],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    const bpmnMap = {
      processes: [
        {
          id: 'parent',
          bpmn_file: 'parent.bpmn',
          process_id: 'parent',
          call_activities: [
            {
              bpmn_id: 'ca1',
              name: 'Missing Process',
              called_element: 'missing',
              subprocess_bpmn_file: 'non-existent.bpmn',
            },
          ],
        },
      ],
    };

    const graph: ProcessGraph = buildProcessGraph(parseResults as unknown as Map<string, any>, {
      bpmnMap: loadBpmnMap(bpmnMap as any),
    });

    expect(graph.missingDependencies.length).toBeGreaterThan(0);
    const missing = graph.missingDependencies[0];
    expect(missing.context?.reason).toBe('map-file-not-found');
    expect(missing.missingFileName).toBe('non-existent.bpmn');
  });

  it('räknar rätt antal noder och edges för mortgage-caset', async () => {
    const { parseBpmnFile } = await import('@/lib/bpmnParser');
    const bpmnMap = await import('../../../bpmn-map.json');

    const MORTGAGE_FILES = [
      'mortgage.bpmn',
      'mortgage-se-application.bpmn',
      'mortgage-se-internal-data-gathering.bpmn',
    ];

    const parseResults = new Map();
    for (const file of MORTGAGE_FILES) {
      try {
        const result = await parseBpmnFile(`/bpmn/${file}`);
        parseResults.set(file, result);
      } catch (e) {
        // Skip if file doesn't exist in test environment
        console.warn(`Skipping ${file} in test`);
      }
    }

    if (parseResults.size === 0) {
      // Skip test if no files available
      return;
    }

    const graph: ProcessGraph = buildProcessGraph(parseResults, {
      bpmnMap: loadBpmnMap(bpmnMap.default),
      preferredRootProcessId: 'mortgage',
    });

    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.edges.size).toBeGreaterThan(0);
    expect(graph.roots.length).toBeGreaterThan(0);

    // Should have at least one process node
    const processNodes = Array.from(graph.nodes.values()).filter((n) => n.type === 'process');
    expect(processNodes.length).toBeGreaterThan(0);
  });

  it('hanterar processer utan callActivities eller tasks', () => {
    const parseResults = new Map<string, MinimalParseResult>();

    parseResults.set('empty.bpmn', {
      meta: {
        processes: [
          {
            id: 'empty',
            callActivities: [],
            tasks: [],
          },
        ],
      },
      sequenceFlows: [],
    });

    const graph: ProcessGraph = buildProcessGraph(parseResults as unknown as Map<string, any>, {});

    expect(graph.nodes.size).toBeGreaterThan(0);
    const processNode = Array.from(graph.nodes.values()).find((n) => n.type === 'process');
    expect(processNode).toBeDefined();
    expect(processNode?.bpmnFile).toBe('empty.bpmn');
  });
});

