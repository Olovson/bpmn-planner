/**
 * Documentation Quality Validator
 * 
 * Validerar att dokumentation innehåller minsta nödvändiga fält för testgenerering.
 */

import type { FeatureGoalDoc } from './e2eScenarioGenerator';

export interface DocumentationQualityResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

/**
 * Validerar kvaliteten på Feature Goal-dokumentation.
 * Kontrollerar att minsta nödvändiga fält finns för E2E scenario-generering.
 */
export function validateFeatureGoalDocQuality(doc: FeatureGoalDoc): DocumentationQualityResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Kritiska fält som måste finnas
  if (!doc.summary || doc.summary.trim().length === 0) {
    missingFields.push('summary');
  } else if (doc.summary.trim().length < 20) {
    warnings.push('summary är mycket kort (mindre än 20 tecken)');
  }

  if (!doc.flowSteps || doc.flowSteps.length === 0) {
    missingFields.push('flowSteps');
  } else if (doc.flowSteps.length < 2) {
    warnings.push('flowSteps innehåller färre än 2 steg');
  }

  // Viktiga fält som bör finnas (varning om saknas, men inte kritiskt)
  if (!doc.userStories || doc.userStories.length === 0) {
    warnings.push('userStories saknas - E2E scenarios kan bli mindre detaljerade');
  }

  if (!doc.dependencies || doc.dependencies.length === 0) {
    warnings.push('dependencies saknas - kontext kan saknas i E2E scenarios');
  }

  const isValid = missingFields.length === 0;

  return {
    isValid,
    missingFields,
    warnings,
  };
}

/**
 * Validerar kvaliteten på file-level dokumentation.
 */
export function validateFileLevelDocQuality(doc: {
  summary: string;
  flowSteps: string[];
  userStories?: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
  dependencies?: string[];
}): DocumentationQualityResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Kritiska fält som måste finnas
  if (!doc.summary || doc.summary.trim().length === 0) {
    missingFields.push('summary');
  } else if (doc.summary.trim().length < 20) {
    warnings.push('summary är mycket kort (mindre än 20 tecken)');
  }

  if (!doc.flowSteps || doc.flowSteps.length === 0) {
    missingFields.push('flowSteps');
  } else if (doc.flowSteps.length < 2) {
    warnings.push('flowSteps innehåller färre än 2 steg');
  }

  // Viktiga fält som bör finnas (varning om saknas, men inte kritiskt)
  if (!doc.userStories || doc.userStories.length === 0) {
    warnings.push('userStories saknas - E2E scenarios kan bli mindre detaljerade');
  }

  const isValid = missingFields.length === 0;

  return {
    isValid,
    missingFields,
    warnings,
  };
}




