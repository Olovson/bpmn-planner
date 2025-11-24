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

  it(
    'matches key mortgage callActivities in mortgage.bpmn to mortgage-se-* subprocess files',
    async () => {
      const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
        'mortgage.bpmn',
        [
          'mortgage.bpmn',
          'mortgage-se-application.bpmn',
          'mortgage-se-internal-data-gathering.bpmn',
          'mortgage-se-mortgage-commitment.bpmn',
          'mortgage-se-credit-evaluation.bpmn',
          'mortgage-se-appeal.bpmn',
          'mortgage-se-manual-credit-evaluation.bpmn',
          'mortgage-se-kyc.bpmn',
          'mortgage-se-credit-decision.bpmn',
          'mortgage-se-offer.bpmn',
          'mortgage-se-document-generation.bpmn',
          'mortgage-se-signing.bpmn',
          'mortgage-se-disbursement.bpmn',
          'mortgage-se-collateral-registration.bpmn',
        ],
      );

      expect(graph.rootFile).toBe('mortgage.bpmn');

      const callActivities = getNodesByType(graph, 'callActivity');
      const find = (id: string) =>
        callActivities.find(
          (node) => node.bpmnFile === 'mortgage.bpmn' && node.bpmnElementId === id,
        );

      expect(find('application')?.subprocessFile).toBe('mortgage-se-application.bpmn');
      expect(find('mortgage-commitment')?.subprocessFile).toBe('mortgage-se-mortgage-commitment.bpmn');
      expect(find('credit-evaluation')?.subprocessFile).toBe('mortgage-se-credit-evaluation.bpmn');
      expect(find('appeal')?.subprocessFile).toBe('mortgage-se-appeal.bpmn');
      expect(find('manual-credit-evaluation')?.subprocessFile).toBe(
        'mortgage-se-manual-credit-evaluation.bpmn',
      );
      expect(find('kyc')?.subprocessFile).toBe('mortgage-se-kyc.bpmn');
      expect(find('credit-decision')?.subprocessFile).toBe('mortgage-se-credit-decision.bpmn');
      expect(find('offer')?.subprocessFile).toBe('mortgage-se-offer.bpmn');
      expect(find('document-generation')?.subprocessFile).toBe('mortgage-se-document-generation.bpmn');
      expect(find('signing')?.subprocessFile).toBe('mortgage-se-signing.bpmn');
      expect(find('disbursement')?.subprocessFile).toBe('mortgage-se-disbursement.bpmn');
      expect(find('signing-advance')?.subprocessFile).toBe('mortgage-se-signing.bpmn');
      expect(find('disbursement-advance')?.subprocessFile).toBe('mortgage-se-disbursement.bpmn');
      expect(find('collateral-registration')?.subprocessFile).toBe(
        'mortgage-se-collateral-registration.bpmn',
      );
    },
    60000,
  );
});
