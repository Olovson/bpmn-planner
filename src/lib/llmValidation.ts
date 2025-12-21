/**
 * LLM Response Validation
 * 
 * Validerar LLM-svar mot kontrakt definierade i PROMPT_CONTRACT.md:
 * - JSON-struktur för Business Rule och testscript
 * - HTML-kontrakt för dokumentation (tillåtna/förbjudna taggar)
 */

import type { BusinessRuleDocModel } from './businessRuleDocTypes';
import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel } from './epicDocTypes';
import type { LlmProvider } from './llmClientAbstraction';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validerar Business Rule JSON mot BusinessRuleDocModel.
 * 
 * Kontrakt: Se prompts/llm/dmn_businessrule_prompt.md och PROMPT_CONTRACT.md
 */
/**
 * Normaliserar ett värde till en array av strängar (används för att hantera LLM-variationer).
 * Omvänt från coerceStringArray i businessRuleLlmMapper.ts men används här för validering.
 */
function normalizeToStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function validateBusinessRuleJson(
  json: unknown,
  provider: LlmProvider
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return {
      valid: false,
      errors: ['Response is not a JSON object'],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // Normalisera array-fält innan validering (hantera fall där LLM returnerar strängar istället för arrays)
  // Detta gör valideringen mer tolerant och matchar hur mappningen fungerar
  if ('decisionLogic' in obj && !Array.isArray(obj.decisionLogic)) {
    const normalized = normalizeToStringArray(obj.decisionLogic);
    if (normalized.length > 0) {
      // Om det kan normaliseras till en array, gör det (men logga en varning)
      obj.decisionLogic = normalized;
      warnings.push('Field "decisionLogic" was normalized from non-array to array format');
    }
  }
  if ('inputs' in obj && !Array.isArray(obj.inputs)) {
    const normalized = normalizeToStringArray(obj.inputs);
    if (normalized.length > 0) {
      obj.inputs = normalized;
      warnings.push('Field "inputs" was normalized from non-array to array format');
    }
  }
  if ('outputs' in obj && !Array.isArray(obj.outputs)) {
    const normalized = normalizeToStringArray(obj.outputs);
    if (normalized.length > 0) {
      obj.outputs = normalized;
      warnings.push('Field "outputs" was normalized from non-array to array format');
    }
  }
  if ('businessRulesPolicy' in obj && !Array.isArray(obj.businessRulesPolicy)) {
    const normalized = normalizeToStringArray(obj.businessRulesPolicy);
    if (normalized.length > 0) {
      obj.businessRulesPolicy = normalized;
      warnings.push('Field "businessRulesPolicy" was normalized from non-array to array format');
    }
  }
  if ('relatedItems' in obj && !Array.isArray(obj.relatedItems)) {
    const normalized = normalizeToStringArray(obj.relatedItems);
    if (normalized.length > 0) {
      obj.relatedItems = normalized;
      warnings.push('Field "relatedItems" was normalized from non-array to array format');
    }
  }

  // Obligatoriska fält enligt BusinessRuleDocModel (v2.0.0 - implementationNotes borttaget)
  const requiredFields: Array<keyof BusinessRuleDocModel> = [
    'summary',
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'relatedItems',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(
        `Missing required field: "${field}". This field must always be included according to the prompt.`
      );
    }
  }

  // Validera datatyper
  if ('summary' in obj && typeof obj.summary !== 'string') {
    errors.push('Field "summary" must be a string (2-4 sentences describing the business rule).');
  }

  if ('inputs' in obj) {
    if (!Array.isArray(obj.inputs)) {
      errors.push('Field "inputs" must be an array of strings (3+ items with exact format).');
    } else {
      obj.inputs.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "inputs[${index}]" must be a string.`);
        } else {
          // Validera inputs-format: "Fält: ...; Datakälla: ...; Typ: ...; Obligatoriskt: Ja/Nej; Validering: ...; Felhantering: ..."
          const inputStr = item as string;
          if (!inputStr.includes('Fält:') || !inputStr.includes('Datakälla:') || !inputStr.includes('Typ:')) {
            errors.push(
              `Field "inputs[${index}]" must follow the exact format: "Fält: ...; Datakälla: ...; Typ: ...; Obligatoriskt: Ja/Nej; Validering: ...; Felhantering: ..."`
            );
          }
        }
      });
    }
  }

  if ('decisionLogic' in obj) {
    if (!Array.isArray(obj.decisionLogic)) {
      errors.push('Field "decisionLogic" must be an array (or a string that can be normalized to an array)');
    } else {
      obj.decisionLogic.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "decisionLogic[${index}]" must be a string`);
        }
      });
    }
  }

  if ('outputs' in obj) {
    if (!Array.isArray(obj.outputs)) {
      errors.push('Field "outputs" must be an array of strings (3-5 items with exact format).');
    } else {
      obj.outputs.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "outputs[${index}]" must be a string.`);
        } else {
          // Validera outputs-format: "Outputtyp: ...; Typ: ...; Effekt: ...; Loggning: ..."
          const outputStr = item as string;
          if (!outputStr.includes('Outputtyp:') || !outputStr.includes('Typ:') || !outputStr.includes('Effekt:')) {
            errors.push(
              `Field "outputs[${index}]" must follow the exact format: "Outputtyp: ...; Typ: ...; Effekt: ...; Loggning: ..."`
            );
          }
        }
      });
    }
  }

  // Kontrollera att inga extra toppnivåfält finns (strikt kontrakt)
  const allowedFields = new Set([
    ...requiredFields,
  ]);
  for (const key in obj) {
    if (!allowedFields.has(key as keyof BusinessRuleDocModel)) {
      warnings.push(`Unexpected top-level field: ${key} (will be ignored)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validerar Feature Goal JSON mot FeatureGoalDocModel.
 */
export function validateFeatureGoalJson(
  json: unknown,
  provider: LlmProvider
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return {
      valid: false,
      errors: [
        'Response is not a JSON object. Make sure your response starts with { and ends with }, with no text before or after.',
      ],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // Enligt prompten är dessa obligatoriska:
  // summary, prerequisites, flowSteps, userStories
  // dependencies är optional
  const requiredFields: Array<keyof FeatureGoalDocModel> = [
    'summary',
    'prerequisites',
    'flowSteps',
    'userStories',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(
        `Missing required field: "${field}". This field must always be included according to the prompt.`
      );
    }
  }

  // Validera datatyper och format
  if ('summary' in obj && typeof obj.summary !== 'string') {
    errors.push('Field "summary" must be a string (3-5 sentences describing the feature goal).');
  }

  if ('prerequisites' in obj) {
    if (!Array.isArray(obj.prerequisites)) {
      errors.push('Field "prerequisites" must be an array of strings (2-3 full sentences).');
    } else {
      obj.prerequisites.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "prerequisites[${index}]" must be a string (full sentence).`);
        }
      });
    }
  }

  if ('dependencies' in obj && Array.isArray(obj.dependencies)) {
    obj.dependencies.forEach((item, index) => {
      if (typeof item !== 'string') {
        errors.push(`Field "dependencies[${index}]" must be a string.`);
      } else {
        // Validera dependencies-format: "Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."
        const depStr = item as string;
        if (!depStr.startsWith('Beroende:') || !depStr.includes('Id:') || !depStr.includes('Beskrivning:')) {
          errors.push(
            `Field "dependencies[${index}]" must follow the exact format: "Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."`
          );
        }
      }
    });
  }

  // Validera userStories-array
  if ('userStories' in obj) {
    if (!Array.isArray(obj.userStories)) {
      errors.push('Field "userStories" must be an array');
    } else {
      obj.userStories.forEach((story, index) => {
        if (!story || typeof story !== 'object') {
          errors.push(`Field "userStories[${index}]" must be an object`);
        } else {
          const s = story as Record<string, unknown>;
          if (!('id' in s) || typeof s.id !== 'string') {
            errors.push(`Field "userStories[${index}].id" must be a string`);
          }
          if (!('role' in s) || typeof s.role !== 'string') {
            errors.push(`Field "userStories[${index}].role" must be a string`);
          }
          if (!('goal' in s) || typeof s.goal !== 'string') {
            errors.push(`Field "userStories[${index}].goal" must be a string`);
          }
          if (!('value' in s) || typeof s.value !== 'string') {
            errors.push(`Field "userStories[${index}].value" must be a string`);
          }
          if (!('acceptanceCriteria' in s) || !Array.isArray(s.acceptanceCriteria)) {
            errors.push(`Field "userStories[${index}].acceptanceCriteria" must be an array of strings`);
          }
        }
      });
    }
  }


  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validerar Epic JSON mot EpicDocModel.
 */
export function validateEpicJson(json: unknown, provider: LlmProvider): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return {
      valid: false,
      errors: [
        'Response is not a JSON object. Make sure your response starts with { and ends with }, with no text before or after.',
      ],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // EpicDocModel - enligt prompten (v1.4.0) är dessa obligatoriska:
  // summary, prerequisites, flowSteps, userStories
  // interactions är valfritt (endast för User Tasks)
  const requiredFields = [
    'summary',
    'prerequisites',
    'flowSteps',
    'userStories',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(
        `Missing required field: "${field}". This field must always be included according to the prompt.`
      );
    }
  }

  // Validera datatyper för obligatoriska fält
  if ('summary' in obj && typeof obj.summary !== 'string') {
    errors.push('Field "summary" must be a string (2-4 sentences describing the epic).');
  }

  if ('prerequisites' in obj) {
    if (!Array.isArray(obj.prerequisites)) {
      errors.push('Field "prerequisites" must be an array of strings (2-3 full sentences).');
    } else {
      obj.prerequisites.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "prerequisites[${index}]" must be a string (full sentence).`);
        }
      });
    }
  }

  if ('flowSteps' in obj) {
    if (!Array.isArray(obj.flowSteps)) {
      errors.push('Field "flowSteps" must be an array of strings (4-6 full sentences).');
    } else {
      obj.flowSteps.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "flowSteps[${index}]" must be a string (full sentence describing a step).`);
        }
      });
    }
  }

  if ('userStories' in obj) {
    if (!Array.isArray(obj.userStories)) {
      errors.push('Field "userStories" must be an array of objects (3-6 user stories).');
    } else {
      obj.userStories.forEach((story, index) => {
        if (!story || typeof story !== 'object') {
          errors.push(`Field "userStories[${index}]" must be an object.`);
        } else {
          const s = story as Record<string, unknown>;
          const requiredStoryFields = ['id', 'role', 'goal', 'value', 'acceptanceCriteria'];
          for (const field of requiredStoryFields) {
            if (!(field in s)) {
              errors.push(`Field "userStories[${index}].${field}" is required.`);
            }
          }
          if ('acceptanceCriteria' in s && !Array.isArray(s.acceptanceCriteria)) {
            errors.push(`Field "userStories[${index}].acceptanceCriteria" must be an array of strings (2-4 criteria).`);
          }
        }
      });
    }
  }


  // interactions är valfritt - varning om det saknas men inget fel
  if (!('interactions' in obj)) {
    warnings.push(
      'Field "interactions" is optional. Include it for User Tasks (2-3 strings), omit it for Service Tasks.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validerar testscript JSON mot testscript-kontraktet.
 * 
 * Kontrakt: Se prompts/llm/testscript_prompt.md och PROMPT_CONTRACT.md
 */
export function validateTestscriptJson(
  json: unknown,
  provider: LlmProvider
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return {
      valid: false,
      errors: ['Response is not a JSON object'],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // Kontrakt: { scenarios: [...] }
  if (!('scenarios' in obj)) {
    errors.push('Missing required field: scenarios');
  } else {
    if (!Array.isArray(obj.scenarios)) {
      errors.push('Field "scenarios" must be an array');
    } else {
      obj.scenarios.forEach((scenario, index) => {
        if (!scenario || typeof scenario !== 'object') {
          errors.push(`Field "scenarios[${index}]" must be an object`);
        } else {
          const s = scenario as Record<string, unknown>;
          const requiredScenarioFields = ['name', 'description', 'expectedResult', 'type', 'steps'];
          for (const field of requiredScenarioFields) {
            if (!(field in s)) {
              errors.push(`Field "scenarios[${index}].${field}" is required`);
            }
          }

          if ('type' in s) {
            const validTypes = ['happy-path', 'error-case', 'edge-case'];
            if (!validTypes.includes(s.type as string)) {
              errors.push(
                `Field "scenarios[${index}].type" must be one of: ${validTypes.join(', ')}`
              );
            }
          }

          if ('steps' in s) {
            if (!Array.isArray(s.steps)) {
              errors.push(`Field "scenarios[${index}].steps" must be an array`);
            } else {
              if (s.steps.length < 3 || s.steps.length > 6) {
                warnings.push(
                  `Field "scenarios[${index}].steps" should have 3-6 items, got ${s.steps.length}`
                );
              }
              s.steps.forEach((step, stepIndex) => {
                if (typeof step !== 'string') {
                  errors.push(`Field "scenarios[${index}].steps[${stepIndex}]" must be a string`);
                }
              });
            }
          }
        }
      });
    }
  }

  // Kontrollera att inga extra toppnivåfält finns
  if (Object.keys(obj).length > 1 || (Object.keys(obj).length === 1 && !('scenarios' in obj))) {
    warnings.push('Unexpected top-level fields (only "scenarios" is allowed)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validerar HTML-innehåll mot PROMPT_CONTRACT.md.
 * 
 * Tillåtna taggar: <p>, <ul>, <ol>, <li>, <code>
 * Förbjudna taggar: <h1>-<h6>, <table>, <script>, <style>, etc.
 */
export function validateHtmlContent(
  html: string,
  provider: LlmProvider,
  docType: 'feature' | 'epic' | 'businessRule'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Förbjudna taggar enligt PROMPT_CONTRACT.md
  const forbiddenTags = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'html',
    'head',
    'body',
    'style',
    'script',
    'section',
    'header',
    'footer',
    'article',
    'nav',
    'aside',
  ];

  for (const tag of forbiddenTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    if (regex.test(html)) {
      errors.push(`Forbidden HTML tag found: <${tag}> (not allowed per PROMPT_CONTRACT.md)`);
    }
  }

  // Varning för potentiellt problematiska taggar
  const warningTags = ['div', 'span', 'strong', 'em', 'b', 'i'];
  for (const tag of warningTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    if (regex.test(html)) {
      warnings.push(`Potentially problematic tag: <${tag}> (consider using allowed tags only)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Loggar valideringsresultat med provider- och docType-info.
 */
export function logValidationResult(
  result: ValidationResult,
  provider: LlmProvider,
  docType: string,
  context?: string
): void {
  if (!result.valid || result.errors.length > 0 || result.warnings.length > 0) {
    const prefix = `[LLM Validation] ${provider}/${docType}${context ? `/${context}` : ''}`;
    if (result.errors.length > 0) {
      console.error(`${prefix} Validation errors:`, result.errors);
    }
    if (result.warnings.length > 0) {
      console.warn(`${prefix} Validation warnings:`, result.warnings);
    }
  }
}
