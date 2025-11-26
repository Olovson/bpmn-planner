import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage.bpmn
 * elementId: credit-evaluation
 * type: feature-goal
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage.bpmn::credit-evaluation
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
  // Kort sammanfattning på Feature Goal-nivå
  summary: 'TODO',

  // Effektmål på affärsnivå
  effectGoals: ['TODO'],

  // Scope (Ingår / Ingår inte)
  scopeIncluded: ['TODO'],
  scopeExcluded: ['TODO'],

  // Ingående epics
  epics: [],

  // Översiktliga affärsflödessteg
  flowSteps: ['TODO'],

  // Viktiga beroenden
  dependencies: ['TODO'],

  // Centrala affärs-scenarion (happy/edge/error)
  scenarios: [],

  // Koppling till automatiska tester
  testDescription: 'TODO',

  // Tekniska/implementationsrelaterade anteckningar
  implementationNotes: ['TODO'],

  // Relaterade regler / subprocesser / artefakter
  relatedItems: ['TODO'],
};
