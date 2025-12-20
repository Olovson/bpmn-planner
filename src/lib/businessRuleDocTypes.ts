export interface BusinessRuleDocModel {
  summary: string;
  inputs: string[];
  decisionLogic: string[];
  outputs: string[];
  businessRulesPolicy: string[];
  implementationNotes: string[];
  relatedItems: string[];
}

export type BusinessRuleLlmSections = BusinessRuleDocModel;

