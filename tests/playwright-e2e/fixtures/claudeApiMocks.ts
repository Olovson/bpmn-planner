import type { Page, Route } from '@playwright/test';

/**
 * Mock-responser för Claude API-anrop
 * 
 * Dessa mocks används för att simulera Claude API-anrop utan att faktiskt anropa API:et.
 * Detta gör testerna snabbare, mer pålitliga och oberoende av externa tjänster.
 */

export interface ClaudeApiMockOptions {
  /**
   * Om mock ska simulera långsam respons (för progress-testing)
   */
  simulateSlowResponse?: boolean;
  
  /**
   * Om mock ska simulera fel
   */
  simulateError?: boolean;
}

/**
 * Mock-respons för dokumentationsgenerering
 */
const MOCK_DOCUMENTATION_RESPONSE = {
  summary: "Detta är en mockad dokumentation genererad för testning. Den innehåller all nödvändig information för att validera att dokumentationsgenerering fungerar korrekt.",
  userStories: [
    {
      id: "US-1",
      role: "Användare",
      goal: "testa dokumentationsgenerering",
      value: "validera att systemet fungerar",
      acceptanceCriteria: [
        "Dokumentation genereras korrekt",
        "Dokumentation visas i appen",
        "Dokumentation innehåller relevant information"
      ]
    }
  ],
  flowSteps: [
    "Steg 1: Identifiera BPMN-filer",
    "Steg 2: Bygg hierarki",
    "Steg 3: Generera dokumentation",
    "Steg 4: Visa dokumentation i appen"
  ],
  prerequisites: [
    "BPMN-filer måste vara uppladdade",
    "Hierarki måste vara byggd"
  ],
  outputs: [
    "Dokumentation i HTML-format",
    "Metadata för dokumentation"
  ]
};

/**
 * Mock-respons för Feature Goal test-generering (direkt från dokumentation)
 * Detta matchar FeatureGoalTestModel JSON schema
 */
const MOCK_FEATURE_GOAL_TEST_RESPONSE = {
  name: "Application - Hanterar ansökan",
  description: "Feature Goal för att hantera kreditansökan från kunden.",
  given: "Kunden har fyllt i komplett ansökan med personuppgifter. Systemet har validerat att alla obligatoriska fält är ifyllda. Ansökan är redo för bearbetning.",
  when: "Systemet validerar ansökan och samlar in nödvändig data. Processen genomför kreditutvärdering baserat på angivna uppgifter. Systemet genererar beslutsunderlag för handläggare.",
  then: "Ansökan är komplett och klar för kreditutvärdering. Alla nödvändiga data har samlats in. Beslutsunderlag är genererat och redo för handläggning.",
  category: "happy-path"
};

/**
 * Mock-respons för E2E scenario-generering
 */
const MOCK_E2E_SCENARIO_RESPONSE = {
  scenarios: [
    {
      name: "Happy Path Scenario",
      description: "Detta är ett mockat E2E-scenario för happy path",
      type: "happy-path",
      steps: [
        "Start process",
        "Validate input",
        "Process request",
        "Complete process"
      ]
    }
  ]
};

/**
 * Sätter upp mocks för Claude API-anrop
 */
export async function setupClaudeApiMocks(page: Page, options: ClaudeApiMockOptions = {}) {
  const { simulateSlowResponse = false, simulateError = false } = options;

  // Mock Anthropic API endpoint
  // Claude API använder: https://api.anthropic.com/v1/messages
  // Anthropic SDK gör anrop via fetch, så vi mockar HTTP-anrop
  await page.route('**/api.anthropic.com/v1/messages*', async (route: Route) => {
    if (simulateError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            type: 'api_error',
            message: 'Mocked API error for testing'
          }
        })
      });
      return;
    }

    // Simulera långsam respons om önskat
    if (simulateSlowResponse) {
      await page.waitForTimeout(2000);
    }

    // Läs request body för att avgöra vilken typ av generering
    const request = route.request();
    let postData: any = null;
    
    try {
      postData = request.postDataJSON();
    } catch (error) {
      // Om postData inte är JSON, försök läsa som text
      const postDataText = request.postData();
      if (postDataText) {
        try {
          postData = JSON.parse(postDataText);
        } catch {
          // Ignorera om parsing misslyckas
        }
      }
    }
    
    // Kolla om det är dokumentationsgenerering, Feature Goal test-generering eller E2E scenario-generering
    // Förbättrad detektering: kolla både user prompt och system prompt
    const userPrompt = (typeof postData?.messages?.[0]?.content === 'string' 
      ? postData.messages[0].content 
      : '') || '';
    const systemPrompt = postData?.system || '';
    const combinedPrompt = `${systemPrompt} ${userPrompt}`.toLowerCase();
    
    // Detektera Feature Goal test-generering (direkt från dokumentation)
    const isFeatureGoalTestGeneration = 
      combinedPrompt.includes('feature goal test') ||
      combinedPrompt.includes('featuregoal') ||
      (combinedPrompt.includes('given') && combinedPrompt.includes('when') && combinedPrompt.includes('then') && combinedPrompt.includes('feature goal'));
    
    // Detektera E2E scenario-generering
    const isE2eScenarioGeneration = 
      combinedPrompt.includes('e2e scenario') ||
      combinedPrompt.includes('end-to-end') ||
      (combinedPrompt.includes('e2e') && combinedPrompt.includes('scenario'));
    
    // Mock response baserat på typ
    if (isFeatureGoalTestGeneration) {
      // Mock Feature Goal test generation response (direkt från dokumentation)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-mock-feature-goal-test-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify(MOCK_FEATURE_GOAL_TEST_RESPONSE)
            }
          ],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 150,
            output_tokens: 250
          }
        })
      });
    } else if (isE2eScenarioGeneration) {
      // Mock E2E scenario generation response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-mock-e2e-scenario-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify(MOCK_E2E_SCENARIO_RESPONSE)
            }
          ],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 200,
            output_tokens: 400
          }
        })
      });
    } else {
      // Mock documentation generation response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-mock-doc-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify(MOCK_DOCUMENTATION_RESPONSE)
            }
          ],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 150,
            output_tokens: 300
          }
        })
      });
    }
  });

  // OBS: Vi behöver bara en route-hantering ovan, så denna är borttagen
}

/**
 * Verifierar att Claude API-anrop gjordes
 */
export async function verifyClaudeApiCall(page: Page, expectedCallType: 'documentation' | 'test'): Promise<boolean> {
  // Kolla network requests för att se om Claude API anropades
  const requests = await page.evaluate(() => {
    return (window as any).__playwrightRequests || [];
  });
  
  const claudeRequests = requests.filter((req: any) => 
    req.url?.includes('api.anthropic.com') || req.url?.includes('anthropic')
  );
  
  return claudeRequests.length > 0;
}

