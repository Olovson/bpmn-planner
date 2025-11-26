import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * Documentation overrides for mortgage.bpmn::application
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: FeatureGoalDocOverrides = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * - Feature Goal: summary, effectGoals, scopeIncluded, scopeExcluded, epics, flowSteps, dependencies, scenarios, testDescription, implementationNotes, relatedItems
 * 
 * 
 */

export const overrides: FeatureGoalDocOverrides = {
  // Add your overrides here
  // Example:
  // summary: "Custom summary for this node...",
};
