/**
 * Per-node documentation overrides system.
 * 
 * Allows nodes to have custom documentation files that override or extend
 * the base auto-generated documentation models.
 * 
 * Override files live in: src/data/node-docs/{docType}/{bpmnBaseName}.{elementId}.doc.ts
 */

import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel, EpicUserStory } from './epicDocTypes';
import type { BusinessRuleDocModel } from './businessRuleDocTypes';
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
    prerequisites?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    dependencies?: 'replace' | 'extend';
    userStories?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
  };
};

/**
 * Partial override for Epic documentation.
 */
export type EpicDocOverrides = Partial<EpicDocModel> & {
  _mergeStrategy?: {
    prerequisites?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    interactions?: 'replace' | 'extend';
    userStories?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
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
  // Array fields: check merge strategy
  const arrayFields: Array<keyof FeatureGoalDocModel> = [
    'prerequisites',
    'flowSteps',
    'dependencies',
    'userStories',
    'implementationNotes',
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

  const arrayFields: Array<keyof EpicDocModel> = [
    'prerequisites',
    'flowSteps',
    'implementationNotes',
  ];

  // Handle userStories separately (it's an array of objects)
  if (overrides.userStories !== undefined) {
    const strategy = mergeStrategy.userStories || 'replace';
    if (strategy === 'extend') {
      merged.userStories = [...base.userStories, ...overrides.userStories];
    } else {
      merged.userStories = overrides.userStories;
    }
  }

  // Handle optional interactions field
  if (overrides.interactions !== undefined) {
    const strategy = mergeStrategy.interactions || 'replace';
    if (strategy === 'extend') {
      merged.interactions = [...(base.interactions || []), ...overrides.interactions];
    } else {
      merged.interactions = overrides.interactions;
    }
  }

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
  const arrayFields: Array<keyof BusinessRuleDocModel> = [
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
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
 * const base = { summary: "Base summary", prerequisites: ["Prereq 1"] };
 * 
 * // LLM patch
 * const llmPatch = { summary: "LLM summary", prerequisites: ["Prereq 2", "Prereq 3"] };
 * 
 * // Result
 * const merged = { summary: "LLM summary", prerequisites: ["Prereq 2", "Prereq 3"] };
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
  // Required array fields
  const requiredArrayFields: Array<keyof FeatureGoalDocModel> = [
    'prerequisites',
    'flowSteps',
    'userStories',
    'implementationNotes',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else if (field === 'userStories') {
      // Validate user story objects
      const userStories = model[field] as FeatureGoalDocModel['userStories'];
      userStories.forEach((story, index) => {
        if (!story || typeof story !== 'object') {
          errors.push(`Field "userStories[${index}]" must be an object`);
        } else {
          if (!story.id || typeof story.id !== 'string') {
            errors.push(`Field "userStories[${index}].id" must be a non-empty string`);
          }
          if (!story.role || typeof story.role !== 'string') {
            errors.push(`Field "userStories[${index}].role" must be a non-empty string`);
          }
          if (!story.goal || typeof story.goal !== 'string') {
            errors.push(`Field "userStories[${index}].goal" must be a non-empty string`);
          }
          if (!story.value || typeof story.value !== 'string') {
            errors.push(`Field "userStories[${index}].value" must be a non-empty string`);
          }
          if (!Array.isArray(story.acceptanceCriteria)) {
            errors.push(`Field "userStories[${index}].acceptanceCriteria" must be an array`);
          }
        }
      });
    }
  }

  // Optional array fields
  if (model.dependencies && !Array.isArray(model.dependencies)) {
    errors.push('Field "dependencies" must be an array if provided');
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.prerequisites && model.prerequisites.length === 0) {
    warnings.push('Field "prerequisites" is empty - consider adding prerequisites');
  }
  if (model.flowSteps.length === 0) {
    warnings.push('Field "flowSteps" is empty - consider adding flow steps');
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

  // Required array fields
  const requiredArrayFields: Array<keyof EpicDocModel> = [
    'prerequisites',
    'flowSteps',
    'userStories',
    'implementationNotes',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else if (field === 'userStories') {
      // Validate user story objects
      const userStories = model[field] as EpicUserStory[];
      if (userStories.length < 3) {
        errors.push(`Field "userStories" must have at least 3 user stories`);
      }
      if (userStories.length > 6) {
        errors.push(`Field "userStories" must have at most 6 user stories`);
      }
      userStories.forEach((story, index) => {
        if (!story || typeof story !== 'object') {
          errors.push(`Field "userStories[${index}]" must be an object`);
        } else {
          if (!story.id || typeof story.id !== 'string') {
            errors.push(`Field "userStories[${index}].id" must be a non-empty string`);
          }
          if (!story.role || typeof story.role !== 'string') {
            errors.push(`Field "userStories[${index}].role" must be a non-empty string`);
          }
          if (!story.goal || typeof story.goal !== 'string') {
            errors.push(`Field "userStories[${index}].goal" must be a non-empty string`);
          }
          if (!story.value || typeof story.value !== 'string') {
            errors.push(`Field "userStories[${index}].value" must be a non-empty string`);
          }
          if (!Array.isArray(story.acceptanceCriteria) || story.acceptanceCriteria.length < 2) {
            errors.push(`Field "userStories[${index}].acceptanceCriteria" must be an array with at least 2 items`);
          }
          if (story.acceptanceCriteria.length > 4) {
            errors.push(`Field "userStories[${index}].acceptanceCriteria" must have at most 4 items`);
          }
        }
      });
    }
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.flowSteps.length === 0) {
    warnings.push('Field "flowSteps" is empty - consider adding flow steps');
  }
  if (model.userStories.length < 3) {
    warnings.push('Field "userStories" should have at least 3 user stories');
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
  // Required array fields
  const requiredArrayFields: Array<keyof BusinessRuleDocModel> = [
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'relatedItems',
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(model[field])) {
      errors.push(`Field "${field}" must be an array`);
    }
  }

  // Warnings for empty arrays (not errors, but might indicate incomplete data)
  if (model.decisionLogic.length === 0) {
    warnings.push('Field "decisionLogic" is empty - consider adding decision logic');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

