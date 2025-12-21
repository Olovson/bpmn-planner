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

export interface EpicUserStory {
  id: string;
  role: string; // "Kund", "Handläggare", "System", etc.
  goal: string; // Vad vill rollen uppnå?
  value: string; // Varför är det värdefullt?
  acceptanceCriteria: string[]; // Konkreta krav (2-4 per story)
}

export interface EpicDocModel {
  summary: string;
  prerequisites: string[];
  flowSteps: string[];
  interactions?: string[]; // Optional - primarily for User Tasks
  dependencies?: string[]; // Optional - dependencies for the Epic
  userStories: EpicUserStory[]; // 3-6 user stories per Epic
}

export type EpicLlmSections = EpicDocModel;

