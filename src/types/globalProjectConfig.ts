/**
 * Global project configuration for timeline planning
 * Simplified model focused on three main areas:
 * 1. Default task duration
 * 2. Bank-implemented integration work items
 * 3. Custom project-wide activities
 */

export interface CustomActivity {
  id: string;
  name: string;
  weeks: number;
  placement: 'before-all' | 'after-all';
  order: number; // For sorting activities with the same placement
}

export interface BankIntegrationWorkItems {
  analysisWeeks: number;      // Default: 2
  implementationWeeks: number; // Default: 4
  testingWeeks: number;       // Default: 2
  validationWeeks: number;    // Default: 1
}

export interface PerNodeWorkItems {
  bpmnFile: string;
  elementId: string;
  analysisWeeks?: number;      // Optional, fallback to global default
  implementationWeeks?: number; // Optional, fallback to global default
  testingWeeks?: number;       // Optional, fallback to global default
  validationWeeks?: number;    // Optional, fallback to global default
}

export interface GlobalProjectConfig {
  rootBpmnFile: string; // Identifier for the project (e.g., "mortgage.bpmn")
  
  // 1. General task duration
  defaultTaskWeeks: number; // Default: 2 weeks (14 days)

  // 2. Bank-implemented integration work items (global defaults)
  bankIntegrationWorkItems: BankIntegrationWorkItems;

  // 3. Custom project activities
  customActivities: CustomActivity[];
  
  // 4. Per-node work items (overrides global defaults)
  perNodeWorkItems: PerNodeWorkItems[];
  
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Default values
 */
export const DEFAULT_CONFIG: Omit<GlobalProjectConfig, 'rootBpmnFile' | 'createdAt' | 'updatedAt'> = {
  staccIntegrationWorkItems: {
    analysisWeeks: 0,
    implementationWeeks: 2,
    testingWeeks: 0,
    validationWeeks: 0,
  },
  bankIntegrationWorkItems: {
    analysisWeeks: 2,
    implementationWeeks: 4,
    testingWeeks: 2,
    validationWeeks: 0,
  },
  customActivities: [],
  perNodeWorkItems: [],
};

/**
 * Default activity templates
 */
export const DEFAULT_ACTIVITY_TEMPLATES = [
  {
    name: 'Implementeringsprojekt',
    description: 'Etablering, kontrakt, onboarding, kickoff-möte, team setup',
    defaultWeeks: 4,
  },
  {
    name: 'Plattformsprojekt',
    description: 'Miljöer, infrastruktur, CI/CD, access och behörigheter',
    defaultWeeks: 2,
  },
] as const;

/**
 * Validation constants for configuration values
 */
export const VALIDATION = {
  MIN_WEEKS: 0.5,
  MAX_WEEKS: 52,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

