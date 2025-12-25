/**
 * BPMN mapping validation functions
 * 
 * Extracted from E2eQualityValidationPage.tsx for better organization
 */

import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type {
  BpmnValidationResult,
  BpmnServiceTask,
  BpmnUserTask,
  BpmnBusinessRuleTask,
} from '@/pages/E2eQualityValidationPage/types';
import { extractNodesFromTree, extractTaskNamesFromSummary } from '@/pages/E2eQualityValidationPage/utils/validationHelpers';

// Validera BPMN → Scenarios mapping med process tree
export function validateBpmnMapping(
  scenario: E2eScenario,
  processTree: ProcessTreeNode | null
): BpmnValidationResult[] {
  const results: BpmnValidationResult[] = [];
  
  if (!processTree) {
    return results;
  }
  
  // Hämta alla unika BPMN-filer från subprocessSteps
  const bpmnFiles = new Set<string>();
  const subprocessStepsByBpmnFile = new Map<string, typeof scenario.subprocessSteps>();
  
  scenario.subprocessSteps.forEach((step) => {
    if (step.bpmnFile) {
      bpmnFiles.add(step.bpmnFile);
      if (!subprocessStepsByBpmnFile.has(step.bpmnFile)) {
        subprocessStepsByBpmnFile.set(step.bpmnFile, []);
      }
      subprocessStepsByBpmnFile.get(step.bpmnFile)!.push(step);
    }
  });
  
  // Extrahera dokumenterade ServiceTasks, UserTasks och BusinessRuleTasks från bankProjectTestSteps
  const documentedServiceTasks = new Map<string, { id: string; name: string; apiCall?: string }>();
  const documentedUserTasks = new Map<string, { id: string; name: string; uiInteraction?: string }>();
  const documentedBusinessRuleTasks = new Map<string, { id: string; name: string; dmnDecision?: string }>();
  
  scenario.bankProjectTestSteps.forEach((step) => {
    if (step.bpmnNodeType === 'ServiceTask') {
      documentedServiceTasks.set(step.bpmnNodeId, {
        id: step.bpmnNodeId,
        name: step.bpmnNodeName,
        apiCall: step.apiCall,
      });
    } else if (step.bpmnNodeType === 'UserTask') {
      documentedUserTasks.set(step.bpmnNodeId, {
        id: step.bpmnNodeId,
        name: step.bpmnNodeName,
        uiInteraction: step.uiInteraction,
      });
    } else if (step.bpmnNodeType === 'BusinessRuleTask') {
      documentedBusinessRuleTasks.set(step.bpmnNodeId, {
        id: step.bpmnNodeId,
        name: step.bpmnNodeName,
        dmnDecision: step.dmnDecision,
      });
    }
  });
  
  // Extrahera dokumenterade tasks från subprocessSteps summaries
  const documentedServiceTasksFromSummaries = new Map<string, { id: string; name: string; source: string }>();
  const documentedUserTasksFromSummaries = new Map<string, { id: string; name: string; source: string }>();
  const documentedBusinessRuleTasksFromSummaries = new Map<string, { id: string; name: string; source: string }>();
  
  scenario.subprocessSteps.forEach((step) => {
    if (step.serviceTasksSummary) {
      const taskNames = extractTaskNamesFromSummary(step.serviceTasksSummary);
      taskNames.forEach((taskName) => {
        if (!documentedServiceTasksFromSummaries.has(taskName)) {
          documentedServiceTasksFromSummaries.set(taskName, {
            id: taskName,
            name: taskName,
            source: `subprocessSteps[${step.order}].serviceTasksSummary`,
          });
        }
      });
    }
    
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
  
  // Validera varje BPMN-fil
  for (const bpmnFile of bpmnFiles) {
    const serviceTasksInBpmn = extractNodesFromTree(processTree, 'serviceTask', bpmnFile);
    const userTasksInBpmn = extractNodesFromTree(processTree, 'userTask', bpmnFile);
    const businessRuleTasksInBpmn = extractNodesFromTree(processTree, 'businessRuleTask', bpmnFile);
    
    const serviceTasksDocumented: Array<{ id: string; name: string; apiCall?: string }> = [];
    const missingServiceTasks: BpmnServiceTask[] = [];
    const undocumentedServiceTasks: BpmnServiceTask[] = [];
    
    const userTasksDocumented: Array<{ id: string; name: string; uiInteraction?: string }> = [];
    const missingUserTasks: BpmnUserTask[] = [];
    
    const businessRuleTasksDocumented: Array<{ id: string; name: string; dmnDecision?: string }> = [];
    const missingBusinessRuleTasks: BpmnBusinessRuleTask[] = [];
    
    // Identifiera borttagna tasks (finns i dokumentationen men inte i BPMN)
    const removedServiceTasks: Array<{ id: string; name: string; source: string }> = [];
    const removedUserTasks: Array<{ id: string; name: string; source: string }> = [];
    const removedBusinessRuleTasks: Array<{ id: string; name: string; source: string }> = [];
    
    // Extrahera callActivities från BPMN
    const callActivitiesInBpmn: Array<{ id: string; name: string }> = [];
    const callActivitiesDocumented: Array<{ id: string; name: string; source: string }> = [];
    const missingCallActivities: Array<{ id: string; name: string }> = [];
    const removedCallActivities: Array<{ id: string; name: string; source: string }> = [];
    
    // Extrahera callActivities från process tree för denna BPMN-fil
    function extractCallActivitiesFromTree(node: ProcessTreeNode, targetBpmnFile: string): Array<{ id: string; name: string }> {
      const result: Array<{ id: string; name: string }> = [];
      
      if (node.bpmnFile === targetBpmnFile && node.type === 'callActivity') {
        result.push({
          id: node.bpmnElementId || node.id,
          name: node.label || node.id,
        });
      }
      
      node.children.forEach(child => {
        result.push(...extractCallActivitiesFromTree(child, targetBpmnFile));
      });
      
      return result;
    }
    
    const callActivitiesInBpmnForFile = extractCallActivitiesFromTree(processTree, bpmnFile);
    callActivitiesInBpmn.push(...callActivitiesInBpmnForFile);
    
    // Extrahera dokumenterade callActivities från subprocessSteps
    const subprocessStepsForFile = subprocessStepsByBpmnFile.get(bpmnFile) || [];
    subprocessStepsForFile.forEach((step) => {
      if (step.callActivityId) {
        callActivitiesDocumented.push({
          id: step.callActivityId,
          name: step.description || step.callActivityId,
          source: `subprocessSteps[${step.order}].callActivityId`,
        });
      }
    });
    
    // Identifiera saknade callActivities (finns i BPMN men inte i dokumentationen)
    callActivitiesInBpmn.forEach((bpmnCa) => {
      const documented = callActivitiesDocumented.find(doc => doc.id === bpmnCa.id);
      if (!documented) {
        missingCallActivities.push(bpmnCa);
      }
    });
    
    // Identifiera borttagna callActivities (finns i dokumentationen men inte i BPMN)
    callActivitiesDocumented.forEach((docCa) => {
      const existsInBpmn = callActivitiesInBpmn.some(bpmnCa => bpmnCa.id === docCa.id);
      if (!existsInBpmn) {
        removedCallActivities.push(docCa);
      }
    });
    
    // Identifiera borttagna ServiceTasks
    documentedServiceTasks.forEach((docTask, docId) => {
      // Kontrollera om task finns i BPMN för denna fil
      const existsInBpmn = serviceTasksInBpmn.some(bpmnTask => bpmnTask.id === docId);
      if (!existsInBpmn) {
        // Kontrollera om task kan finnas i en annan fil (via summaries)
        let foundInSummaries = false;
        for (const [summaryTaskName] of documentedServiceTasksFromSummaries.entries()) {
          if (docId.toLowerCase().includes(summaryTaskName) || summaryTaskName.includes(docId.toLowerCase())) {
            foundInSummaries = true;
            break;
          }
        }
        if (!foundInSummaries) {
          removedServiceTasks.push({
            id: docId,
            name: docTask.name,
            source: `bankProjectTestSteps → ${docId}`,
          });
        }
      }
    });
    
    // Identifiera borttagna UserTasks
    documentedUserTasks.forEach((docTask, docId) => {
      const existsInBpmn = userTasksInBpmn.some(bpmnTask => bpmnTask.id === docId);
      if (!existsInBpmn) {
        let foundInSummaries = false;
        for (const [summaryTaskName] of documentedUserTasksFromSummaries.entries()) {
          if (docId.toLowerCase().includes(summaryTaskName) || summaryTaskName.includes(docId.toLowerCase())) {
            foundInSummaries = true;
            break;
          }
        }
        if (!foundInSummaries) {
          removedUserTasks.push({
            id: docId,
            name: docTask.name,
            source: `bankProjectTestSteps → ${docId}`,
          });
        }
      }
    });
    
    // Identifiera borttagna BusinessRuleTasks
    documentedBusinessRuleTasks.forEach((docTask, docId) => {
      const existsInBpmn = businessRuleTasksInBpmn.some(bpmnTask => bpmnTask.id === docId);
      if (!existsInBpmn) {
        let foundInSummaries = false;
        for (const [summaryTaskName] of documentedBusinessRuleTasksFromSummaries.entries()) {
          if (docId.toLowerCase().includes(summaryTaskName) || summaryTaskName.includes(docId.toLowerCase())) {
            foundInSummaries = true;
            break;
          }
        }
        if (!foundInSummaries) {
          removedBusinessRuleTasks.push({
            id: docId,
            name: docTask.name,
            source: `bankProjectTestSteps → ${docId}`,
          });
        }
      }
    });
    
    // Jämför BPMN ServiceTasks med dokumenterade
    serviceTasksInBpmn.forEach((bpmnTask) => {
      let documented = documentedServiceTasks.get(bpmnTask.id);
      
      // Försök matcha via namn i bankProjectTestSteps
      if (!documented) {
        for (const [docId, docTask] of documentedServiceTasks.entries()) {
          if (docTask.name.toLowerCase() === bpmnTask.name.toLowerCase()) {
            documented = docTask;
            break;
          }
        }
      }
      
      // Om inte hittat, försök matcha via summaries (task-namn eller ID)
      if (!documented) {
        const bpmnTaskNameLower = bpmnTask.name.toLowerCase();
        const bpmnTaskIdLower = bpmnTask.id.toLowerCase();
        
        // Kolla om task-namnet eller ID matchar något i summaries
        for (const [summaryTaskName, summaryTask] of documentedServiceTasksFromSummaries.entries()) {
          if (bpmnTaskNameLower.includes(summaryTaskName) || 
              summaryTaskName.includes(bpmnTaskNameLower) ||
              bpmnTaskIdLower.includes(summaryTaskName) ||
              summaryTaskName.includes(bpmnTaskIdLower)) {
            // Hittat i summary - räkna som dokumenterad (men utan apiCall eftersom det finns i CallActivity)
            documented = {
              id: bpmnTask.id,
              name: bpmnTask.name,
              apiCall: undefined, // API-anrop finns i CallActivity, inte här
            };
            break;
          }
        }
      }
      
      if (documented) {
        serviceTasksDocumented.push(documented);
      } else {
        missingServiceTasks.push(bpmnTask);
      }
    });
    
    // Jämför BPMN UserTasks med dokumenterade
    userTasksInBpmn.forEach((bpmnTask) => {
      let documented = documentedUserTasks.get(bpmnTask.id);
      
      // Försök matcha via namn i bankProjectTestSteps
      if (!documented) {
        for (const [docId, docTask] of documentedUserTasks.entries()) {
          if (docTask.name.toLowerCase() === bpmnTask.name.toLowerCase()) {
            documented = docTask;
            break;
          }
        }
      }
      
      // Om inte hittat, försök matcha via summaries (task-namn eller ID)
      if (!documented) {
        const bpmnTaskNameLower = bpmnTask.name.toLowerCase();
        const bpmnTaskIdLower = bpmnTask.id.toLowerCase();
        
        // Kolla om task-namnet eller ID matchar något i summaries
        for (const [summaryTaskName, summaryTask] of documentedUserTasksFromSummaries.entries()) {
          if (bpmnTaskNameLower.includes(summaryTaskName) || 
              summaryTaskName.includes(bpmnTaskNameLower) ||
              bpmnTaskIdLower.includes(summaryTaskName) ||
              summaryTaskName.includes(bpmnTaskIdLower)) {
            // Hittat i summary - räkna som dokumenterad (men utan uiInteraction eftersom det finns i CallActivity)
            documented = {
              id: bpmnTask.id,
              name: bpmnTask.name,
              uiInteraction: undefined, // UI-interaktion finns i CallActivity, inte här
            };
            break;
          }
        }
      }
      
      if (documented) {
        userTasksDocumented.push(documented);
      } else {
        missingUserTasks.push(bpmnTask);
      }
    });
    
    // Jämför BPMN BusinessRuleTasks med dokumenterade
    businessRuleTasksInBpmn.forEach((bpmnTask) => {
      let documented = documentedBusinessRuleTasks.get(bpmnTask.id);
      
      // Försök matcha via namn i bankProjectTestSteps
      if (!documented) {
        for (const [docId, docTask] of documentedBusinessRuleTasks.entries()) {
          if (docTask.name.toLowerCase() === bpmnTask.name.toLowerCase()) {
            documented = docTask;
            break;
          }
        }
      }
      
      // Om inte hittat, försök matcha via summaries (task-namn eller ID)
      if (!documented) {
        const bpmnTaskNameLower = bpmnTask.name.toLowerCase();
        const bpmnTaskIdLower = bpmnTask.id.toLowerCase();
        
        // Kolla om task-namnet eller ID matchar något i summaries
        for (const [summaryTaskName, summaryTask] of documentedBusinessRuleTasksFromSummaries.entries()) {
          // För BusinessRuleTasks kan summaries innehålla "DMN" eller task-namn
          const summaryLower = summaryTaskName.toLowerCase();
          if (bpmnTaskNameLower.includes(summaryLower) || 
              summaryLower.includes(bpmnTaskNameLower) ||
              bpmnTaskIdLower.includes(summaryLower) ||
              summaryLower.includes(bpmnTaskIdLower) ||
              (summaryLower.includes('dmn') && bpmnTaskNameLower.includes('dmn'))) {
            // Hittat i summary - räkna som dokumenterad (men utan dmnDecision eftersom det finns i CallActivity)
            documented = {
              id: bpmnTask.id,
              name: bpmnTask.name,
              dmnDecision: undefined, // DMN-beslut finns i CallActivity, inte här
            };
            break;
          }
        }
      }
      
      if (documented) {
        businessRuleTasksDocumented.push(documented);
      } else {
        missingBusinessRuleTasks.push(bpmnTask);
      }
    });
    
    results.push({
      bpmnFile,
      serviceTasksInBpmn,
      serviceTasksDocumented,
      missingServiceTasks,
      undocumentedServiceTasks,
      removedServiceTasks,
      userTasksInBpmn,
      userTasksDocumented,
      missingUserTasks,
      removedUserTasks,
      businessRuleTasksInBpmn,
      businessRuleTasksDocumented,
      missingBusinessRuleTasks,
      removedBusinessRuleTasks,
      callActivitiesInBpmn,
      callActivitiesDocumented,
      missingCallActivities,
      removedCallActivities,
    });
  }
  
  return results;
}

