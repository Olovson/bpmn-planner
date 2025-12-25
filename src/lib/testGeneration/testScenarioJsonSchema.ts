import type { JSONSchema7 } from 'json-schema';

/**
 * Bygger JSON schema för Claude structured output.
 */
export function buildTestScenarioJsonSchema(): JSONSchema7 {
  return {
    type: 'object',
    required: ['scenarios'],
    properties: {
      scenarios: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'description', 'category', 'priority', 'steps', 'acceptanceCriteria'],
          properties: {
            id: {
              type: 'string',
              description: 'Unikt ID för scenariot (t.ex. "scenario-1")',
            },
            name: {
              type: 'string',
              description: 'Namn på scenariot (t.ex. "Happy Path: Skapa ansökan")',
            },
            description: {
              type: 'string',
              description: 'Beskrivning av scenariot',
            },
            category: {
              type: 'string',
              enum: ['happy-path', 'error-case', 'edge-case'],
              description: 'Kategori för scenariot',
            },
            priority: {
              type: 'string',
              enum: ['P0', 'P1', 'P2'],
              description: 'Prioritering (P0 = högsta, P2 = lägsta)',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                required: ['order', 'action', 'expectedResult'],
                properties: {
                  order: {
                    type: 'number',
                    description: 'Ordning i scenariot (1, 2, 3, ...)',
                  },
                  action: {
                    type: 'string',
                    description: 'Åtgärd som utförs (t.ex. "Kunden fyller i personuppgifter")',
                  },
                  expectedResult: {
                    type: 'string',
                    description: 'Förväntat resultat (t.ex. "Alla fält är ifyllda och validerade")',
                  },
                },
              },
            },
            acceptanceCriteria: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Acceptanskriterier för scenariot',
            },
            prerequisites: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Förutsättningar för scenariot (valfritt)',
            },
            edgeCases: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Edge cases relaterade till scenariot (valfritt)',
            },
          },
        },
      },
    },
  };
}



