export interface EpicScenario {
  id: string;
  name: string;
  type: string;
  description: string;
  outcome: string;
}

export interface EpicDocModel {
  summary: string;
  prerequisites: string[];
  inputs: string[];
  flowSteps: string[];
  interactions: string[];
  dataContracts: string[];
  businessRulesPolicy: string[];
  scenarios: EpicScenario[];
  testDescription: string;
  implementationNotes: string[];
  relatedItems: string[];
}

export type EpicLlmSections = EpicDocModel;

