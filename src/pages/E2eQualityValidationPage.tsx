import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { scenarios } from './E2eTestsOverviewPage';
import type { E2eScenario } from './E2eTestsOverviewPage';
import { useProcessTree } from '@/hooks/useProcessTree';
import type { ProcessTreeNode } from '@/lib/processTree';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
  suggestion?: string;
}

interface CompletenessMetrics {
  serviceTasks: { total: number; documented: number; percentage: number };
  userTasks: { total: number; documented: number; percentage: number };
  businessRuleTasks: { total: number; documented: number; percentage: number };
  subprocesses: { total: number; documented: number; percentage: number };
  apiMocks: { total: number; mocked: number; percentage: number };
}

interface MockQualityAnalysis {
  serviceTaskName: string;
  apiCall: string;
  hasMock: boolean;
  mockEndpoint?: string;
  responseQuality: 'good' | 'basic' | 'missing';
  issues: string[];
}

interface BpmnServiceTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

interface BpmnUserTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

interface BpmnBusinessRuleTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId?: string;
}

interface BpmnValidationResult {
  bpmnFile: string;
  serviceTasksInBpmn: BpmnServiceTask[];
  serviceTasksDocumented: Array<{ id: string; name: string; apiCall?: string }>;
  missingServiceTasks: BpmnServiceTask[];
  undocumentedServiceTasks: BpmnServiceTask[];
  userTasksInBpmn: BpmnUserTask[];
  userTasksDocumented: Array<{ id: string; name: string; uiInteraction?: string }>;
  missingUserTasks: BpmnUserTask[];
  businessRuleTasksInBpmn: BpmnBusinessRuleTask[];
  businessRuleTasksDocumented: Array<{ id: string; name: string; dmnDecision?: string }>;
  missingBusinessRuleTasks: BpmnBusinessRuleTask[];
}

interface BackendStateField {
  entity: string; // t.ex. "Application"
  field: string; // t.ex. "status"
  value: string; // t.ex. "COMPLETE"
  fullPath: string; // t.ex. "Application.status"
}

interface MockResponseAnalysis {
  apiCall: string;
  backendStateFields: BackendStateField[];
  mockResponseFields: string[];
  missingFields: BackendStateField[];
  suggestions: string[];
}

interface ValidationResult {
  scenarioId: string;
  scenarioName: string;
  issues: ValidationIssue[];
  completeness: CompletenessMetrics;
  overallScore: number;
  mockQuality?: MockQualityAnalysis[];
  bpmnValidation?: BpmnValidationResult[];
  mockResponseAnalysis?: MockResponseAnalysis[];
}

// Extrahera API-endpoints från mock-fil
async function extractMockedEndpoints(): Promise<Set<string>> {
  const mockedEndpoints = new Set<string>();
  
  try {
    // Försök läsa mock-filen via fetch
    // Först försök med direkt path
    let response = await fetch('/tests/playwright-e2e/fixtures/mortgageE2eMocks.ts');
    
    // Om det inte fungerar, försök med API-endpoint (om vi skapar en)
    if (!response.ok) {
      // Alternativ: skapa en API-endpoint som läser filen
      // För nu, vi använder en hardcoded lista baserat på vad vi vet finns
      console.warn('Kunde inte läsa mock-fil via fetch, använder kända endpoints');
      
      // Lägg till kända endpoints från mock-filen (fallback)
      const knownEndpoints = [
        'api/party/information',
        'api/party/engagements',
        'api/stakeholder/personal-information',
        'api/valuation/property',
        'api/application/kalp',
        'api/application/fetch-credit-information',
        'api/object/brf-information',
        'api/mortgage-commitment/decision',
        'api/valuation/bostadsratt',
        'api/pricing/price',
        'api/stacc/affordability',
        'api/credit/personal-information',
        'api/risk/classification',
        'api/credit-evaluation',
        'api/kyc',
        'api/kyc/aml-risk-score',
        'api/kyc/sanctions-pep-screening',
        'api/dmn/evaluate-kyc-aml',
        'api/credit-decision',
        'api/offer',
        'api/offer/accept',
        'api/document-generation/prepare-loan',
        'api/document-generation/generate-documents',
        'api/signing/upload-document',
        'api/signing/create-sign-order',
        'api/signing/digital-signature',
        'api/signing/store-signed-document',
        'api/disbursement/handle',
        'api/disbursement/archive-documents',
      ];
      
      knownEndpoints.forEach((endpoint) => mockedEndpoints.add(endpoint));
      return mockedEndpoints;
    }
    
    const content = await response.text();
    
    // Extrahera alla route-patterns med regex
    // Pattern: await page.route('**/api/...', ...)
    const routeRegex = /page\.route\(['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      let endpoint = match[1];
      
      // Ta bort `**/` prefix
      endpoint = endpoint.replace(/^\*\*\//, '');
      
      // Hantera template literals (t.ex. `**/api/valuation/bostadsratt/${objectId}`)
      // Ersätt variabler med wildcards
      endpoint = endpoint.replace(/\$\{[^}]+\}/g, '*');
      
      // Normalisera endpoint (ta bort leading slash om det finns)
      endpoint = endpoint.replace(/^\/+/, '');
      
      // Lägg till både med och utan wildcard för flexibilitet
      mockedEndpoints.add(endpoint);
      
      // Lägg också till version utan wildcards i slutet
      const withoutWildcard = endpoint.replace(/\/\*$/, '');
      if (withoutWildcard !== endpoint) {
        mockedEndpoints.add(withoutWildcard);
      }
      
      // Lägg också till version utan path parameters
      const withoutParams = endpoint.split('/').slice(0, -1).join('/');
      if (withoutParams && withoutParams !== endpoint) {
        mockedEndpoints.add(withoutParams);
      }
    }
  } catch (error) {
    console.warn('Kunde inte läsa mock-fil:', error);
  }
  
  return mockedEndpoints;
}

// Extrahera alla noder av en specifik typ från process tree
function extractNodesFromTree(
  tree: ProcessTreeNode | null,
  targetType: 'serviceTask' | 'userTask' | 'businessRuleTask',
  targetBpmnFile?: string
): Array<{ id: string; name: string; bpmnFile: string; bpmnElementId?: string }> {
  const nodes: Array<{ id: string; name: string; bpmnFile: string; bpmnElementId?: string }> = [];
  
  if (!tree) return nodes;
  
  const traverse = (node: ProcessTreeNode) => {
    // Om vi filtrerar på BPMN-fil, kolla att den matchar
    if (!targetBpmnFile || node.bpmnFile === targetBpmnFile) {
      if (node.type === targetType) {
        nodes.push({
          id: node.bpmnElementId || node.id,
          name: node.label,
          bpmnFile: node.bpmnFile,
          bpmnElementId: node.bpmnElementId,
        });
      }
    }
    
    // Rekursivt gå igenom barn
    node.children.forEach(traverse);
  };
  
  traverse(tree);
  return nodes;
}

// Extrahera task-namn från summary-strängar (t.ex. "fetch-party-information (internal-data-gathering)" → "fetch-party-information")
function extractTaskNamesFromSummary(summary?: string): Set<string> {
  const taskNames = new Set<string>();
  
  if (!summary || summary.trim().length === 0) {
    return taskNames;
  }
  
  // Dela upp på punkt + mellanslag för att få individuella tasks
  const parts = summary.split('. ').map((p) => p.trim()).filter((p) => p.length > 0);
  
  parts.forEach((part) => {
    // Ta bort punkt i slutet om den finns
    const cleanPart = part.replace(/\.$/, '');
    
    // Extrahera task-namnet (före första parentes eller mellanslag + parentes)
    // Exempel: "fetch-party-information (internal-data-gathering)" → "fetch-party-information"
    // Exempel: "register-household-economy-information (Household – kunden fyller i hushållsekonomi)" → "register-household-economy-information"
    const match = cleanPart.match(/^([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*)\s*\(/);
    if (match) {
      const taskName = match[1].trim();
      taskNames.add(taskName.toLowerCase());
    } else {
      // Om ingen parentes finns, använd hela strängen (t.ex. "KALP")
      const taskName = cleanPart.split(/\s+/)[0].trim();
      if (taskName.length > 0) {
        taskNames.add(taskName.toLowerCase());
      }
    }
  });
  
  return taskNames;
}

// Validera BPMN → Scenarios mapping med process tree
function validateBpmnMapping(
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
      userTasksInBpmn,
      userTasksDocumented,
      missingUserTasks,
      businessRuleTasksInBpmn,
      businessRuleTasksDocumented,
      missingBusinessRuleTasks,
    });
  }
  
  return results;
}

// Parsa backend state-strängar (t.ex. "Application.status = \"COMPLETE\", Application.readyForEvaluation = true")
function parseBackendState(backendState: string): BackendStateField[] {
  const fields: BackendStateField[] = [];
  
  if (!backendState || backendState.trim().length === 0) {
    return fields;
  }
  
  // Dela upp på komma (men respektera komma inom strängar)
  const parts = backendState.split(',').map((p) => p.trim());
  
  parts.forEach((part) => {
    // Matcha mönster som "Entity.field = value" eller "Entity.field = \"value\""
    const match = part.match(/^([A-Za-z][A-Za-z0-9]*)\.([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)\s*=\s*(.+)$/);
    if (match) {
      const [, entity, fieldPath, value] = match;
      // Ta bort citattecken från värdet
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      fields.push({
        entity,
        field: fieldPath,
        value: cleanValue,
        fullPath: `${entity}.${fieldPath}`,
      });
    }
  });
  
  return fields;
}

// Extrahera fält från mock-response (JSON-objekt)
function extractMockResponseFields(mockResponse: any, prefix = ''): string[] {
  const fields: string[] = [];
  
  if (mockResponse === null || mockResponse === undefined) {
    return fields;
  }
  
  if (typeof mockResponse === 'object' && !Array.isArray(mockResponse)) {
    Object.keys(mockResponse).forEach((key) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = mockResponse[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Rekursivt för nested objects
        fields.push(...extractMockResponseFields(value, fullKey));
      } else {
        fields.push(fullKey);
      }
    });
  } else if (Array.isArray(mockResponse)) {
    // För arrays, kolla första elementet om det finns
    if (mockResponse.length > 0 && typeof mockResponse[0] === 'object') {
      fields.push(...extractMockResponseFields(mockResponse[0], prefix));
    }
  }
  
  return fields;
}

// Hämta nested värde från objekt med dot-notation path
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

// Analysera mock-responser mot backend states
async function analyzeMockResponses(scenario: E2eScenario): Promise<MockResponseAnalysis[]> {
  const analyses: MockResponseAnalysis[] = [];
  
  // Försök läsa mock-filen
  let mockFileContent = '';
  try {
    const response = await fetch('/tests/playwright-e2e/fixtures/mortgageE2eMocks.ts');
    if (response.ok) {
      mockFileContent = await response.text();
    }
  } catch (error) {
    console.warn('Kunde inte läsa mock-fil:', error);
    return analyses;
  }
  
  // Extrahera mock-responser från filen (enkel regex-baserad parsing)
  const mockResponses = new Map<string, any>();
  
  // Matcha page.route() patterns och deras JSON-responser
  // Förbättrad regex som hanterar multiline och nested structures
  // Matchar: page.route('**/api/...', async (route) => { ... body: JSON.stringify({...}) ... })
  const routeRegex = /page\.route\(['"]([^'"]+)['"][\s\S]*?body:\s*JSON\.stringify\(/g;
  let match;
  
  while ((match = routeRegex.exec(mockFileContent)) !== null) {
    const endpoint = match[1];
    const startPos = match.index + match[0].length;
    
    // Hitta balanserade parenteser för JSON.stringify({...})
    let depth = 1;
    let pos = startPos;
    let jsonString = '';
    
    while (pos < mockFileContent.length && depth > 0) {
      const char = mockFileContent[pos];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      }
      if (depth > 0) {
        jsonString += char;
      }
      pos++;
    }
    
    // Ta bort trailing komma och whitespace
    jsonString = jsonString.trim().replace(/,\s*$/, '');
    
    try {
      // Försök parsa JSON
      const json = JSON.parse(jsonString);
      mockResponses.set(endpoint, json);
    } catch (e) {
      // Om parsing misslyckas, försök hitta JSON-objektet manuellt
      // Detta hanterar fall där JSON kan vara på flera rader eller innehålla kommentarer
      const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          const json = JSON.parse(jsonObjectMatch[0]);
          mockResponses.set(endpoint, json);
        } catch (e2) {
          // Ignorera om det fortfarande inte går att parsa
          console.warn(`Kunde inte parsa JSON för ${endpoint}:`, e2);
        }
      } else {
        console.warn(`Kunde inte hitta JSON-objekt för ${endpoint}`);
      }
    }
  }
  
  // Analysera varje teststeg med backend state och API-anrop
  scenario.bankProjectTestSteps.forEach((step) => {
    if (!step.backendState || !step.apiCall) {
      return;
    }
    
    const backendStateFields = parseBackendState(step.backendState);
    if (backendStateFields.length === 0) {
      return;
    }
    
    // Extrahera API-endpoints från apiCall
    const apiEndpoints = step.apiCall
      .split(',')
      .map((call) => {
        const match = call.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\/api\/[^\s(]+)/);
        return match ? match[1] : null;
      })
      .filter((endpoint): endpoint is string => endpoint !== null);
    
    // För varje API-endpoint, hitta motsvarande mock
    apiEndpoints.forEach((endpoint) => {
      // Hitta mock som matchar endpoint (kan vara wildcard eller exakt match)
      let mockResponse: any = null;
      
      for (const [mockEndpoint, response] of mockResponses.entries()) {
        if (mockEndpoint.includes(endpoint) || endpoint.includes(mockEndpoint.replace('**', ''))) {
          mockResponse = response;
          break;
        }
      }
      
      if (!mockResponse) {
        // Ingen mock hittad - skippa denna analys
        return;
      }
      
      const mockResponseFields = extractMockResponseFields(mockResponse);
      const missingFields: BackendStateField[] = [];
      const suggestions: string[] = [];
      
      // Jämför backend state fields med mock response fields
      backendStateFields.forEach((bsField) => {
        // Kontrollera om fältet finns i mock-response
        let fieldExists = mockResponseFields.some((mockField) => {
          // Matcha exakt eller med entity-prefix
          return (
            mockField === bsField.field ||
            mockField === bsField.fullPath ||
            mockField.endsWith(`.${bsField.field}`) ||
            mockField === `${bsField.entity.toLowerCase()}.${bsField.field}`
          );
        });
        
        // Specialhantering för .length-fält: om fältet är "arrayName.length", kolla om arrayen finns och har element
        if (!fieldExists && bsField.field.endsWith('.length')) {
          const arrayName = bsField.field.replace('.length', '');
          // Kolla om arrayen finns i mock-response
          const matchingMockField = mockResponseFields.find((mockField) => {
            return (
              mockField === arrayName ||
              mockField.endsWith(`.${arrayName}`) ||
              mockField === `${bsField.entity.toLowerCase()}.${arrayName}`
            );
          });
          
          // Om arrayen finns, kolla om den har element (för att uppfylla length >= 1 eller length = 1)
          if (matchingMockField) {
            // Hitta arrayen i mock-response med korrekt path
            const arrayValue = getNestedValue(mockResponse, matchingMockField);
            if (Array.isArray(arrayValue) && arrayValue.length > 0) {
              // Arrayen finns och har element, så .length är uppfylld
              fieldExists = true;
            }
          }
        }
        
        if (!fieldExists) {
          missingFields.push(bsField);
          suggestions.push(
            `Lägg till "${bsField.field}": ${bsField.value === 'true' || bsField.value === 'false' ? bsField.value : `"${bsField.value}"`} i mock-response för ${endpoint}`
          );
        }
      });
      
      if (missingFields.length > 0 || backendStateFields.length > 0) {
        analyses.push({
          apiCall: endpoint,
          backendStateFields,
          mockResponseFields,
          missingFields,
          suggestions,
        });
      }
    });
  });
  
  return analyses;
}

// Normalisera API-anrop för jämförelse
function normalizeApiCall(apiCall: string): string {
  // Extrahera endpoint från API-anrop (t.ex. "GET /api/party/information")
  const match = apiCall.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\/api\/[^\s]+)/);
  if (!match) {
    return apiCall;
  }
  
  let endpoint = match[1];
  
  // Ta bort leading slash
  endpoint = endpoint.replace(/^\/+/, '');
  
  // Ta bort query parameters
  endpoint = endpoint.split('?')[0];
  
  // Ta bort path parameters (t.ex. /api/kyc/{customerId} -> /api/kyc/*)
  endpoint = endpoint.replace(/\{[^}]+\}/g, '*');
  
  return endpoint;
}

// Kontrollera om API har mock
async function hasApiMock(
  apiCall: string | undefined,
  mockedEndpoints: Set<string>
): Promise<boolean> {
  if (!apiCall) return false;
  
  const normalized = normalizeApiCall(apiCall);
  
  // Direkt match
  if (mockedEndpoints.has(normalized)) {
    return true;
  }
  
  // Kontrollera om någon mock matchar med wildcard
  for (const mocked of mockedEndpoints) {
    // Om mock har wildcard i slutet, kontrollera om endpoint börjar med samma prefix
    if (mocked.endsWith('/*') || mocked.endsWith('*')) {
      const prefix = mocked.replace(/\/?\*+$/, '');
      if (normalized.startsWith(prefix + '/') || normalized === prefix) {
        return true;
      }
    }
    
    // Om endpoint har wildcard, kontrollera om mock matchar prefix
    if (normalized.includes('*')) {
      const normalizedPrefix = normalized.replace(/\/?\*+.*$/, '');
      if (mocked.startsWith(normalizedPrefix)) {
        return true;
      }
    }
    
    // Kontrollera om endpoint matchar mock med path parameters
    // t.ex. "api/kyc/{customerId}" ska matcha "api/kyc/*" eller "api/kyc"
    const normalizedWithoutParams = normalized.split('/').slice(0, -1).join('/');
    if (normalizedWithoutParams && mocked.startsWith(normalizedWithoutParams)) {
      return true;
    }
    
    // Kontrollera om mock matchar endpoint med path parameters
    const mockedWithoutParams = mocked.split('/').slice(0, -1).join('/');
    if (mockedWithoutParams && normalized.startsWith(mockedWithoutParams)) {
      return true;
    }
  }
  
  return false;
}

// Analysera mock-kvalitet för en ServiceTask
function analyzeMockQuality(
  serviceTaskName: string,
  apiCall: string | undefined,
  mockedEndpoints: Set<string>
): MockQualityAnalysis {
  const issues: string[] = [];
  let hasMock = false;
  let mockEndpoint: string | undefined;
  let responseQuality: 'good' | 'basic' | 'missing' = 'missing';

  if (!apiCall) {
    issues.push('Inget API-anrop dokumenterat');
    return {
      serviceTaskName,
      apiCall: 'SAKNAS',
      hasMock: false,
      responseQuality: 'missing',
      issues,
    };
  }

  // Normalisera API-anrop
  const normalized = normalizeApiCall(apiCall);

  // Kontrollera om mock finns
  for (const endpoint of mockedEndpoints) {
    if (endpoint === normalized || 
        normalized.startsWith(endpoint.split('/').slice(0, -1).join('/')) ||
        endpoint.startsWith(normalized.split('/').slice(0, -1).join('/'))) {
      hasMock = true;
      mockEndpoint = endpoint;
      break;
    }
  }

  if (!hasMock) {
    issues.push('Saknar mock');
    responseQuality = 'missing';
  } else {
    // Analysera response-kvalitet (förenklad - vi kan inte läsa faktiska responses i browser)
    // För nu, vi antar att om mock finns är kvaliteten "basic"
    // I en riktig implementation skulle vi läsa mock-filen och analysera response-strukturen
    responseQuality = 'basic';
    
    // Kontrollera om API-anrop har flera endpoints (t.ex. "GET /api/party/information, GET /api/party/engagements")
    const apiCalls = apiCall.split(',').map(a => a.trim());
    if (apiCalls.length > 1) {
      // Kontrollera om alla endpoints har mocks
      const missingEndpoints = apiCalls.filter(ac => {
        const norm = normalizeApiCall(ac);
        return !Array.from(mockedEndpoints).some(e => 
          e === norm || norm.startsWith(e.split('/').slice(0, -1).join('/'))
        );
      });
      
      if (missingEndpoints.length > 0) {
        issues.push(`${missingEndpoints.length} av ${apiCalls.length} endpoints saknar mock`);
      }
    }
  }

  return {
    serviceTaskName,
    apiCall,
    hasMock,
    mockEndpoint,
    responseQuality,
    issues,
  };
}

// Validera ett scenario
async function validateScenario(
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
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Given`,
        location: `subprocessSteps[${index}].given`,
        suggestion: 'Lägg till Given-beskrivning baserat på Feature Goal',
      });
    }

    if (!step.when || step.when.trim().length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar When`,
        location: `subprocessSteps[${index}].when`,
        suggestion: 'Lägg till When-beskrivning baserat på Feature Goal',
      });
    }

    if (!step.then || step.then.trim().length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Then`,
        location: `subprocessSteps[${index}].then`,
        suggestion: 'Lägg till Then-beskrivning baserat på Feature Goal',
      });
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
          issues.push({
            severity: 'warning',
            category: 'API Mock',
            message: `API-anrop "${step.apiCall}" saknar mock`,
            location: `bankProjectTestSteps[${index}].apiCall`,
            suggestion: `Lägg till mock för ${step.apiCall} i mortgageE2eMocks.ts`,
          });
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
  const calculatePercentage = (total: number, documented: number) => {
    return total > 0 ? Math.round((documented / total) * 100) : 100;
  };

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
  
  // Lägg till issues för saknade ServiceTasks
  bpmnValidation.forEach((bpmnResult) => {
    if (bpmnResult.missingServiceTasks.length > 0) {
      bpmnResult.missingServiceTasks.forEach((missingTask) => {
        issues.push({
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `ServiceTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till ServiceTask "${missingTask.name}" i bankProjectTestSteps med korrekt API-anrop`,
        });
      });
    }
    
    // Lägg till issues för saknade UserTasks
    if (bpmnResult.missingUserTasks.length > 0) {
      bpmnResult.missingUserTasks.forEach((missingTask) => {
        issues.push({
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `UserTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till UserTask "${missingTask.name}" i bankProjectTestSteps med korrekt UI-interaktion`,
        });
      });
    }
    
    // Lägg till issues för saknade BusinessRuleTasks
    if (bpmnResult.missingBusinessRuleTasks.length > 0) {
      bpmnResult.missingBusinessRuleTasks.forEach((missingTask) => {
        issues.push({
          severity: 'warning',
          category: 'BPMN → Scenarios Mapping',
          message: `BusinessRuleTask "${missingTask.name}" (${missingTask.id}) finns i BPMN-fil ${bpmnResult.bpmnFile} men saknas i dokumentation`,
          location: `bankProjectTestSteps (saknas)`,
          suggestion: `Lägg till BusinessRuleTask "${missingTask.name}" i bankProjectTestSteps med korrekt DMN-beslut`,
        });
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
        issues.push({
          severity: 'error',
          category: 'UserTask Documentation',
          message: `UserTask "${docTask.name}" (${docTask.id}) är dokumenterad men saknar UI-interaktion`,
          location: `bankProjectTestSteps → ${docTask.id}.uiInteraction`,
          suggestion: 'Lägg till UI-interaktion baserat på Feature Goal',
        });
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
        issues.push({
          severity: 'error',
          category: 'BusinessRuleTask Documentation',
          message: `BusinessRuleTask "${docTask.name}" (${docTask.id}) är dokumenterad men saknar DMN-beslut`,
          location: `bankProjectTestSteps → ${docTask.id}.dmnDecision`,
          suggestion: 'Lägg till DMN-beslut baserat på BPMN-nodens syfte',
        });
      }
    });
  });

  // 6. Analysera mock-responser mot backend states
  const mockResponseAnalysis = await analyzeMockResponses(scenario);
  
  // Lägg till issues för saknade fält i mock-responser
  mockResponseAnalysis.forEach((analysis) => {
    if (analysis.missingFields.length > 0) {
      analysis.missingFields.forEach((field) => {
        issues.push({
          severity: 'info',
          category: 'Mock Response Quality',
          message: `Mock-response för ${analysis.apiCall} saknar fält "${field.fullPath}" (förväntat värde: ${field.value})`,
          location: `mortgageE2eMocks.ts → ${analysis.apiCall}`,
          suggestion: analysis.suggestions.find((s) => s.includes(field.field)) || `Lägg till ${field.field} i mock-response`,
        });
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

export default function E2eQualityValidationPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mockedEndpoints, setMockedEndpoints] = useState<Set<string>>(new Set());
  
  // Använd befintlig process tree istället för att läsa BPMN-filer igen
  const { data: processTree } = useProcessTree('mortgage.bpmn');

  // Ladda mocked endpoints och validera scenarios
  useEffect(() => {
    async function loadAndValidate() {
      setIsLoading(true);
      
      // Ladda mocked endpoints
      const endpoints = await extractMockedEndpoints();
      setMockedEndpoints(endpoints);
      
      // Validera alla scenarios med process tree
      const results = await Promise.all(
        scenarios.map((scenario) => validateScenario(scenario, endpoints, processTree || null))
      );
      
      setValidationResults(results);
      setIsLoading(false);
    }
    
    // Vänta på att process tree är laddad
    if (processTree !== undefined) {
      loadAndValidate();
    }
  }, [processTree]);

  // Beräkna sammanfattning
  const summary = useMemo(() => {
    if (validationResults.length === 0) {
      return {
        avgScore: 0,
        totalIssues: 0,
        totalErrors: 0,
        totalWarnings: 0,
        scenarioCount: 0,
        mockQuality: {
          totalServiceTasks: 0,
          withMocks: 0,
          missingMocks: 0,
          goodQuality: 0,
          basicQuality: 0,
        },
        bpmnValidation: {
          totalBpmnServiceTasks: 0,
          totalDocumentedServiceTasks: 0,
          totalMissingServiceTasks: 0,
          totalBpmnUserTasks: 0,
          totalDocumentedUserTasks: 0,
          totalMissingUserTasks: 0,
          totalBpmnBusinessRuleTasks: 0,
          totalDocumentedBusinessRuleTasks: 0,
          totalMissingBusinessRuleTasks: 0,
          coveragePercentage: 100,
          userTaskCoveragePercentage: 100,
          businessRuleTaskCoveragePercentage: 100,
        },
      };
    }
    
    const avgScore = Math.round(
      validationResults.reduce((sum, r) => sum + r.overallScore, 0) / validationResults.length
    );
    const totalIssues = validationResults.reduce((sum, r) => sum + r.issues.length, 0);
    const totalErrors = validationResults.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === 'error').length,
      0
    );
    const totalWarnings = validationResults.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === 'warning').length,
      0
    );

    // Analysera mock-kvalitet
    const allMockQuality = validationResults
      .flatMap((r) => r.mockQuality || [])
      .filter((m) => m !== undefined);
    
    const mockQuality = {
      totalServiceTasks: allMockQuality.length,
      withMocks: allMockQuality.filter((m) => m.hasMock).length,
      missingMocks: allMockQuality.filter((m) => !m.hasMock).length,
      goodQuality: allMockQuality.filter((m) => m.responseQuality === 'good').length,
      basicQuality: allMockQuality.filter((m) => m.responseQuality === 'basic').length,
    };

    // Analysera BPMN-validering
    const allBpmnValidation = validationResults.flatMap((r) => r.bpmnValidation || []);
    const totalBpmnServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.serviceTasksInBpmn.length,
      0
    );
    const totalDocumentedServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.serviceTasksDocumented.length,
      0
    );
    const totalMissingServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingServiceTasks.length,
      0
    );
    
    const totalBpmnUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.userTasksInBpmn.length,
      0
    );
    const totalDocumentedUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.userTasksDocumented.length,
      0
    );
    const totalMissingUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingUserTasks.length,
      0
    );
    
    const totalBpmnBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.businessRuleTasksInBpmn.length,
      0
    );
    const totalDocumentedBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.businessRuleTasksDocumented.length,
      0
    );
    const totalMissingBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingBusinessRuleTasks.length,
      0
    );

    return {
      avgScore,
      totalIssues,
      totalErrors,
      totalWarnings,
      scenarioCount: validationResults.length,
      mockQuality,
      bpmnValidation: {
        totalBpmnServiceTasks,
        totalDocumentedServiceTasks,
        totalMissingServiceTasks,
        totalBpmnUserTasks,
        totalDocumentedUserTasks,
        totalMissingUserTasks,
        totalBpmnBusinessRuleTasks,
        totalDocumentedBusinessRuleTasks,
        totalMissingBusinessRuleTasks,
        coveragePercentage:
          totalBpmnServiceTasks > 0
            ? Math.round((totalDocumentedServiceTasks / totalBpmnServiceTasks) * 100)
            : 100,
        userTaskCoveragePercentage:
          totalBpmnUserTasks > 0
            ? Math.round((totalDocumentedUserTasks / totalBpmnUserTasks) * 100)
            : 100,
        businessRuleTaskCoveragePercentage:
          totalBpmnBusinessRuleTasks > 0
            ? Math.round((totalDocumentedBusinessRuleTasks / totalBpmnBusinessRuleTasks) * 100)
            : 100,
      },
    };
  }, [validationResults]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'e2e-tests') navigate('/e2e-tests');
    else if (view === 'test-coverage') navigate('/test-coverage');
    else if (view === 'e2e-quality-validation') navigate('/e2e-quality-validation');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/e2e-quality-validation');
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? null}
        currentView="e2e-quality-validation"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />
      <main className="ml-16 flex-1 flex flex-col gap-4 overflow-x-auto">
        <div className="w-full space-y-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle>E2E Quality Validation</CardTitle>
              <CardDescription>
                Validerar kvaliteten på E2E-testscenarion och identifierar förbättringsområden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Laddar och validerar...</div>
                </div>
              ) : (
                <>
              {/* Sammanfattning */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Sammanfattning</h3>
                  <Badge variant="outline" className="text-xs">
                    {mockedEndpoints.size} mocked endpoints hittade
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold">{summary.avgScore}%</div>
                    <div className="text-sm text-muted-foreground">Genomsnittlig Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.scenarioCount}</div>
                    <div className="text-sm text-muted-foreground">Scenarion</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-destructive">{summary.totalErrors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{summary.totalWarnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                </div>
                
                {/* BPMN-validering sammanfattning */}
                {summary.bpmnValidation && 
                 (summary.bpmnValidation.totalBpmnServiceTasks > 0 || 
                  summary.bpmnValidation.totalBpmnUserTasks > 0 || 
                  summary.bpmnValidation.totalBpmnBusinessRuleTasks > 0) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">BPMN → Scenarios Mapping</h4>
                    
                    {/* ServiceTasks */}
                    {summary.bpmnValidation.totalBpmnServiceTasks > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">ServiceTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnServiceTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedServiceTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.coveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingServiceTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.coveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.coveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.coveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* UserTasks */}
                    {summary.bpmnValidation.totalBpmnUserTasks > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">UserTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnUserTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedUserTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.userTaskCoveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingUserTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.userTaskCoveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.userTaskCoveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.userTaskCoveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* BusinessRuleTasks */}
                    {summary.bpmnValidation.totalBpmnBusinessRuleTasks > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">BusinessRuleTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnBusinessRuleTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedBusinessRuleTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.businessRuleTaskCoveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingBusinessRuleTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.businessRuleTaskCoveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.businessRuleTaskCoveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.businessRuleTaskCoveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mock-kvalitet sammanfattning */}
                {summary.mockQuality && summary.mockQuality.totalServiceTasks > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Mock-kvalitet</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="font-medium">ServiceTasks</div>
                        <div className="text-muted-foreground">
                          {summary.mockQuality.totalServiceTasks} totalt
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">
                          {summary.mockQuality.withMocks} med mocks
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {summary.mockQuality.totalServiceTasks > 0
                            ? Math.round(
                                (summary.mockQuality.withMocks / summary.mockQuality.totalServiceTasks) * 100
                              )
                            : 0}
                          % täckning
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600">
                          {summary.mockQuality.missingMocks} saknar mocks
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-600">
                          {summary.mockQuality.basicQuality} basic kvalitet
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">
                          {summary.mockQuality.goodQuality} bra kvalitet
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Valideringsresultat per scenario */}
              <div className="space-y-4">
                {validationResults.map((result) => {
                  const scoreColor =
                    result.overallScore >= 90
                      ? 'text-green-600'
                      : result.overallScore >= 70
                        ? 'text-yellow-600'
                        : 'text-red-600';

                  return (
                    <Card key={result.scenarioId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{result.scenarioId}</CardTitle>
                            <CardDescription>{result.scenarioName}</CardDescription>
                          </div>
                          <Badge variant={result.overallScore >= 90 ? 'default' : 'destructive'}>
                            <span className={scoreColor}>{result.overallScore}%</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Kompletthet */}
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Kompletthet</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="font-medium">ServiceTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.serviceTasks.documented}/
                                {result.completeness.serviceTasks.total} (
                                {result.completeness.serviceTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">UserTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.userTasks.documented}/
                                {result.completeness.userTasks.total} (
                                {result.completeness.userTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">BusinessRuleTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.businessRuleTasks.documented}/
                                {result.completeness.businessRuleTasks.total} (
                                {result.completeness.businessRuleTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Subprocesses</div>
                              <div className="text-muted-foreground">
                                {result.completeness.subprocesses.documented}/
                                {result.completeness.subprocesses.total} (
                                {result.completeness.subprocesses.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">API Mocks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.apiMocks.mocked}/
                                {result.completeness.apiMocks.total} (
                                {result.completeness.apiMocks.percentage}%)
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BPMN Validation */}
                        {result.bpmnValidation && result.bpmnValidation.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">BPMN → Scenarios Mapping</h4>
                            {result.bpmnValidation.map((bpmnResult, idx) => {
                              const hasMissingServiceTasks = bpmnResult.missingServiceTasks.length > 0;
                              const hasMissingUserTasks = bpmnResult.missingUserTasks.length > 0;
                              const hasMissingBusinessRuleTasks = bpmnResult.missingBusinessRuleTasks.length > 0;
                              const hasAnyMissing = hasMissingServiceTasks || hasMissingUserTasks || hasMissingBusinessRuleTasks;
                              
                              return (
                                <div key={idx} className="mb-3 border rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{bpmnResult.bpmnFile}</span>
                                    <div className="flex gap-2">
                                      {bpmnResult.serviceTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingServiceTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.serviceTasksInBpmn.length} ServiceTasks
                                        </Badge>
                                      )}
                                      {bpmnResult.userTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingUserTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.userTasksInBpmn.length} UserTasks
                                        </Badge>
                                      )}
                                      {bpmnResult.businessRuleTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingBusinessRuleTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.businessRuleTasksInBpmn.length} BusinessRuleTasks
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* ServiceTasks */}
                                  {bpmnResult.serviceTasksInBpmn.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        ServiceTasks: {bpmnResult.serviceTasksDocumented.length} / {bpmnResult.serviceTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingServiceTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade ServiceTasks ({bpmnResult.missingServiceTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingServiceTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* UserTasks */}
                                  {bpmnResult.userTasksInBpmn.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        UserTasks: {bpmnResult.userTasksDocumented.length} / {bpmnResult.userTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingUserTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade UserTasks ({bpmnResult.missingUserTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingUserTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* BusinessRuleTasks */}
                                  {bpmnResult.businessRuleTasksInBpmn.length > 0 && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        BusinessRuleTasks: {bpmnResult.businessRuleTasksDocumented.length} / {bpmnResult.businessRuleTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingBusinessRuleTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade BusinessRuleTasks ({bpmnResult.missingBusinessRuleTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingBusinessRuleTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Mock Response Analysis */}
                        {result.mockResponseAnalysis && result.mockResponseAnalysis.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Mock-responser vs Backend States</h4>
                            {result.mockResponseAnalysis.map((analysis, idx) => {
                              if (analysis.missingFields.length === 0) {
                                return null; // Visa bara om det finns saknade fält
                              }
                              return (
                                <div key={idx} className="mb-3 border rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{analysis.apiCall}</span>
                                    <Badge variant="secondary">
                                      {analysis.missingFields.length} saknade fält
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    Backend state fält: {analysis.backendStateFields.length} | 
                                    Mock response fält: {analysis.mockResponseFields.length}
                                  </div>
                                  {analysis.missingFields.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-orange-600 mb-1">
                                        Saknade fält i mock-response:
                                      </div>
                                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                        {analysis.missingFields.map((field, fieldIdx) => (
                                          <li key={fieldIdx}>
                                            <code className="text-xs">{field.fullPath}</code> = {field.value}
                                          </li>
                                        ))}
                                      </ul>
                                      {analysis.suggestions.length > 0 && (
                                        <div className="mt-2 text-xs">
                                          <div className="font-medium mb-1">Förslag:</div>
                                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            {analysis.suggestions.slice(0, 3).map((suggestion, sugIdx) => (
                                              <li key={sugIdx}>{suggestion}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Mock Quality Analysis */}
                        {result.mockQuality && result.mockQuality.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Mock-kvalitet per ServiceTask</h4>
                            <div className="space-y-2">
                              {result.mockQuality.map((mock, idx) => {
                                const qualityColor =
                                  mock.responseQuality === 'good'
                                    ? 'text-green-600'
                                    : mock.responseQuality === 'basic'
                                      ? 'text-yellow-600'
                                      : 'text-red-600';
                                const qualityIcon =
                                  mock.responseQuality === 'good'
                                    ? '✅'
                                    : mock.responseQuality === 'basic'
                                      ? '⚠️'
                                      : '❌';

                                return (
                                  <div key={idx} className="text-sm border rounded p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{mock.serviceTaskName}</span>
                                      <Badge variant={mock.hasMock ? 'default' : 'destructive'} className="text-xs">
                                        {qualityIcon} {mock.responseQuality}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {mock.apiCall}
                                    </div>
                                    {mock.mockEndpoint && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Mock: {mock.mockEndpoint}
                                      </div>
                                    )}
                                    {mock.issues.length > 0 && (
                                      <div className="text-xs text-destructive mt-1">
                                        {mock.issues.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Issues */}
                        {result.issues.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">
                              Issues ({result.issues.length})
                            </h4>
                            <div className="space-y-2">
                              {result.issues.map((issue, idx) => {
                                const icon =
                                  issue.severity === 'error'
                                    ? '❌'
                                    : issue.severity === 'warning'
                                      ? '⚠️'
                                      : 'ℹ️';
                                const color =
                                  issue.severity === 'error'
                                    ? 'text-destructive'
                                    : issue.severity === 'warning'
                                      ? 'text-yellow-600'
                                      : 'text-blue-600';

                                return (
                                  <Alert key={idx} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
                                    <AlertDescription>
                                      <div className="flex items-start gap-2">
                                        <span className={color}>{icon}</span>
                                        <div className="flex-1">
                                          <div className="font-medium">[{issue.category}] {issue.message}</div>
                                          {issue.location && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              📍 {issue.location}
                                            </div>
                                          )}
                                          {issue.suggestion && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              💡 {issue.suggestion}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

