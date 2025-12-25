import type { JSONSchema7 } from 'json-schema';

/**
 * Bygger JSON schema för Claude structured output för E2E-scenarios.
 */
export function buildE2eScenarioJsonSchema(): JSONSchema7 {
  return {
    type: 'object',
    required: ['id', 'name', 'priority', 'type', 'iteration', 'summary', 'given', 'when', 'then', 'bankProjectTestSteps', 'subprocessSteps'],
    properties: {
      id: {
        type: 'string',
        description: 'Unikt ID för E2E-scenariot (t.ex. "e2e-happy-path-1")',
      },
      name: {
        type: 'string',
        description: 'Namn på E2E-scenariot (t.ex. "En sökande - Bostadsrätt godkänd automatiskt (Happy Path)")',
      },
      priority: {
        type: 'string',
        enum: ['P0', 'P1', 'P2'],
        description: 'Prioritering (P0 = högsta, P2 = lägsta)',
      },
      type: {
        type: 'string',
        enum: ['happy-path', 'alt-path', 'error'],
        description: 'Scenario-typ',
      },
      iteration: {
        type: 'string',
        description: 'Iteration (t.ex. "Köp bostadsrätt", "En sökande", "Medsökande")',
      },
      summary: {
        type: 'string',
        description: 'Lång beskrivning av scenariot',
      },
      given: {
        type: 'string',
        description: 'Given-conditions (fullständiga meningar, separerade med punkt)',
      },
      when: {
        type: 'string',
        description: 'When-actions (fullständiga meningar, separerade med punkt)',
      },
      then: {
        type: 'string',
        description: 'Then-assertions (fullständiga meningar, separerade med punkt)',
      },
      notesForBankProject: {
        type: 'string',
        description: 'Anteckningar för bankprojektet',
      },
      bankProjectTestSteps: {
        type: 'array',
        items: {
          type: 'object',
          required: ['bpmnNodeId', 'bpmnNodeType', 'bpmnNodeName', 'action', 'assertion'],
          properties: {
            bpmnNodeId: {
              type: 'string',
              description: 'Feature Goal ID (Call Activity ID)',
            },
            bpmnNodeType: {
              type: 'string',
              enum: ['CallActivity'],
              description: 'BPMN-nodtyp (alltid CallActivity för Feature Goals)',
            },
            bpmnNodeName: {
              type: 'string',
              description: 'Feature Goal-namn från BPMN',
            },
            action: {
              type: 'string',
              description: 'Vad som händer baserat på Feature Goal flowSteps',
            },
            assertion: {
              type: 'string',
              description: 'Vad som verifieras baserat på Feature Goal userStories.acceptanceCriteria',
            },
            backendState: {
              type: 'string',
              description: 'Förväntat backend-tillstånd (valfritt)',
            },
          },
        },
      },
      subprocessSteps: {
        type: 'array',
        items: {
          type: 'object',
          required: ['order', 'bpmnFile', 'callActivityId', 'description'],
          properties: {
            order: {
              type: 'number',
              description: 'Ordningsnummer (1, 2, 3, etc.)',
            },
            bpmnFile: {
              type: 'string',
              description: 'BPMN-filnamn för Feature Goalet (subprocess-fil)',
            },
            callActivityId: {
              type: 'string',
              description: 'Feature Goal ID (Call Activity ID)',
            },
            description: {
              type: 'string',
              description: 'Kort beskrivning baserat på Feature Goal summary',
            },
            given: {
              type: 'string',
              description: 'Given-conditions (valfritt)',
            },
            when: {
              type: 'string',
              description: 'When-actions (valfritt)',
            },
            then: {
              type: 'string',
              description: 'Then-assertions (valfritt)',
            },
            subprocessesSummary: {
              type: 'string',
              description: 'Lista över subprocesser (valfritt)',
            },
            serviceTasksSummary: {
              type: 'string',
              description: 'Lista över Service Tasks (valfritt)',
            },
            userTasksSummary: {
              type: 'string',
              description: 'Lista över User Tasks (valfritt)',
            },
            businessRulesSummary: {
              type: 'string',
              description: 'Lista över Business Rule Tasks och DMN-beslut (valfritt)',
            },
          },
        },
      },
    },
  };
}

