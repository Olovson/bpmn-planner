/**
 * @vitest-environment jsdom
 *
 * Integration test that verifies sequence-flow based ordering for a real
 * mortgage BPMN fixture via the client-side ProcessModel.
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { collectProcessDefinitionsFromMeta } from '@/lib/bpmn/processDefinition';
import { buildProcessModelFromDefinitions } from '@/lib/bpmn/buildProcessModel';

describe('ProcessModel sequence-flow ordering with mortgage fixtures', () => {
  it(
    'orders internal data gathering tasks according to sequence flows',
    async () => {
      const fileName = 'mortgage-se-internal-data-gathering.bpmn';
      const parseResult = await parseBpmnFile(`/bpmn/${fileName}`);

      const definitions = collectProcessDefinitionsFromMeta(
        fileName,
        parseResult.meta,
      );

      const parseResultsByFile = new Map([[fileName, parseResult]]);

      const model = buildProcessModelFromDefinitions(
        [
          {
            fileName,
            definitions,
          },
        ],
        {
          preferredRootFile: fileName,
          parseResultsByFile,
        },
      );

      const nodes = Array.from(model.nodesById.values()).filter(
        (n) =>
          n.bpmnFile === fileName &&
          n.bpmnElementId &&
          (n.kind === 'userTask' ||
            n.kind === 'serviceTask' ||
            n.kind === 'businessRuleTask'),
      );

      const fetchParty = nodes.find(
        (n) => n.bpmnElementId === 'fetch-party-information',
      );
      const preScreen = nodes.find(
        (n) => n.bpmnElementId === 'pre-screen-party',
      );
      const fetchEngagements = nodes.find(
        (n) => n.bpmnElementId === 'fetch-engagements',
      );

      expect(fetchParty?.primaryPathIndex).toBeDefined();
      expect(preScreen?.primaryPathIndex).toBeDefined();
      expect(fetchEngagements?.primaryPathIndex).toBeDefined();

      // Ensure the sequence respects the BPMN flow:
      // Start -> fetch-party-information -> pre-screen-party -> fetch-engagements
      expect(fetchParty!.primaryPathIndex! < preScreen!.primaryPathIndex!).toBe(
        true,
      );
      expect(preScreen!.primaryPathIndex! < fetchEngagements!.primaryPathIndex!).toBe(
        true,
      );
    },
    60000,
  );
});

