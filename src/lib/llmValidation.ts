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

  // Obligatoriska fält enligt BusinessRuleDocModel
  const requiredFields: Array<keyof BusinessRuleDocModel> = [
    'summary',
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'scenarios',
    'testDescription',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validera datatyper
  if ('summary' in obj && typeof obj.summary !== 'string') {
    errors.push('Field "summary" must be a string');
  }

  if ('inputs' in obj) {
    if (!Array.isArray(obj.inputs)) {
      errors.push('Field "inputs" must be an array');
    } else {
      obj.inputs.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "inputs[${index}]" must be a string`);
        }
      });
    }
  }

  if ('decisionLogic' in obj) {
    if (!Array.isArray(obj.decisionLogic)) {
      errors.push('Field "decisionLogic" must be an array');
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
      errors.push('Field "outputs" must be an array');
    } else {
      obj.outputs.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`Field "outputs[${index}]" must be a string`);
        }
      });
    }
  }

  if ('scenarios' in obj) {
    if (!Array.isArray(obj.scenarios)) {
      errors.push('Field "scenarios" must be an array');
    } else {
      obj.scenarios.forEach((scenario, index) => {
        if (!scenario || typeof scenario !== 'object') {
          errors.push(`Field "scenarios[${index}]" must be an object`);
        } else {
          const s = scenario as Record<string, unknown>;
          if (!('id' in s) || typeof s.id !== 'string') {
            errors.push(`Field "scenarios[${index}].id" must be a string`);
          }
          if (!('name' in s) || typeof s.name !== 'string') {
            errors.push(`Field "scenarios[${index}].name" must be a string`);
          }
          if (!('input' in s) || typeof s.input !== 'string') {
            errors.push(`Field "scenarios[${index}].input" must be a string`);
          }
          if (!('outcome' in s) || typeof s.outcome !== 'string') {
            errors.push(`Field "scenarios[${index}].outcome" must be a string`);
          }
        }
      });
    }
  }

  // Kontrollera att inga extra toppnivåfält finns (strikt kontrakt)
  const allowedFields = new Set([
    ...requiredFields,
    'scenarios', // scenarios är en array av objekt
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
      errors: ['Response is not a JSON object'],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  const requiredFields: Array<keyof FeatureGoalDocModel> = [
    'summary',
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'epics',
    'flowSteps',
    'dependencies',
    'scenarios',
    'testDescription',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validera epics-array
  if ('epics' in obj) {
    if (!Array.isArray(obj.epics)) {
      errors.push('Field "epics" must be an array');
    } else {
      obj.epics.forEach((epic, index) => {
        if (!epic || typeof epic !== 'object') {
          errors.push(`Field "epics[${index}]" must be an object`);
        } else {
          const e = epic as Record<string, unknown>;
          if (!('id' in e) || typeof e.id !== 'string') {
            errors.push(`Field "epics[${index}].id" must be a string`);
          }
          if (!('name' in e) || typeof e.name !== 'string') {
            errors.push(`Field "epics[${index}].name" must be a string`);
          }
        }
      });
    }
  }

  // Validera att list-fält är strängar (inte objekt)
  const stringArrayFields: Array<keyof FeatureGoalDocModel> = [
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'flowSteps',
    'dependencies',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of stringArrayFields) {
    if (field in obj) {
      if (!Array.isArray(obj[field])) {
        errors.push(`Field "${field}" must be an array`);
      } else {
        const arr = obj[field] as unknown[];
        arr.forEach((item, index) => {
          if (typeof item !== 'string') {
            errors.push(
              `Field "${field}[${index}]" must be a string, got ${typeof item}. List-fält måste vara strängar, inte objekt.`
            );
          }
        });
      }
    }
  }

  // Varning för oväntade fält (särskilt för lokala modeller som kan lägga till extra fält)
  const allowedFields = new Set([
    ...requiredFields,
    'epics', // epics är en array av objekt
    'scenarios', // scenarios är en array av objekt
  ]);
  for (const key in obj) {
    if (!allowedFields.has(key as keyof FeatureGoalDocModel)) {
      warnings.push(
        `Unexpected top-level field: ${key} (will be ignored). Feature Goal ska INTE innehålla fält som "type", "bpmnContext", "prerequisites", "inputs", "interactions", "dataContracts" - dessa är för Epic eller input, inte output.`
      );
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
      errors: ['Response is not a JSON object'],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  // EpicDocModel har liknande struktur som FeatureGoalDocModel.
  // "technicalDependencies" används inte direkt i HTML-renderingen och
  // saknas i många svar, så vi behandlar det som valfritt (warning istället
  // för hard error) för att inte göra kontraktet onödigt sprött.
  const requiredFields = [
    'summary',
    'prerequisites',
    'inputs',
    'flowSteps',
    'interactions',
    'dataContracts',
    'businessRulesPolicy',
    'scenarios',
    'testDescription',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (!('technicalDependencies' in obj)) {
    warnings.push('Missing optional field: technicalDependencies');
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
