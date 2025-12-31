// Domänmodell för Feature Goal-dokumentation.
// Denna struktur används både av det lokala generatorflödet och som målbilde
// för strukturerad LLM-output.
import type { ScenarioPersona, ScenarioRiskLevel, ScenarioAssertionType, ScenarioUiStep } from './epicDocTypes';

/**
 * Feature Goal dokumentation modell - konsoliderat med EpicDocModel för konsistens.
 * 
 * Feature Goals använder nu samma struktur som Epics (prerequisites konsoliderat till dependencies).
 */
export interface UsageCase {
  parentProcess: string;
  conditions?: string[];
  differences?: string;
}

export interface FeatureGoalDocModel {
  summary: string;
  flowSteps: string[];
  dependencies?: string[]; // Optional - includes both process context (prerequisites) and technical systems
  userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare'; // Kund, Handläggare eller Processägare - inga System-roller
    goal: string;
    value: string;
    acceptanceCriteria: string[]; // 2-4 acceptanskriterier per user story
  }>;
  usageCases?: UsageCase[]; // Optional - only included if there are differences between parent processes
}

export type FeatureGoalLlmSections = FeatureGoalDocModel;
