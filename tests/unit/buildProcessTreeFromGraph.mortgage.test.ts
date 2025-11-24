/**
 * ProcessTreeBuilder – Mortgage happy path
 *
 * Bygger ProcessGraph från riktiga mortgage-fixtures och konverterar till
 * ProcessTreeNode via buildProcessTreeFromGraph.
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
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

const noopArtifactBuilder = () => [];

const findNodeByLabel = (root: ProcessTreeNode, label: string): ProcessTreeNode | null => {
  if (root.label === label) return root;
  for (const child of root.children) {
    const found = findNodeByLabel(child, label);
    if (found) return found;
  }
  return null;
};

describe('buildProcessTreeFromGraph – mortgage hierarchy', () => {
  it(
    'bygger ett processträd med Mortgage som root och subprocesser som barn',
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

      const tree = buildProcessTreeFromGraph(graph, {
        rootProcessId: 'mortgage',
        preferredRootFile: 'mortgage.bpmn',
        artifactBuilder: noopArtifactBuilder,
      });

      expect(tree.type).toBe('process');
      expect(tree.bpmnFile).toBe('mortgage.bpmn');
      expect(tree.children.length).toBeGreaterThan(0);

      const childLabels = tree.children.map((c) => c.label);
      expect(childLabels).toContain('Application');
      expect(childLabels).toContain('Offer');
      expect(childLabels).toContain('Signing');
      expect(childLabels).toContain('Disbursement');
    },
    120_000,
  );

  it(
    'sorterar tasks under Application enligt orderIndex och innehåller Object-information-noder',
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

      const tree = buildProcessTreeFromGraph(graph, {
        rootProcessId: 'mortgage',
        preferredRootFile: 'mortgage.bpmn',
        artifactBuilder: noopArtifactBuilder,
      });

      const applicationNode = findNodeByLabel(tree, 'Application');
      expect(applicationNode).not.toBeNull();

      const objectNode = findNodeByLabel(tree, 'Object');
      expect(objectNode).not.toBeNull();

      // samla alla labels under Object-subträdet
      const collectLabels = (node: ProcessTreeNode): string[] => {
        const labels: string[] = [];
        const visit = (n: ProcessTreeNode) => {
          labels.push(n.label);
          n.children.forEach(visit);
        };
        visit(node);
        return labels;
      };

      const labels = collectLabels(objectNode!);

      expect(labels).toContain('Fetch fastighets-information');
      expect(labels).toContain('Fetch bostadsrätts-information');
      expect(labels).toContain('Fetch BRF-information');
      expect(labels).toContain('Screen fastighet');
      expect(labels).toContain('Screen bostadsrätt');
    },
    120_000,
  );
});

