/**
 * Scenario validation function
 * 
 * Extracted from E2eQualityValidationPage.tsx for better organization
 */

import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type {
  ValidationIssue,
  CompletenessMetrics,
  MockQualityAnalysis,
  ValidationResult,
} from '@/pages/E2eQualityValidationPage/types';
import {
  generateExampleCode,
  extractTaskNamesFromSummary,
  calculatePercentage,
  analyzeMockQuality,
  analyzeMockResponses,
} from '@/pages/E2eQualityValidationPage/utils/validationHelpers';
import { validateBpmnMapping } from './validateBpmnMapping';

// Validera ett scenario
export async function validateScenario(
  scenario: E2eScenario,
  mockedEndpoints: Set<string>,
  processTree: ProcessTreeNode | null
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const completeness: CompletenessMetrics = {
    serviceTasks: { total: 0, documented: 0, percentage: 0 },
    userTasks: { total: 0, documented: 0, percentage: 0 },
    businessRuleTasks: { total: 0, documented: 0, percentage: 0 },
    subprocesses: { total: 0, documented: 0, percentage: 0 },
    apiMocks: { total: 0, mocked: 0, percentage: 0 },
  };

  // 1. Validera subprocesser
  const subprocessSteps = scenario.subprocessSteps || [];
  completeness.subprocesses.total = subprocessSteps.length;

  subprocessSteps.forEach((step, index) => {
    if (!step.given || step.given.trim().length === 0) {
      const issue: ValidationIssue = {
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Given`,
        location: `subprocessSteps[${index}].given`,
        suggestion: 'Lägg till Given-beskrivning baserat på Feature Goal',
      };
      issue.exampleCode = generateExampleCode(issue);
      issues.push(issue);
    }

    if (!step.when || step.when.trim().length === 0) {
      const issue: ValidationIssue = {
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar When`,
        location: `subprocessSteps[${index}].when`,
        suggestion: 'Lägg till When-beskrivning baserat på Feature Goal',
      };
      issue.exampleCode = generateExampleCode(issue);
      issues.push(issue);
    }

    if (!step.then || step.then.trim().length === 0) {
      const issue: ValidationIssue = {
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Then`,
        location: `subprocessSteps[${index}].then`,
        suggestion: 'Lägg till Then-beskrivning baserat på Feature Goal',
      };
      issue.exampleCode = generateExampleCode(issue);
      issues.push(issue);
    }

    if (step.given && step.when && step.then) {
      completeness.subprocesses.documented++;
    }
  });

  // 2. Validera bankProjectTestSteps och analysera mock-kvalitet
  const testSteps = scenario.bankProjectTestSteps || [];
  const mockQualityAnalysis: MockQualityAnalysis[] = [];

  testSteps.forEach((step, index) => {
    // Validera ServiceTasks
    if (step.bpmnNodeType === 'ServiceTask') {
      completeness.serviceTasks.total++;

      if (!step.apiCall || step.apiCall.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'ServiceTask Documentation',
          message: `ServiceTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar API-anrop`,
          location: `bankProjectTestSteps[${index}].apiCall`,
          suggestion: 'Lägg till API-anrop baserat på Feature Goal eller BPMN-nodens syfte',
        });
      } else {
        completeness.serviceTasks.documented++;

        // Analysera mock-kvalitet
        const mockAnalysis = analyzeMockQuality(step.bpmnNodeName, step.apiCall, mockedEndpoints);
        mockQualityAnalysis.push(mockAnalysis);

        // Kontrollera om API har mock
        completeness.apiMocks.total++;
        if (mockAnalysis.hasMock) {
          completeness.apiMocks.mocked++;
        } else {
          const issue: ValidationIssue = {
            severity: 'warning',
            category: 'API Mock Coverage',
            message: `API-anrop "${step.apiCall}" saknar mock`,
            location: `bankProjectTestSteps[${index}].apiCall`,
            suggestion: `Lägg till mock för ${step.apiCall} i mortgageE2eMocks.ts`,
            metadata: {
              apiCall: step.apiCall,
              taskId: step.bpmnNodeId,
              taskName: step.bpmnNodeName,
            },
          };
          issue.exampleCode = generateExampleCode(issue);
          issues.push(issue);
        }
      }
    }

    // Validera UserTasks
    if (step.bpmnNodeType === 'UserTask') {
      completeness.userTasks.total++;

      if (!step.uiInteraction || step.uiInteraction.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'UserTask Documentation',
          message: `UserTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar UI-interaktion`,
          location: `bankProjectTestSteps[${index}].uiInteraction`,
          suggestion: 'Lägg till UI-interaktion baserat på Feature Goal',
        });
      } else {
        completeness.userTasks.documented++;
      }
    }

    // Validera BusinessRuleTasks
    if (step.bpmnNodeType === 'BusinessRuleTask') {
      completeness.businessRuleTasks.total++;

      if (!step.dmnDecision || step.dmnDecision.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'BusinessRuleTask Documentation',
          message: `BusinessRuleTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar DMN-beslut`,
          location: `bankProjectTestSteps[${index}].dmnDecision`,
          suggestion: 'Lägg till DMN-beslut baserat på BPMN-nodens syfte',
        });
      } else {
        completeness.businessRuleTasks.documented++;
      }
    }
  });

  // 3. Beräkna procentuell kompletthet
  completeness.serviceTasks.percentage = calculatePercentage(
    completeness.serviceTasks.total,
    completeness.serviceTasks.documented
  );
  completeness.userTasks.percentage = calculatePercentage(
    completeness.userTasks.total,
    completeness.userTasks.documented
  );
  completeness.businessRuleTasks.percentage = calculatePercentage(
    completeness.businessRuleTasks.total,
    completeness.businessRuleTasks.documented
  );
  completeness.subprocesses.percentage = calculatePercentage(
    completeness.subprocesses.total,
    completeness.subprocesses.documented
  );
  completeness.apiMocks.percentage = calculatePercentage(
    completeness.apiMocks.total,
    completeness.apiMocks.mocked
  );

  // 4. Beräkna overall score (viktat medelvärde)
  const weights = {
    serviceTasks: 0.25,
    userTasks: 0.25,
    businessRuleTasks: 0.15,
    subprocesses: 0.2,
    apiMocks: 0.15,
  };

  const overallScore = Math.round(
    completeness.serviceTasks.percentage * weights.serviceTasks +
    completeness.userTasks.percentage * weights.userTasks +
    completeness.businessRuleTasks.percentage * weights.businessRuleTasks +
    completeness.subprocesses.percentage * weights.subprocesses +
    completeness.apiMocks.percentage * weights.apiMocks
  );

  // 5. Validera BPMN → Scenarios mapping
  const bpmnValidation = validateBpmnMapping(scenario, processTree);
  
  // Extrahera dokumenterade tasks från subprocessSteps summaries för att kunna kolla om tasks är dokumenterade via summaries
  const documentedUserTasksFromSummaries = new Map<string, { id: string; name: string; source: string }>();
  const documentedBusinessRuleTasksFromSummaries = new Map<string, { id: string; name: string; source: string }>();
  
  scenario.subprocessSteps.forEach((step) => {
    if (step.userTasksSummary) {
      const taskNames = extractTaskNamesFromSummary(step.userTasksSummary);
      taskNames.forEach((taskName) => {
        if (!documentedUserTasksFromSummaries.has(taskName)) {
          documentedUserTasksFromSummaries.set(taskName, {
            id: taskName,
            name: taskName,
            source: `subprocessSteps[${step.order}].userTasksSummary`,
          });
        }
      });
    }
    
    if (step.businessRulesSummary) {
      const taskNames = extractTaskNamesFromSummary(step.businessRulesSummary);
      taskNames.forEach((taskName) => {
        if (!documentedBusinessRuleTasksFromSummaries.has(taskName)) {
          documentedBusinessRuleTasksFromSummaries.set(taskName, {
            id: taskName,
            name: taskName,
            source: `subprocessSteps[${step.order}].businessRulesSummary`,
          });
        }
      });
    }
  });
  
  // Lägg till issues för borttagna tasks och callActivities
  bpmnValidation.forEach((bpmnResult) => {
    // Borttagna ServiceTasks
    if (bpmnResult.removedServiceTasks.length > 0) {
      bpmnResult.removedServiceTasks.forEach((removedTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `ServiceTask "${removedTask.name}" (${removedTask.id}) finns i dokumentationen men inte längre i BPMN-fil ${bpmnResult.bpmnFile}`,
          location: removedTask.source,
          suggestion: `Ta bort ServiceTask "${removedTask.name}" från bankProjectTestSteps eller uppdatera bpmnNodeId om task-ID har ändrats`,
          metadata: {
            taskId: removedTask.id,
            taskName: removedTask.name,
            taskType: 'ServiceTask',
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issues.push(issue);
      });
    }
    
    // Borttagna UserTasks
    if (bpmnResult.removedUserTasks.length > 0) {
      bpmnResult.removedUserTasks.forEach((removedTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `UserTask "${removedTask.name}" (${removedTask.id}) finns i dokumentationen men inte längre i BPMN-fil ${bpmnResult.bpmnFile}`,
          location: removedTask.source,
          suggestion: `Ta bort UserTask "${removedTask.name}" från bankProjectTestSteps eller uppdatera bpmnNodeId om task-ID har ändrats`,
          metadata: {
            taskId: removedTask.id,
            taskName: removedTask.name,
            taskType: 'UserTask',
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issues.push(issue);
      });
    }
    
    // Borttagna BusinessRuleTasks
    if (bpmnResult.removedBusinessRuleTasks.length > 0) {
      bpmnResult.removedBusinessRuleTasks.forEach((removedTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `BusinessRuleTask "${removedTask.name}" (${removedTask.id}) finns i dokumentationen men inte längre i BPMN-fil ${bpmnResult.bpmnFile}`,
          location: removedTask.source,
          suggestion: `Ta bort BusinessRuleTask "${removedTask.name}" från bankProjectTestSteps eller uppdatera bpmnNodeId om task-ID har ändrats`,
          metadata: {
            taskId: removedTask.id,
            taskName: removedTask.name,
            taskType: 'BusinessRuleTask',
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issues.push(issue);
      });
    }
    
    // Borttagna callActivities
    if (bpmnResult.removedCallActivities.length > 0) {
      bpmnResult.removedCallActivities.forEach((removedCa) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `CallActivity "${removedCa.name}" (${removedCa.id}) finns i dokumentationen men inte längre i BPMN-fil ${bpmnResult.bpmnFile}`,
          location: removedCa.source,
          suggestion: `Ta bort CallActivity "${removedCa.name}" från subprocessSteps eller uppdatera callActivityId om ID har ändrats`,
          metadata: {
            taskId: removedCa.id,
            taskName: removedCa.name,
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issues.push(issue);
      });
    }
    
    // Saknade callActivities
    if (bpmnResult.missingCallActivities.length > 0) {
      bpmnResult.missingCallActivities.forEach((missingCa) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `CallActivity "${missingCa.name}" (${missingCa.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `subprocessSteps (saknas)`,
          suggestion: `Lägg till CallActivity "${missingCa.name}" i subprocessSteps med given/when/then`,
          metadata: {
            taskId: missingCa.id,
            taskName: missingCa.name,
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issues.push(issue);
      });
    }
  });
  
  // Lägg till issues för saknade ServiceTasks
  bpmnValidation.forEach((bpmnResult) => {
    if (bpmnResult.missingServiceTasks.length > 0) {
      bpmnResult.missingServiceTasks.forEach((missingTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `ServiceTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till ServiceTask "${missingTask.name}" i bankProjectTestSteps med korrekt API-anrop`,
          metadata: {
            taskId: missingTask.id,
            taskName: missingTask.name,
            taskType: 'ServiceTask',
            bpmnFile: bpmnResult.bpmnFile,
            apiCall: `POST /api/${missingTask.id.replace(/-/g, '/')}`,
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      });
    }
    
    // Lägg till issues för saknade UserTasks
    if (bpmnResult.missingUserTasks.length > 0) {
      bpmnResult.missingUserTasks.forEach((missingTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `UserTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till UserTask "${missingTask.name}" i bankProjectTestSteps med korrekt UI-interaktion`,
          metadata: {
            taskId: missingTask.id,
            taskName: missingTask.name,
            taskType: 'UserTask',
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      });
    }
    
    // Lägg till issues för saknade BusinessRuleTasks
    if (bpmnResult.missingBusinessRuleTasks.length > 0) {
      bpmnResult.missingBusinessRuleTasks.forEach((missingTask) => {
        const issue: ValidationIssue = {
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `BusinessRuleTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till BusinessRuleTask "${missingTask.name}" i bankProjectTestSteps med korrekt DMN-beslut`,
          metadata: {
            taskId: missingTask.id,
            taskName: missingTask.name,
            taskType: 'BusinessRuleTask',
            bpmnFile: bpmnResult.bpmnFile,
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      });
    }
    
    // Lägg till issues för UserTasks som saknar UI-interaktion
    // OBS: Tasks dokumenterade via summaries (subprocessSteps.userTasksSummary) har uiInteraction i CallActivity,
    // så de ska inte flaggas som errors
    bpmnResult.userTasksDocumented.forEach((docTask) => {
      // Kolla om task är dokumenterad via summary (då har den uiInteraction i CallActivity)
      const isDocumentedViaSummary = documentedUserTasksFromSummaries.has(docTask.id.toLowerCase()) ||
        Array.from(documentedUserTasksFromSummaries.keys()).some(summaryName => 
          docTask.name.toLowerCase().includes(summaryName) || summaryName.includes(docTask.name.toLowerCase())
        );
      
      if (!isDocumentedViaSummary && (!docTask.uiInteraction || docTask.uiInteraction.trim().length === 0)) {
        const issue: ValidationIssue = {
          severity: 'error',
          category: 'UserTask Documentation',
          message: `UserTask "${docTask.name}" (${docTask.id}) är dokumenterad men saknar UI-interaktion`,
          location: `bankProjectTestSteps → ${docTask.id}.uiInteraction`,
          suggestion: 'Lägg till UI-interaktion baserat på Feature Goal',
          metadata: {
            taskId: docTask.id,
            taskName: docTask.name,
            taskType: 'UserTask',
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      }
    });
    
    // Lägg till issues för BusinessRuleTasks som saknar DMN-beslut
    // OBS: Tasks dokumenterade via summaries (subprocessSteps.businessRulesSummary) har dmnDecision i CallActivity,
    // så de ska inte flaggas som errors
    bpmnResult.businessRuleTasksDocumented.forEach((docTask) => {
      // Kolla om task är dokumenterad via summary (då har den dmnDecision i CallActivity)
      const isDocumentedViaSummary = documentedBusinessRuleTasksFromSummaries.has(docTask.id.toLowerCase()) ||
        Array.from(documentedBusinessRuleTasksFromSummaries.keys()).some(summaryName => 
          docTask.name.toLowerCase().includes(summaryName) || summaryName.includes(docTask.name.toLowerCase()) ||
          (summaryName.includes('dmn') && docTask.name.toLowerCase().includes('dmn'))
        );
      
      if (!isDocumentedViaSummary && (!docTask.dmnDecision || docTask.dmnDecision.trim().length === 0)) {
        const issue: ValidationIssue = {
          severity: 'error',
          category: 'BusinessRuleTask Documentation',
          message: `BusinessRuleTask "${docTask.name}" (${docTask.id}) är dokumenterad men saknar DMN-beslut`,
          location: `bankProjectTestSteps → ${docTask.id}.dmnDecision`,
          suggestion: 'Lägg till DMN-beslut baserat på BPMN-nodens syfte',
          metadata: {
            taskId: docTask.id,
            taskName: docTask.name,
            taskType: 'BusinessRuleTask',
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      }
    });
  });

  // 6. Analysera mock-responser mot backend states
  const mockResponseAnalysis = await analyzeMockResponses(scenario);
  
  // Lägg till issues för saknade fält i mock-responser
  mockResponseAnalysis.forEach((analysis) => {
    if (analysis.missingFields.length > 0) {
      analysis.missingFields.forEach((field) => {
        const issue: ValidationIssue = {
          severity: 'info',
          category: 'Mock Response Quality',
          message: `Mock-response för ${analysis.apiCall} saknar fält "${field.fullPath}" (förväntat värde: ${field.value})`,
          location: `mortgageE2eMocks.ts → ${analysis.apiCall}`,
          suggestion: analysis.suggestions.find((s) => s.includes(field.field)) || `Lägg till ${field.field} i mock-response`,
          metadata: {
            apiCall: analysis.apiCall,
            fieldPath: field.fullPath,
            expectedValue: field.value,
          },
        };
        issue.exampleCode = generateExampleCode(issue);
        issues.push(issue);
      });
    }
  });

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    issues,
    completeness,
    overallScore,
    mockQuality: mockQualityAnalysis,
    bpmnValidation,
    mockResponseAnalysis,
  };
}

