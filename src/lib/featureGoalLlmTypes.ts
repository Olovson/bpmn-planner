export interface FeatureGoalLlmSections {
  summary: string;
  scopeIncluded: string[];
  scopeExcluded: string[];
  epics: {
    id: string;
    name: string;
    description: string;
    team: string;
  }[];
  flowSteps: string[];
  dependencies: string[];
  scenarios: {
    id: string;
    name: string;
    type: string;
    outcome: string;
  }[];
  testDescription: string;
  implementationNotes: string[];
  relatedItems: string[];
}

