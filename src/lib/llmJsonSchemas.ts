/**
 * JSON Schemas för Claude's structured outputs
 * 
 * Dessa schemas används med Claude's response_format för att garantera
 * korrekt JSON-struktur direkt från API:et, utan behov av parsing/repair.
 */

/**
 * JSON Schema för Feature Goal dokumentation
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
        'effectGoals',
        'scopeIncluded',
        'scopeExcluded',
        'epics',
        'flowSteps',
        'dependencies',
        'relatedItems',
      ],
      properties: {
        summary: {
          type: 'string',
        },
        effectGoals: {
          type: 'array',
          items: { type: 'string' },
        },
        scopeIncluded: {
          type: 'array',
          items: { type: 'string' },
        },
        scopeExcluded: {
          type: 'array',
          items: { type: 'string' },
        },
        epics: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'description', 'team'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              team: { type: 'string' },
            },
          },
        },
        flowSteps: {
          type: 'array',
          items: { type: 'string' },
        },
        dependencies: {
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
        'prerequisites',
        'flowSteps',
        'userStories',
        'implementationNotes',
      ],
      properties: {
        summary: {
          type: 'string',
        },
        prerequisites: {
          type: 'array',
          items: { type: 'string' },
        },
        flowSteps: {
          type: 'array',
          items: { type: 'string' },
        },
        interactions: {
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
              role: { type: 'string' },
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
        implementationNotes: {
          type: 'array',
          items: { type: 'string' },
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
          type: 'string',
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
