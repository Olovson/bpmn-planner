import type { EpicDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-kyc.bpmn
 * elementId: fetch-aml-kyc-risk
 * type: epic
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-kyc.bpmn::fetch-aml-kyc-risk
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: EpicDocOverrides = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * 
 * - Epic: summary, prerequisites, inputs, flowSteps, interactions, dataContracts, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems
 * 
 */

export const overrides: EpicDocOverrides = {
  // Syfte & värde för epiken
  summary: 'TODO',

  // Förutsättningar / triggers
  prerequisites: ['TODO'],

  // Inputs (datakällor / fält)
  inputs: ['TODO'],

  // Funktionellt flöde i epiken
  flowSteps: ['TODO'],

  // Interaktioner (kanaler, API:er, användare/system)
  interactions: ['TODO'],

  // Data-kontrakt / in- och utdata
  dataContracts: ['TODO'],

  // Affärsregler & policyberoenden
  businessRulesPolicy: ['TODO'],

  // Affärs-scenarion kopplade till tester
  scenarios: [],

  // Kort text om koppling till automatiska tester
  testDescription: 'TODO',

  // Implementation notes för dev/test
  implementationNotes: ['TODO'],

  // Relaterade steg & artefakter
  relatedItems: ['TODO'],
};
