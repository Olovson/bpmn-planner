/**
 * JSON Schemas för Claude's structured outputs
 * 
 * Dessa schemas används med Claude's response_format för att garantera
 * korrekt JSON-struktur direkt från API:et, utan behov av parsing/repair.
 */

/**
 * JSON Schema för Feature Goal dokumentation
 * 
 * Kopierad från Epic JSON Schema för att matcha Epic-strukturen.
 * OBS: Feature Goals har INTE interactions (endast Epic har det).
 */
export function buildFeatureGoalJsonSchema() {
  return {
    name: 'FeatureGoalDocModel',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'summary',
        'flowSteps',
        'userStories',
      ],
      properties: {
        summary: {
          type: 'string',
        },
        flowSteps: {
          type: 'array',
          items: { type: 'string' },
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
        },
        userStories: {
          type: 'array',
          // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
          // LLM instrueras via prompt att generera 3-6 user stories
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'role', 'goal', 'value', 'acceptanceCriteria'],
            properties: {
              id: { type: 'string' },
              role: { 
                type: 'string',
                enum: ['Kund', 'Handläggare', 'Processägare'],
                description: 'Roll måste vara "Kund", "Handläggare" eller "Processägare". Prioritera "Kund" och "Handläggare" - använd "Processägare" endast när det är lämpligt och inte kan täckas av "Kund" eller "Handläggare".'
              },
              goal: { type: 'string' },
              value: { type: 'string' },
              acceptanceCriteria: {
                type: 'array',
                // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
                // LLM instrueras via prompt att generera 2-4 acceptance criteria per user story
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * JSON Schema för Epic dokumentation
 */
export function buildEpicJsonSchema() {
  return {
    name: 'EpicDocModel',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'summary',
        'flowSteps',
        'userStories',
      ],
      properties: {
        summary: {
          type: 'string',
        },
        flowSteps: {
          type: 'array',
          items: { type: 'string' },
        },
        interactions: {
          type: 'array',
          items: { type: 'string' },
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Beroenden inkluderar både process-kontext (vad måste vara klart före epiken kan köras) och tekniska system (API:er, databaser, regelmotorer som behövs). Var SPECIFIK - använd konkreta systemnamn, API:er eller processsteg. Undvik generiska beskrivningar som "Tillgång till databas" eller "Föregående steg måste vara klart". Istället: "Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik." eller "Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata."',
        },
        userStories: {
          type: 'array',
          // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
          // LLM instrueras via prompt att generera 3-6 user stories
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'role', 'goal', 'value', 'acceptanceCriteria'],
            properties: {
              id: { type: 'string' },
              role: { 
                type: 'string',
                enum: ['Kund', 'Handläggare', 'Processägare'],
                description: 'Roll måste vara "Kund", "Handläggare" eller "Processägare". Prioritera "Kund" och "Handläggare" - använd "Processägare" endast när det är lämpligt och inte kan täckas av "Kund" eller "Handläggare".'
              },
              goal: { type: 'string' },
              value: { type: 'string' },
              acceptanceCriteria: {
                type: 'array',
                // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
                // LLM instrueras via prompt att generera 2-4 acceptance criteria
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * JSON Schema för Business Rule dokumentation
 */
export function buildBusinessRuleJsonSchema() {
  return {
    name: 'BusinessRuleDocModel',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'summary',
        'inputs',
        'decisionLogic',
        'outputs',
        'businessRulesPolicy',
        'relatedItems',
      ],
      properties: {
        summary: {
          type: 'string',
        },
        inputs: {
          type: 'array',
          items: { type: 'string' },
        },
        decisionLogic: {
          type: 'array',
          items: { type: 'string' },
        },
        outputs: {
          type: 'array',
          items: { type: 'string' },
        },
        businessRulesPolicy: {
          type: 'array',
          items: { type: 'string' },
        },
        relatedItems: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  };
}
