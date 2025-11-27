export type ScenarioPersona = 'customer' | 'advisor' | 'system' | 'unknown';

export type ScenarioRiskLevel = 'P0' | 'P1' | 'P2';

export type ScenarioAssertionType = 'functional' | 'regression' | 'compliance' | 'other';

export interface ScenarioUiStep {
  pageId: string;
  action: string;
  locatorId?: string;
  dataProfileId?: string;
}

/**
 * EpicScenario represents a test scenario for the FICTIONAL APP (the business application
 * that BPMN files describe), NOT for BPMN Planner itself.
 * 
 * ⚠️ CONTEXT: These scenarios test the fictional app (e.g., mortgage system),
 * not the BPMN Planner tool we're building.
 * 
 * See docs/TWO_APP_CONTEXTS.md for the distinction between:
 * - BPMN_PLANNER: The tool we're building
 * - FICTIONAL_APP: The app that BPMN files represent
 */
export interface EpicScenario {
  id: string;
  name: string;
  type: string;
  description: string;
  outcome: string;
  persona?: ScenarioPersona;
  uiFlow?: ScenarioUiStep[];
  riskLevel?: ScenarioRiskLevel;
  assertionType?: ScenarioAssertionType;
  dataProfileId?: string;
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

