/**
 * Type definitions for project configuration
 * Used for configuring timeline parameters like preparatory activities
 * and integration ownership (Stacc vs Banken)
 */

export interface PreparatoryActivity {
  id: string;
  name: string;
  description?: string;
  estimatedWeeks: number;
  order: number;
}

export interface WorkItem {
  id: string;
  name: string;
  estimatedWeeks: number;
  description?: string;
  order?: number;
}

export interface IntegrationConfig {
  bpmnFile: string;
  elementId: string;
  elementName?: string;
  description?: string;
  integrationSource?: string;
  implementedBy: 'stacc' | 'bank';
  extraWorkItems?: WorkItem[];
  // Optional work items that can be enabled regardless of implementation owner
  gemensamAnalys?: boolean;
  gemensamTestning?: boolean;
  revision?: boolean;
}

export interface ProjectConfiguration {
  rootBpmnFile: string; // Identifierare för projektet (t.ex. "mortgage.bpmn")
  preparatoryActivities: PreparatoryActivity[];
  integrations: IntegrationConfig[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Default templates for preparatory activities
 */
export const DEFAULT_PREPARATORY_ACTIVITIES = [
  {
    name: 'Etablering',
    description: 'Kontrakt, onboarding, kickoff-möte, team setup',
    estimatedWeeks: 4,
  },
  {
    name: 'Plattformsetablering',
    description: 'Miljöer, infrastruktur, CI/CD, access och behörigheter',
    estimatedWeeks: 2,
  },
  {
    name: 'Design & Arkitektur',
    description: 'Teknisk design, arkitekturbeslut, integration mapping',
    estimatedWeeks: 3,
  },
] as const;

/**
 * Default work items when "Banken implementerar" is selected
 */
export const DEFAULT_BANK_WORK_ITEMS = [
  { name: 'Gemensam analys', estimatedWeeks: 2 },
  { name: 'Gemensam work breakdown och stub etablering', estimatedWeeks: 2 },
  { name: 'Banken implementerar', estimatedWeeks: 2 },
  { name: 'Gemensam felsökning och felhantering', estimatedWeeks: 2 },
] as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  MIN_WEEKS: 0.5,
  MAX_WEEKS: 52,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

