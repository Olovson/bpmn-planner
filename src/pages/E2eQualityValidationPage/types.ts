/**
 * Types and interfaces for E2eQualityValidationPage
 * 
 * Extracted from E2eQualityValidationPage.tsx for better organization
 */

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
  suggestion?: string;
  exampleCode?: string; // Exempel-kod som kan kopieras
  metadata?: {
    taskId?: string;
    taskName?: string;
    taskType?: 'ServiceTask' | 'UserTask' | 'BusinessRuleTask';
    bpmnFile?: string;
    apiCall?: string;
    fieldPath?: string;
    expectedValue?: string;
  };
}

export interface CompletenessMetrics {
  serviceTasks: { total: number; documented: number; percentage: number };
  userTasks: { total: number; documented: number; percentage: number };
  businessRuleTasks: { total: number; documented: number; percentage: number };
  subprocesses: { total: number; documented: number; percentage: number };
  apiMocks: { total: number; mocked: number; percentage: number };
}

export interface MockQualityAnalysis {
  serviceTaskName: string;
  apiCall: string;
  hasMock: boolean;
  mockEndpoint?: string;
  responseQuality: 'good' | 'basic' | 'missing';
  issues: string[];
}

export interface BpmnServiceTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

export interface BpmnUserTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

export interface BpmnBusinessRuleTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

export interface BpmnValidationResult {
  bpmnFile: string;
  serviceTasksInBpmn: BpmnServiceTask[];
  serviceTasksDocumented: Array<{ id: string; name: string; apiCall?: string }>;
  missingServiceTasks: BpmnServiceTask[];
  undocumentedServiceTasks: BpmnServiceTask[];
  removedServiceTasks: Array<{ id: string; name: string; source: string }>; // Tasks i dokumentationen men inte i BPMN
  userTasksInBpmn: BpmnUserTask[];
  userTasksDocumented: Array<{ id: string; name: string; uiInteraction?: string }>;
  missingUserTasks: BpmnUserTask[];
  removedUserTasks: Array<{ id: string; name: string; source: string }>; // Tasks i dokumentationen men inte i BPMN
  businessRuleTasksInBpmn: BpmnBusinessRuleTask[];
  businessRuleTasksDocumented: Array<{ id: string; name: string; dmnDecision?: string }>;
  missingBusinessRuleTasks: BpmnBusinessRuleTask[];
  removedBusinessRuleTasks: Array<{ id: string; name: string; source: string }>; // Tasks i dokumentationen men inte i BPMN
  callActivitiesInBpmn: Array<{ id: string; name: string }>;
  callActivitiesDocumented: Array<{ id: string; name: string; source: string }>;
  missingCallActivities: Array<{ id: string; name: string }>;
  removedCallActivities: Array<{ id: string; name: string; source: string }>; // CallActivities i dokumentationen men inte i BPMN
}

export interface BackendStateField {
  entity: string; // t.ex. "Application"
  field: string; // t.ex. "status"
  value: string; // t.ex. "COMPLETE"
  fullPath: string; // t.ex. "Application.status"
}

export interface MockResponseAnalysis {
  apiCall: string;
  backendStateFields: BackendStateField[];
  mockResponseFields: string[];
  missingFields: BackendStateField[];
  suggestions: string[];
}

export interface ValidationResult {
  scenarioId: string;
  scenarioName: string;
  issues: ValidationIssue[];
  completeness: CompletenessMetrics;
  overallScore: number;
  mockQuality?: MockQualityAnalysis[];
  bpmnValidation?: BpmnValidationResult[];
  mockResponseAnalysis?: MockResponseAnalysis[];
}

