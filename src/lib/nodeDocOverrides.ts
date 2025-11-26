/**
 * Per-node documentation overrides system.
 * 
 * Allows nodes to have custom documentation files that override or extend
 * the base auto-generated documentation models.
 * 
 * Override files live in: src/data/node-docs/{docType}/{bpmnBaseName}.{elementId}.doc.ts
 */

import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel } from './epicDocTypes';
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
    // File doesn't exist - that's fine, use base model
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module'))
    ) {
      return null;
    }
    console.warn(
      `[nodeDocOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
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
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module'))
    ) {
      return null;
    }
    console.warn(
      `[nodeDocOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
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
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Cannot find module'))
    ) {
      return null;
    }
    console.warn(
      `[nodeDocOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
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
      merged[field] = [
        ...(base[field] as unknown[]),
        ...(overrides[field] as unknown[]),
      ] as typeof base[typeof field];
    } else {
      // Replace: use override completely
      merged[field] = overrides[field] as typeof base[typeof field];
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
      merged[field] = [
        ...(base[field] as unknown[]),
        ...(overrides[field] as unknown[]),
      ] as typeof base[typeof field];
    } else {
      merged[field] = overrides[field] as typeof base[typeof field];
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
      merged[field] = [
        ...(base[field] as unknown[]),
        ...(overrides[field] as unknown[]),
      ] as typeof base[typeof field];
    } else {
      merged[field] = overrides[field] as typeof base[typeof field];
    }
  }

  return merged;
}

// ============================================================================
// LLM Patch Merge
// ============================================================================

/**
 * Merges an LLM-generated partial model into a base/override model.
 * LLM fields take precedence (replace strategy) - when LLM is used, it's authoritative.
 * 
 * This is used to merge LLM output (from ChatGPT or Ollama) into the base model
 * that may already have per-node overrides applied.
 */
export function mergeLlmPatch<T extends FeatureGoalDocModel | EpicDocModel | BusinessRuleDocModel>(
  base: T,
  llmPatch: Partial<T>
): T {
  const merged = { ...base };

  // Simple fields: LLM wins if provided
  if (llmPatch.summary !== undefined && llmPatch.summary.trim()) {
    merged.summary = llmPatch.summary;
  }
  if ('testDescription' in llmPatch && llmPatch.testDescription !== undefined) {
    merged.testDescription = llmPatch.testDescription as string;
  }

  // Array fields: LLM replaces if provided (not extend - LLM is authoritative)
  const arrayFields: Array<keyof T> = Object.keys(base).filter(
    (key) => Array.isArray(base[key as keyof T])
  ) as Array<keyof T>;

  for (const field of arrayFields) {
    if (llmPatch[field] !== undefined && Array.isArray(llmPatch[field])) {
      const llmArray = llmPatch[field] as unknown[];
      if (llmArray.length > 0) {
        merged[field] = llmArray as T[keyof T];
      }
    }
  }

  return merged;
}

