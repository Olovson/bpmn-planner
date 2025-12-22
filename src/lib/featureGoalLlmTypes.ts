// Domänmodell för Feature Goal-dokumentation.
// Denna struktur används både av det lokala generatorflödet och som målbilde
// för strukturerad LLM-output.
import type { ScenarioPersona, ScenarioRiskLevel, ScenarioAssertionType, ScenarioUiStep } from './epicDocTypes';

/**
 * Feature Goal dokumentation modell - kopierad från EpicDocModel för konsistens.
 * 
 * Feature Goals använder nu samma struktur som Epics.
 */
export interface FeatureGoalDocModel {
  summary: string;
  prerequisites: string[];
  flowSteps: string[];
  dependencies?: string[]; // Optional - dependencies for the Feature Goal
  userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare'; // Kund, Handläggare eller Processägare - inga System-roller
    goal: string;
    value: string;
    acceptanceCriteria: string[]; // 2-4 acceptanskriterier per user story
  }>;
}

export type FeatureGoalLlmSections = FeatureGoalDocModel;
