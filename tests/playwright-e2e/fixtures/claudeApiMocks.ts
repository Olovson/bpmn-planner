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
 * Mock-respons för testgenerering
 */
const MOCK_TEST_SCENARIOS_RESPONSE = {
  scenarios: [
    {
      name: "Happy Path Scenario",
      description: "Detta är ett mockat test-scenario för happy path",
      given: ["Systemet är igång", "BPMN-filer är uppladdade"],
      when: ["Användaren genererar tester"],
      then: ["Tester genereras korrekt", "Tester visas i appen"],
      priority: "P1",
      riskLevel: "LOW"
    },
    {
      name: "Error Handling Scenario",
      description: "Detta är ett mockat test-scenario för error handling",
      given: ["Systemet är igång", "Ett fel uppstår"],
      when: ["Användaren försöker generera tester"],
      then: ["Fel hanteras korrekt", "Användaren får feedback"],
      priority: "P2",
      riskLevel: "MEDIUM"
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
    
    // Kolla om det är dokumentationsgenerering eller testgenerering
    // Förbättrad detektering: kolla både user prompt och system prompt
    const userPrompt = (typeof postData?.messages?.[0]?.content === 'string' 
      ? postData.messages[0].content 
      : '') || '';
    const systemPrompt = postData?.system || '';
    const combinedPrompt = `${systemPrompt} ${userPrompt}`.toLowerCase();
    
    const isTestGeneration = 
      combinedPrompt.includes('test scenario') ||
      combinedPrompt.includes('generate test') ||
      combinedPrompt.includes('test generation') ||
      (userPrompt.toLowerCase().includes('test') && userPrompt.toLowerCase().includes('scenario'));
    
    // Mock response baserat på typ
    if (isTestGeneration) {
      // Mock test scenario generation response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-mock-test-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify(MOCK_TEST_SCENARIOS_RESPONSE)
            }
          ],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 200
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

