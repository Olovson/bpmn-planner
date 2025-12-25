/**
 * Validation helper functions for E2eQualityValidationPage
 * 
 * Extracted from E2eQualityValidationPage.tsx for better organization
 * Uses actual logic - only mocks external dependencies (fetch)
 */

import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type {
  ValidationIssue,
  CompletenessMetrics,
  MockQualityAnalysis,
  BpmnValidationResult,
  BpmnServiceTask,
  BpmnUserTask,
  BpmnBusinessRuleTask,
  BackendStateField,
  MockResponseAnalysis,
  ValidationResult,
} from '@/pages/E2eQualityValidationPage/types';

// Extrahera API-endpoints från mock-fil
export async function extractMockedEndpoints(): Promise<Set<string>> {
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
export function extractNodesFromTree(
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

// Generera exempel-kod för olika typer av issues
export function generateExampleCode(issue: ValidationIssue): string | undefined {
  const { category, metadata } = issue;
  
  if (!metadata) return undefined;
  
  // ServiceTask som saknas i bankProjectTestSteps
  if (category === 'BPMN → Scenarios Mapping' && metadata.taskType === 'ServiceTask') {
    const taskId = metadata.taskId || 'task-id';
    const taskName = metadata.taskName || 'Task Name';
    const apiCall = metadata.apiCall || `POST /api/${taskId.replace(/-/g, '/')}`;
    
    return `{
  bpmnNodeId: '${taskId}',
  bpmnNodeType: 'ServiceTask',
  bpmnNodeName: '${taskName}',
  action: '${taskName}',
  apiCall: '${apiCall}',
  assertion: 'Verifiera att ${taskName} har körts',
},`;
  }
  
  // UserTask som saknas i bankProjectTestSteps
  if (category === 'BPMN → Scenarios Mapping' && metadata.taskType === 'UserTask') {
    const taskId = metadata.taskId || 'task-id';
    const taskName = metadata.taskName || 'Task Name';
    
    return `{
  bpmnNodeId: '${taskId}',
  bpmnNodeType: 'UserTask',
  bpmnNodeName: '${taskName}',
  action: '${taskName}',
  uiInteraction: 'Beskriv UI-interaktion här (t.ex. "Fyll i formulär, klicka på knapp")',
  assertion: 'Verifiera att ${taskName} är klar',
},`;
  }
  
  // BusinessRuleTask som saknas i bankProjectTestSteps
  if (category === 'BPMN → Scenarios Mapping' && metadata.taskType === 'BusinessRuleTask') {
    const taskId = metadata.taskId || 'task-id';
    const taskName = metadata.taskName || 'Task Name';
    
    return `{
  bpmnNodeId: '${taskId}',
  bpmnNodeType: 'BusinessRuleTask',
  bpmnNodeName: '${taskName}',
  action: '${taskName}',
  dmnDecision: 'Beskriv DMN-beslut här (t.ex. "APPROVED" eller "REJECTED")',
  assertion: 'Verifiera att ${taskName} har körts',
},`;
  }
  
  // UserTask som saknar UI-interaktion
  if (category === 'UserTask Documentation' && metadata.taskId) {
    const taskId = metadata.taskId;
    const taskName = metadata.taskName || 'Task Name';
    
    return `// I bankProjectTestSteps, uppdatera ${taskId}:
{
  ...existingFields,
  uiInteraction: 'Beskriv UI-interaktion här (t.ex. "Fyll i formulär, klicka på knapp")',
}`;
  }
  
  // BusinessRuleTask som saknar DMN-beslut
  if (category === 'BusinessRuleTask Documentation' && metadata.taskId) {
    const taskId = metadata.taskId;
    const taskName = metadata.taskName || 'Task Name';
    
    return `// I bankProjectTestSteps, uppdatera ${taskId}:
{
  ...existingFields,
  dmnDecision: 'Beskriv DMN-beslut här (t.ex. "APPROVED" eller "REJECTED")',
}`;
  }
  
  // Mock som saknas
  if (category === 'API Mock Coverage' && metadata.apiCall) {
    const apiCall = metadata.apiCall;
    const method = apiCall.split(' ')[0] || 'POST';
    const path = apiCall.split(' ')[1] || '/api/endpoint';
    
    return `// I mortgageE2eMocks.ts, lägg till:
await page.route('**${path}', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      // Lägg till mock-response här
    }),
  });
});`;
  }
  
  // Mock-response som saknar fält
  if (category === 'Mock Response Quality' && metadata.apiCall && metadata.fieldPath && metadata.expectedValue) {
    const apiCall = metadata.apiCall;
    const fieldPath = metadata.fieldPath;
    const expectedValue = metadata.expectedValue;
    
    return `// I mortgageE2eMocks.ts, uppdatera mock-response för ${apiCall}:
// Lägg till fält: ${fieldPath} = ${expectedValue}`;
  }
  
  // Subprocess som saknar Given/When/Then
  if (category === 'Subprocess Documentation') {
    return `// I subprocessSteps, lägg till:
given: 'Beskriv initialt tillstånd här',
when: 'Beskriv vad som händer här',
then: 'Beskriv förväntat resultat här',`;
  }
  
  return undefined;
}

// Extrahera task-namn från summary-strängar (t.ex. "fetch-party-information (internal-data-gathering)" → "fetch-party-information")
export function extractTaskNamesFromSummary(summary?: string): Set<string> {
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

// Normalisera API-anrop för jämförelse
export function normalizeApiCall(apiCall: string): string {
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
export async function hasApiMock(
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
export function analyzeMockQuality(
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

// Beräkna procentuell kompletthet
export function calculatePercentage(total: number, documented: number): number {
  return total > 0 ? Math.round((documented / total) * 100) : 100;
}

// Parsa backend state-strängar (t.ex. "Application.status = \"COMPLETE\", Application.readyForEvaluation = true")
export function parseBackendState(backendState: string): BackendStateField[] {
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
export function extractMockResponseFields(mockResponse: any, prefix = ''): string[] {
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
export function getNestedValue(obj: any, path: string): any {
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
export async function analyzeMockResponses(scenario: E2eScenario): Promise<MockResponseAnalysis[]> {
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

