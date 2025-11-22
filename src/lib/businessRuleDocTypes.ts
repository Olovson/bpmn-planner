export interface BusinessRuleScenario {
  id: string;
  name: string;
  input: string;
  outcome: string;
  type?: string;
}

export interface BusinessRuleDocModel {
  summary: string;
  inputs: string[];
  decisionLogic: string[];
  outputs: string[];
  businessRulesPolicy: string[];
  scenarios: BusinessRuleScenario[];
  testDescription: string;
  implementationNotes: string[];
  relatedItems: string[];
}

export type BusinessRuleLlmSections = BusinessRuleDocModel;

