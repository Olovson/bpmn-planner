/**
 * @vitest-environment jsdom
 *
 * buildBpmnProcessGraph → buildProcessTreeFromGraph integration tests for
 * mortgage-fixtures. Detta verifierar att Process Explorer kan bygga ett
 * komplett processträd direkt från grafen utan bpmn_files.meta.
 */

import { describe, it, expect } from 'vitest';
import {
  buildBpmnProcessGraph,
  type BpmnProcessGraph,
} from '@/lib/bpmnProcessGraph';
import {
  buildProcessTreeFromGraph,
  type ArtifactBuilder,
} from '@/lib/bpmn/buildProcessTreeFromGraph';
import type { ProcessTreeNode } from '@/lib/processTree';

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
  'mortgage-se-object-control.bpmn',
  'mortgage-se-object-valuation.bpmn',
  'mortgage-se-household.bpmn',
  'mortgage-se-stakeholder.bpmn',
  'mortgage-se-documentation-assessment.bpmn',
];

const noopArtifactBuilder: ArtifactBuilder = () => undefined;

const findNode = (
  root: ProcessTreeNode,
  predicate: (node: ProcessTreeNode) => boolean,
): ProcessTreeNode | null => {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
};

const collectLabels = (root: ProcessTreeNode): string[] => {
  const labels: string[] = [];
  const visit = (node: ProcessTreeNode) => {
    labels.push(node.label);
    node.children.forEach(visit);
  };
  visit(root);
  return labels;
};

describe('buildProcessTreeFromGraph – mortgage hierarchy', () => {
  it(
    'bygger ett processträd där Mortgage har subprocesser som barn',
    async () => {
      const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
        'mortgage.bpmn',
        MORTGAGE_FILES,
      );

      const tree = buildProcessTreeFromGraph(
        graph,
        'mortgage.bpmn',
        noopArtifactBuilder,
      );

      expect(tree.label).toBe('Mortgage');
      expect(tree.type).toBe('process');
      expect(tree.children.length).toBeGreaterThan(0);

      const childLabels = tree.children.map((c) => c.label);

      // Viktiga subprocesser ska finnas direkt under Mortgage
      expect(childLabels).toContain('Application');
      expect(childLabels).toContain('Signing');
      expect(childLabels).toContain('Disbursement');
    },
    60000,
  );

  it(
    'exponerar relevanta tasks under Object / Object information',
    async () => {
      const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
        'mortgage.bpmn',
        MORTGAGE_FILES,
      );

      const tree = buildProcessTreeFromGraph(
        graph,
        'mortgage.bpmn',
        noopArtifactBuilder,
      );

      // Hitta "Object"-subprocessen någonstans under Mortgage
      const objectNode = findNode(
        tree,
        (node) => node.label === 'Object' && node.type === 'callActivity',
      );

      expect(objectNode).not.toBeNull();

      const labels = collectLabels(objectNode!);

      const lowerLabels = labels.map((l) => l.toLowerCase());

      // Kontrollera att objektinformation-processen innehåller uppgifter för fastighet, bostadsrätt och BRF
      expect(lowerLabels.some((l) => l.includes('fastighet'))).toBe(true);
      expect(lowerLabels.some((l) => l.includes('bostadsrätt'))).toBe(true);
      expect(
        lowerLabels.some((l) => l.includes('brf')) ||
          lowerLabels.some((l) => l.includes('bostadsrättsförening')),
      ).toBe(true);
    },
    60000,
  );
});
