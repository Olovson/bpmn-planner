/**
 * @vitest-environment jsdom
 *
 * Real BPMN parse → buildBpmnProcessGraph integration tests for mortgage-fixtures.
 * Använder parseBpmnFile + bpmn-js via jsdom och fixtures under tests/fixtures/bpmn/.
 */

import { describe, it, expect } from 'vitest';
import {
  buildBpmnProcessGraph,
  getNodesByType,
  type BpmnProcessGraph,
} from '@/lib/bpmnProcessGraph';

describe('buildBpmnProcessGraph with mortgage fixtures (real parse)', () => {
  it(
    'builds process graph for mortgage-se-application with internal-data-gathering as root dependency',
    async () => {
      const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
        'mortgage-se-application.bpmn',
        ['mortgage-se-application.bpmn', 'mortgage-se-internal-data-gathering.bpmn'],
      );

      expect(graph.rootFile).toBe('mortgage-se-application.bpmn');

      const appNodes = graph.fileNodes.get('mortgage-se-application.bpmn') ?? [];
      const internalNodes =
        graph.fileNodes.get('mortgage-se-internal-data-gathering.bpmn') ?? [];

      expect(appNodes.length).toBeGreaterThan(0);
      expect(internalNodes.length).toBeGreaterThan(0);

      const callActivities = getNodesByType(graph, 'callActivity');
      const internalCall = callActivities.find(
        (node) => node.bpmnElementId === 'internal-data-gathering',
      );
      expect(internalCall).toBeDefined();

      const missingNames = graph.missingDependencies.map((d) => d.childProcess);
      expect(missingNames).toContain('Stakeholder');
      expect(missingNames).toContain('Object');
      expect(missingNames).toContain('Household');
    },
    60000,
  );

  it(
    'handles embedded + external + missing subprocesses for mortgage application without hanging',
    async () => {
      const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
        'mortgage-se-application.bpmn',
        ['mortgage-se-application.bpmn', 'mortgage-se-internal-data-gathering.bpmn'],
      );

      // Viktigast: anropet returnerar och vi kan inspektera grafen.
      expect(graph.rootFile).toBe('mortgage-se-application.bpmn');

      const callActivities = getNodesByType(graph, 'callActivity');
      const ids = callActivities.map((node) => node.bpmnElementId);

      // CallActivities både på rootnivå (internal-data-gathering, household)
      // och inuti embedded subprocess (stakeholder, object) ska finnas som noder.
      expect(ids).toContain('internal-data-gathering');
      expect(ids).toContain('household');
      expect(ids).toContain('stakeholder');
      expect(ids).toContain('object');

      const missingNames = graph.missingDependencies.map((d) => d.childProcess);
      expect(missingNames).toContain('Stakeholder');
      expect(missingNames).toContain('Object');
      expect(missingNames).toContain('Household');
    },
    60000,
  );
});

