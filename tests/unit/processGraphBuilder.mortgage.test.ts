/**
 * ProcessGraphBuilder – Mortgage-case
 *
 * Tester att buildProcessGraph bygger en stabil graf för mortgage-fixtures.
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import bpmnMap from '../../../bpmn-map.json';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';

const MORTGAGE_FILES: string[] = [
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
  'mortgage-se-object.bpmn',
  'mortgage-se-object-information.bpmn',
];

describe('buildProcessGraph – mortgage fixtures', () => {
  it(
    'bygger graf med Mortgage som root och subprocess-edges för nyckelsteg',
    async () => {
      const parseResults = new Map<string, Awaited<ReturnType<typeof parseBpmnFile>>>();

      for (const file of MORTGAGE_FILES) {
        const result = await parseBpmnFile(`/bpmn/${file}`);
        parseResults.set(file, result);
      }

      const graph: ProcessGraph = buildProcessGraph(parseResults, {
        bpmnMap: loadBpmnMap(bpmnMap),
        preferredRootProcessId: 'mortgage',
      });

      // Det finns noder och edges
      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(graph.edges.size).toBeGreaterThan(0);

      // Mortgage-processen ska finnas och vara först i roots
      const rootId = graph.roots[0];
      const rootNode = graph.nodes.get(rootId);
      expect(rootNode).toBeDefined();
      expect(rootNode?.type).toBe('process');
      expect(rootNode?.bpmnFile).toBe('mortgage.bpmn');

      // Det ska finnas subprocess-edges för några centrala steg i mortgage.bpmn
      const subprocessEdges = Array.from(graph.edges.values()).filter(
        (e) => e.type === 'subprocess',
      );
      expect(subprocessEdges.length).toBeGreaterThan(0);

      const edgeTargets = subprocessEdges.map((e) => graph.nodes.get(e.to)?.bpmnFile);
      expect(edgeTargets).toContain('mortgage-se-application.bpmn');
      expect(edgeTargets).toContain('mortgage-se-offer.bpmn');
      expect(edgeTargets).toContain('mortgage-se-signing.bpmn');
      expect(edgeTargets).toContain('mortgage-se-disbursement.bpmn');

      // Tasks som Fetch fastighets-information ska finnas som noder
      const nodeNames = Array.from(graph.nodes.values()).map((n) => n.name);
      expect(nodeNames).toContain('Fetch fastighets-information');
      expect(nodeNames).toContain('Fetch bostadsrätts-information');
      expect(nodeNames).toContain('Fetch BRF-information');
    },
    120_000,
  );
});

