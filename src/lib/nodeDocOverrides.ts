/**
 * Per-node documentation overrides system.
 * 
 * Allows nodes to have custom documentation files that override or extend
 * the base auto-generated documentation models.
 * 
 * Override files live in: src/data/node-docs/{docType}/{bpmnBaseName}.{elementId}.doc.ts
 */

import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel, EpicScenario } from './epicDocTypes';
import type { BusinessRuleDocModel, BusinessRuleScenario } from './businessRuleDocTypes';
import type { NodeDocumentationContext } from './documentationContext';
import { sanitizeElementId } from './nodeArtifactPaths';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Partial override for Feature Goal documentation.
 * Only include fields you want to override or supplement.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * Set _mergeStrategy to 'extend' to append to base array instead.
 */
export type FeatureGoalDocOverrides = Partial<FeatureGoalDocModel> & {
  _mergeStrategy?: {
    effectGoals?: 'replace' | 'extend';
    scopeIncluded?: 'replace' | 'extend';
    scopeExcluded?: 'replace' | 'extend';
    epics?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    dependencies?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};

/**
 * Partial override for Epic documentation.
 */
export type EpicDocOverrides = Partial<EpicDocModel> & {
  _mergeStrategy?: {
    prerequisites?: 'replace' | 'extend';
    inputs?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    interactions?: 'replace' | 'extend';
    dataContracts?: 'replace' | 'extend';
    businessRulesPolicy?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};

/**
 * Partial override for Business Rule documentation.
 */
export type BusinessRuleDocOverrides = Partial<BusinessRuleDocModel> & {
  _mergeStrategy?: {
    inputs?: 'replace' | 'extend';
    decisionLogic?: 'replace' | 'extend';
    outputs?: 'replace' | 'extend';
    businessRulesPolicy?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};

// ============================================================================
// File Path Resolution
// ============================================================================

/**
 * Builds the import path for a node documentation override file.
 * 
 * Format: @/data/node-docs/{docType}/{bpmnBaseName}.{sanitizedElementId}.doc
 * 
 * Example:
 * - docType: 'feature-goal'
 * - bpmnFile: 'mortgage.bpmn'
 * - elementId: 'application'
 * → '@/data/node-docs/feature-goal/mortgage.application.doc'
 */
function getOverrideImportPath(
  docType: 'feature-goal' | 'epic' | 'business-rule',
  bpmnFile: string,
  elementId: string
): string {
  const baseName = bpmnFile.replace('.bpmn', '');
  const sanitized = sanitizeElementId(elementId);
  return `@/data/node-docs/${docType}/${baseName}.${sanitized}.doc`;
}

// ============================================================================
// Loader Functions
// ============================================================================

/**
 * Loads Feature Goal documentation overrides for a node.
 * Returns null if no override file exists (graceful fallback).
 * 
 * @param context - Node documentation context with bpmnFile and bpmnElementId
 * @returns Override data or null if file doesn't exist
 */
export async function loadFeatureGoalOverrides(
  context: NodeDocumentationContext
): Promise<FeatureGoalDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) {
    return null;
  }

  try {
    const overridePath = getOverrideImportPath('feature-goal', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    const overrides = module.overrides as FeatureGoalDocOverrides | undefined;
    
    if (overrides) {
      console.log(
        `[nodeDocOverrides] ✓ Loaded override for feature-goal: ${bpmnFile}::${bpmnElementId}`
      );
    }
    
    return overrides || null;
  } catch (error) {
    // File doesn't exist - that's fine, use base model (expected behavior)
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module') ||
        error.message.includes('Failed to resolve module specifier'))
    ) {
      // File doesn't exist - this is expected, not an error
      return null;
    }
    // Only log unexpected errors (syntax errors, etc.)
    console.warn(
      `[nodeDocOverrides] Unexpected error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}

/**
 * Loads Epic documentation overrides for a node.
 */
export async function loadEpicOverrides(
  context: NodeDocumentationContext
): Promise<EpicDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) {
    return null;
  }

  try {
    const overridePath = getOverrideImportPath('epic', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    const overrides = module.overrides as EpicDocOverrides | undefined;
    
    if (overrides) {
      console.log(
        `[nodeDocOverrides] ✓ Loaded override for epic: ${bpmnFile}::${bpmnElementId}`
      );
    }
    
    return overrides || null;
  } catch (error) {
    // File doesn't exist - that's fine, use base model (expected behavior)
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module') ||
        error.message.includes('Failed to resolve module specifier'))
    ) {
      // File doesn't exist - this is expected, not an error
      return null;
    }
    // Only log unexpected errors (syntax errors, etc.)
    console.warn(
      `[nodeDocOverrides] Unexpected error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}

/**
 * Loads Business Rule documentation overrides for a node.
 */
export async function loadBusinessRuleOverrides(
  context: NodeDocumentationContext
): Promise<BusinessRuleDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) {
    return null;
  }

  try {
    const overridePath = getOverrideImportPath('business-rule', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    const overrides = module.overrides as BusinessRuleDocOverrides | undefined;
    
    if (overrides) {
      console.log(
        `[nodeDocOverrides] ✓ Loaded override for business-rule: ${bpmnFile}::${bpmnElementId}`
      );
    }
    
    return overrides || null;
  } catch (error) {
    // File doesn't exist - that's fine, use base model (expected behavior)
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module') ||
        error.message.includes('Failed to resolve module specifier'))
    ) {
      // File doesn't exist - this is expected, not an error
      return null;
    }
    // Only log unexpected errors (syntax errors, etc.)
    console.warn(
      `[nodeDocOverrides] Unexpected error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Merges override data into a base Feature Goal model.
 * Handles both full replacement and extension strategies for array fields.
 * 
 * @param base - Base model from context
 * @param overrides - Override data (can be null)
 * @returns Merged model
 */
export function mergeFeatureGoalOverrides(
  base: FeatureGoalDocModel,
  overrides: FeatureGoalDocOverrides | null
): FeatureGoalDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  // Simple fields: override if provided
  if (overrides.summary !== undefined) {
    merged.summary = overrides.summary;
  }
  if (overrides.testDescription !== undefined) {
    merged.testDescription = overrides.testDescription;
  }

  // Array fields: check merge strategy
  const arrayFields: Array<keyof FeatureGoalDocModel> = [
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'epics',
    'flowSteps',
    'dependencies',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      // Extend: concatenate base + override
      const baseArray = base[field] as unknown[];
      const overrideArray = overrides[field] as unknown[];
      (merged as any)[field] = [...baseArray, ...overrideArray];
    } else {
      // Replace: use override completely
      (merged as any)[field] = overrides[field];
    }
  }

  return merged;
}

/**
 * Merges override data into a base Epic model.
 */
export function mergeEpicOverrides(
  base: EpicDocModel,
  overrides: EpicDocOverrides | null
): EpicDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  if (overrides.summary !== undefined) {
    merged.summary = overrides.summary;
  }
  if (overrides.testDescription !== undefined) {
    merged.testDescription = overrides.testDescription;
  }

  const arrayFields: Array<keyof EpicDocModel> = [
    'prerequisites',
    'inputs',
    'flowSteps',
    'interactions',
    'dataContracts',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      const baseArray = base[field] as unknown[];
      const overrideArray = overrides[field] as unknown[];
      (merged as any)[field] = [...baseArray, ...overrideArray];
    } else {
      (merged as any)[field] = overrides[field];
    }
  }

  return merged;
}

/**
 * Merges override data into a base Business Rule model.
 */
export function mergeBusinessRuleOverrides(
  base: BusinessRuleDocModel,
  overrides: BusinessRuleDocOverrides | null
): BusinessRuleDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  if (overrides.summary !== undefined) {
    merged.summary = overrides.summary;
  }
  if (overrides.testDescription !== undefined) {
    merged.testDescription = overrides.testDescription;
  }

  const arrayFields: Array<keyof BusinessRuleDocModel> = [
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      const baseArray = base[field] as unknown[];
      const overrideArray = overrides[field] as unknown[];
      (merged as any)[field] = [...baseArray, ...overrideArray];
    } else {
      (merged as any)[field] = overrides[field];
    }
  }

  return merged;
}

// ============================================================================
// LLM Patch Merge
// ============================================================================

/**
 * Merges an LLM-generated partial model into a base/override model.
 * 
 * ## Merge Strategy
 * 
 * **LLM fields take precedence (replace strategy)** - when LLM is used, it's authoritative.
 * This ensures that Claude's generated content overrides both base model and per-node overrides.
 * 
 * ### Simple Fields (strings):
 * - If LLM provides a non-empty value → **replace** base/override value
 * - If LLM provides empty/whitespace → **keep** base/override value
 * - If LLM doesn't provide field → **keep** base/override value
 * 
 * ### Array Fields:
 * - If LLM provides a non-empty array → **replace** base/override array completely
 * - If LLM provides empty array → **keep** base/override array (don't replace with empty)
 * - If LLM doesn't provide field → **keep** base/override array
 * 
 * ### Edge Cases:
 * - **Saknade fält i LLM**: Behålls från base/override (modellen är alltid komplett)
 * - **Extra fält i LLM**: Ignoreras (TypeScript-typer säkerställer att endast giltiga fält accepteras)
 * - **Tomma strängar**: Behandlas som "saknas" (behåll base/override)
 * - **Tomma arrays**: Behandlas som "saknas" (behåll base/override)
 * 
 * ## Pipeline Order
 * 
 * 1. Build base model from BPMN context
 * 2. Apply per-node overrides (if any)
 * 3. Apply LLM patch (this function) ← **Här är vi**
 * 4. Fetch test scenarios from database
 * 5. Fetch E2E test info
 * 6. Render HTML
 * 
 * ## Example
 * 
 * ```typescript
 * // Base model
 * const base = { summary: "Base summary", effectGoals: ["Goal 1"] };
 * 
 * // LLM patch
 * const llmPatch = { summary: "LLM summary", effectGoals: ["Goal 2", "Goal 3"] };
 * 
 * // Result
 * const merged = { summary: "LLM summary", effectGoals: ["Goal 2", "Goal 3"] };
 * // LLM's values replace base values completely
 * ```
 * 
 * @param base - Base model (may already have per-node overrides applied)
 * @param llmPatch - Partial model from LLM (Claude/Anthropic)
 * @returns Merged model with LLM values taking precedence
 * @throws Never throws - always returns a valid model (falls back to base if LLM patch is invalid)
 */
export function mergeLlmPatch<T extends FeatureGoalDocModel | EpicDocModel | BusinessRuleDocModel>(
  base: T,
  llmPatch: Partial<T>
): T {
  if (!llmPatch || typeof llmPatch !== 'object') {
    console.warn('[mergeLlmPatch] Invalid llmPatch provided, using base model');
    return base;
  }

  const merged = { ...base };

  // Simple fields: LLM wins if provided and non-empty
  if (llmPatch.summary !== undefined && typeof llmPatch.summary === 'string' && llmPatch.summary.trim()) {
    merged.summary = llmPatch.summary;
  }
  if ('testDescription' in llmPatch && llmPatch.testDescription !== undefined && typeof llmPatch.testDescription === 'string') {
    merged.testDescription = llmPatch.testDescription;
  }

  // Array fields: LLM replaces if provided and non-empty (not extend - LLM is authoritative)
  const arrayFields: Array<keyof T> = Object.keys(base).filter(
    (key) => Array.isArray(base[key as keyof T])
  ) as Array<keyof T>;

  for (const field of arrayFields) {
    if (llmPatch[field] !== undefined && Array.isArray(llmPatch[field])) {
      const llmArray = llmPatch[field] as unknown[];
      // Only replace if LLM provided a non-empty array
      // Empty arrays are treated as "not provided" (keep base/override)
      if (llmArray.length > 0) {
        merged[field] = llmArray as T[keyof T];
      }
    }
  }

  return merged;
}

// ============================================================================
// Post-Merge Validation
// ============================================================================

/**
 * Validation result type
 */
export interface ModelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a Feature Goal model after merge to ensure it's complete and valid.
 * 
 * @param model - Model to validate
 * @returns Validation result with errors and warnings
 */
export function validateFeatureGoalModelAfterMerge(
  model: FeatureGoalDocModel
): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  if (!model.summary || typeof model.summary !== 'string' || !model.summary.trim()) {
    errors.push('Field "summary" is required and must be a non-empty string');
  }
  if (!model.testDescription || typeof model.testDescription !== 'string') {
    errors.push('Field "testDescription" is required and must be a string');
  }

  // Required array fields
  const requiredArrayFields: Array<keyof FeatureGoalDocModel> = [
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'epics',
    'flowSteps',
    'dependencies',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else if (field === 'epics') {
      // Validate epic objects
      const epics = model[field] as FeatureGoalDocModel['epics'];
      epics.forEach((epic, index) => {
        if (!epic || typeof epic !== 'object') {
          errors.push(`Field "epics[${index}]" must be an object`);
        } else {
          if (!epic.id || typeof epic.id !== 'string') {
            errors.push(`Field "epics[${index}].id" must be a non-empty string`);
          }
          if (!epic.name || typeof epic.name !== 'string') {
            errors.push(`Field "epics[${index}].name" must be a non-empty string`);
          }
          if (!epic.description || typeof epic.description !== 'string') {
            errors.push(`Field "epics[${index}].description" must be a non-empty string`);
          }
        }
      });
    } else if (field === 'scenarios') {
      // Validate scenario objects
      const scenarios = model[field] as FeatureGoalDocModel['scenarios'];
      scenarios.forEach((scenario, index) => {
        if (!scenario || typeof scenario !== 'object') {
          errors.push(`Field "scenarios[${index}]" must be an object`);
        } else {
          if (!scenario.id || typeof scenario.id !== 'string') {
            errors.push(`Field "scenarios[${index}].id" must be a non-empty string`);
          }
          if (!scenario.name || typeof scenario.name !== 'string') {
            errors.push(`Field "scenarios[${index}].name" must be a non-empty string`);
          }
          if (!scenario.type || typeof scenario.type !== 'string') {
            errors.push(`Field "scenarios[${index}].type" must be a non-empty string`);
          }
          if (!scenario.outcome || typeof scenario.outcome !== 'string') {
            errors.push(`Field "scenarios[${index}].outcome" must be a non-empty string`);
          }
        }
      });
    }
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.effectGoals.length === 0) {
    warnings.push('Field "effectGoals" is empty - consider adding effect goals');
  }
  if (model.flowSteps.length === 0) {
    warnings.push('Field "flowSteps" is empty - consider adding flow steps');
  }
  if (model.scenarios.length === 0) {
    warnings.push('Field "scenarios" is empty - consider adding scenarios');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates an Epic model after merge to ensure it's complete and valid.
 * 
 * @param model - Model to validate
 * @returns Validation result with errors and warnings
 */
export function validateEpicModelAfterMerge(
  model: EpicDocModel
): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  if (!model.summary || typeof model.summary !== 'string' || !model.summary.trim()) {
    errors.push('Field "summary" is required and must be a non-empty string');
  }
  if (!model.testDescription || typeof model.testDescription !== 'string') {
    errors.push('Field "testDescription" is required and must be a string');
  }

  // Required array fields
  const requiredArrayFields: Array<keyof EpicDocModel> = [
    'prerequisites',
    'inputs',
    'flowSteps',
    'interactions',
    'dataContracts',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else if (field === 'scenarios') {
      // Validate scenario objects
      const scenarios = model[field] as EpicScenario[];
      scenarios.forEach((scenario, index) => {
        if (!scenario || typeof scenario !== 'object') {
          errors.push(`Field "scenarios[${index}]" must be an object`);
        } else {
          if (!scenario.id || typeof scenario.id !== 'string') {
            errors.push(`Field "scenarios[${index}].id" must be a non-empty string`);
          }
          if (!scenario.name || typeof scenario.name !== 'string') {
            errors.push(`Field "scenarios[${index}].name" must be a non-empty string`);
          }
          if (!scenario.type || typeof scenario.type !== 'string') {
            errors.push(`Field "scenarios[${index}].type" must be a non-empty string`);
          }
          if (!scenario.description || typeof scenario.description !== 'string') {
            errors.push(`Field "scenarios[${index}].description" must be a non-empty string`);
          }
          if (!scenario.outcome || typeof scenario.outcome !== 'string') {
            errors.push(`Field "scenarios[${index}].outcome" must be a non-empty string`);
          }
        }
      });
    }
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.inputs.length === 0) {
    warnings.push('Field "inputs" is empty - consider adding inputs');
  }
  if (model.flowSteps.length === 0) {
    warnings.push('Field "flowSteps" is empty - consider adding flow steps');
  }
  if (model.scenarios.length === 0) {
    warnings.push('Field "scenarios" is empty - consider adding scenarios');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a Business Rule model after merge to ensure it's complete and valid.
 * 
 * @param model - Model to validate
 * @returns Validation result with errors and warnings
 */
export function validateBusinessRuleModelAfterMerge(
  model: BusinessRuleDocModel
): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  if (!model.summary || typeof model.summary !== 'string' || !model.summary.trim()) {
    errors.push('Field "summary" is required and must be a non-empty string');
  }
  if (!model.testDescription || typeof model.testDescription !== 'string') {
    errors.push('Field "testDescription" is required and must be a string');
  }

  // Required array fields
  const requiredArrayFields: Array<keyof BusinessRuleDocModel> = [
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else if (field === 'scenarios') {
      // Validate scenario objects
      const scenarios = model[field] as BusinessRuleScenario[];
      scenarios.forEach((scenario, index) => {
        if (!scenario || typeof scenario !== 'object') {
          errors.push(`Field "scenarios[${index}]" must be an object`);
        } else {
          if (!scenario.id || typeof scenario.id !== 'string') {
            errors.push(`Field "scenarios[${index}].id" must be a non-empty string`);
          }
          if (!scenario.name || typeof scenario.name !== 'string') {
            errors.push(`Field "scenarios[${index}].name" must be a non-empty string`);
          }
          if (!scenario.input || typeof scenario.input !== 'string') {
            errors.push(`Field "scenarios[${index}].input" must be a non-empty string`);
          }
          if (!scenario.outcome || typeof scenario.outcome !== 'string') {
            errors.push(`Field "scenarios[${index}].outcome" must be a non-empty string`);
          }
        }
      });
    }
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.inputs.length === 0) {
    warnings.push('Field "inputs" is empty - consider adding inputs');
  }
  if (model.decisionLogic.length === 0) {
    warnings.push('Field "decisionLogic" is empty - consider adding decision logic');
  }
  if (model.outputs.length === 0) {
    warnings.push('Field "outputs" is empty - consider adding outputs');
  }
  if (model.scenarios.length === 0) {
    warnings.push('Field "scenarios" is empty - consider adding scenarios');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

