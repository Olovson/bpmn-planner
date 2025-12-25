import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { ProcessPath, GatewayCondition } from '@/lib/bpmnFlowExtractor';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { TestScenario } from '@/data/testMapping';

// Mock dependencies
vi.mock('@/lib/bpmnFlowExtractor', () => ({
  findPathsThroughProcess: vi.fn(),
  buildFlowGraph: vi.fn(),
}));

vi.mock('@/lib/featureGoalLlmTypes', () => ({}));

describe('E2E to Feature Goal Test Extraction - Gateway Complexity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractFeatureGoalTestsWithGatewayContext', () => {
    it('should extract Feature Goal tests with gateway conditions', async () => {
      // Mock LLM för att säkerställa deterministisk approach används
      vi.mock('@/lib/llmClient', () => ({
        isLlmEnabled: () => false, // Disable LLM för att testa deterministisk approach
      }));

      // Dynamisk import för att undvika circular dependencies
      const { extractFeatureGoalTestsWithGatewayContext } = await import(
        '@/lib/e2eToFeatureGoalTestExtractor'
      );

      // 1. Setup: Mock E2E-scenarios
      const e2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Happy path - Application approved',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Happy path scenario',
          given: 'Customer is identified',
          when: 'Customer applies for mortgage',
          then: 'Mortgage is approved',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'application',
              featureGoalFile: 'application',
              description: 'Application process',
              hasPlaywrightSupport: false,
              given: 'Customer is identified',
              when: 'Customer fills in application',
              then: 'Application is validated',
            },
            {
              order: 2,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'household',
              featureGoalFile: 'household',
              description: 'Household process',
              hasPlaywrightSupport: false,
              given: 'Application is validated',
              when: 'System collects household data',
              then: 'Household data is complete',
            },
            {
              order: 3,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'credit-evaluation',
              featureGoalFile: 'credit-evaluation',
              description: 'Credit evaluation process',
              hasPlaywrightSupport: false,
              given: 'Household data is complete',
              when: 'System evaluates credit',
              then: 'Credit evaluation is complete',
            },
            {
              order: 4,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'mortgage-commitment',
              featureGoalFile: 'mortgage-commitment',
              description: 'Mortgage commitment process',
              hasPlaywrightSupport: false,
              given: 'Credit evaluation is complete',
              when: 'System creates mortgage commitment',
              then: 'Mortgage commitment is created',
            },
          ],
        },
        {
          id: 'e2e-2',
          name: 'Rejection path - Application rejected',
          priority: 'P0',
          type: 'error',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Rejection path scenario',
          given: 'Customer is identified',
          when: 'Customer applies for mortgage',
          then: 'Mortgage is rejected',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'application',
              featureGoalFile: 'application',
              description: 'Application process',
              hasPlaywrightSupport: false,
              given: 'Customer is identified',
              when: 'Customer fills in application',
              then: 'Application is validated',
            },
            {
              order: 2,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'household',
              featureGoalFile: 'household',
              description: 'Household process',
              hasPlaywrightSupport: false,
              given: 'Application is validated',
              when: 'System collects household data',
              then: 'Household data is complete',
            },
            {
              order: 3,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'credit-evaluation',
              featureGoalFile: 'credit-evaluation',
              description: 'Credit evaluation process',
              hasPlaywrightSupport: false,
              given: 'Household data is complete',
              when: 'System evaluates credit',
              then: 'Credit evaluation is complete',
            },
            {
              order: 4,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'rejection',
              featureGoalFile: 'rejection',
              description: 'Rejection process',
              hasPlaywrightSupport: false,
              given: 'Credit evaluation is complete',
              when: 'System rejects application',
              then: 'Application is rejected',
            },
          ],
        },
      ];

      // 2. Setup: Mock ProcessPaths med gateway-conditions
      const gatewayConditionYes: GatewayCondition = {
        gatewayId: 'gateway-kalp-ok',
        gatewayName: 'KALP OK?',
        condition: '${creditDecision.approved === true}',
        conditionText: 'KALP OK = Yes',
        flowId: 'flow-kalp-yes',
        targetNodeId: 'credit-evaluation',
      };

      const gatewayConditionNo: GatewayCondition = {
        gatewayId: 'gateway-kalp-ok',
        gatewayName: 'KALP OK?',
        condition: '${creditDecision.approved === false}',
        conditionText: 'KALP OK = No',
        flowId: 'flow-kalp-no',
        targetNodeId: 'rejection',
      };

      const paths: ProcessPath[] = [
        {
          type: 'possible-path',
          startEvent: 'start-1',
          endEvent: 'end-1',
          featureGoals: ['application', 'household', 'credit-evaluation', 'mortgage-commitment'],
          gatewayConditions: [gatewayConditionYes],
          nodeIds: [
            'start-1',
            'application',
            'household',
            'gateway-kalp-ok',
            'credit-evaluation',
            'mortgage-commitment',
            'end-1',
          ],
        },
        {
          type: 'possible-path',
          startEvent: 'start-1',
          endEvent: 'end-2',
          featureGoals: ['application', 'household', 'credit-evaluation', 'rejection'],
          gatewayConditions: [gatewayConditionNo],
          nodeIds: [
            'start-1',
            'application',
            'household',
            'gateway-kalp-ok',
            'credit-evaluation',
            'rejection',
            'end-2',
          ],
        },
      ];

      // 3. Setup: Mock Feature Goal-dokumentation
      const featureGoalDocs = new Map<string, FeatureGoalDocModel>([
        [
          'mortgage-se-application.bpmn::application',
          {
            summary: 'Application process collects customer information',
            prerequisites: ['Customer is identified'],
            flowSteps: [
              'System initiates application process',
              'Customer fills in application form',
              'System validates application data',
            ],
            userStories: [
              {
                id: 'US-1',
                role: 'Kund',
                goal: 'Fylla i ansökan',
                value: 'Kunna ansöka om lån',
                acceptanceCriteria: ['Application is complete'],
              },
            ],
            dependencies: [],
          },
        ],
        [
          'mortgage-se-application.bpmn::credit-evaluation',
          {
            summary: 'Credit evaluation process evaluates creditworthiness',
            prerequisites: ['Household data is complete'],
            flowSteps: [
              'System evaluates credit',
              'System generates credit decision',
            ],
            userStories: [
              {
                id: 'US-1',
                role: 'Kreditevaluator',
                goal: 'Få automatisk kreditbedömning',
                value: 'Kunna fatta kreditbeslut',
                acceptanceCriteria: ['Credit evaluation is complete'],
              },
            ],
            dependencies: [],
          },
        ],
        [
          'mortgage-se-application.bpmn::mortgage-commitment',
          {
            summary: 'Mortgage commitment process creates commitment',
            prerequisites: ['Credit evaluation is complete'],
            flowSteps: [
              'System creates mortgage commitment',
              'System validates commitment',
            ],
            userStories: [
              {
                id: 'US-1',
                role: 'Kund',
                goal: 'Få bolåneengagemang',
                value: 'Kunna köpa bostad',
                acceptanceCriteria: ['Mortgage commitment is created'],
              },
            ],
            dependencies: [],
          },
        ],
      ]);

      // 4. Execute: Extrahera Feature Goal-tester
      const result = await extractFeatureGoalTestsWithGatewayContext(
        e2eScenarios,
        paths,
        featureGoalDocs
      );

      // 5. Assert: Verifiera resultat

      // 5a. Verifiera att 'application' har tester (inga gateway-conditions)
      const applicationExtraction = result.get('mortgage-se-application.bpmn::application');
      expect(applicationExtraction).toBeDefined();
      expect(applicationExtraction?.testScenarios.length).toBeGreaterThan(0);
      expect(applicationExtraction?.testScenarios[0].name).toContain('Application');
      expect(applicationExtraction?.testScenarios[0].description).toContain('Customer is identified');
      expect(applicationExtraction?.testScenarios[0].description).not.toContain('KALP OK');

      // 5b. Verifiera att 'credit-evaluation' har SEPARATA tester för olika gateway-conditions
      const creditEvaluationExtraction = result.get(
        'mortgage-se-application.bpmn::credit-evaluation'
      );
      expect(creditEvaluationExtraction).toBeDefined();
      expect(creditEvaluationExtraction?.testScenarios.length).toBe(2); // En för Yes, en för No

      // Hitta tester med gateway-conditions
      const testWithYes = creditEvaluationExtraction?.testScenarios.find((test) =>
        test.description.includes('KALP OK = Yes')
      );
      const testWithNo = creditEvaluationExtraction?.testScenarios.find((test) =>
        test.description.includes('KALP OK = No')
      );

      expect(testWithYes).toBeDefined();
      expect(testWithNo).toBeDefined();
      expect(testWithYes?.name).not.toBe(testWithNo?.name);
      expect(testWithYes?.description).not.toBe(testWithNo?.description);

      // 5c. Verifiera att 'mortgage-commitment' endast har tester för KALP OK = Yes
      const mortgageCommitmentExtraction = result.get(
        'mortgage-se-application.bpmn::mortgage-commitment'
      );
      expect(mortgageCommitmentExtraction).toBeDefined();
      expect(mortgageCommitmentExtraction?.testScenarios.length).toBe(1);
      expect(mortgageCommitmentExtraction?.testScenarios[0].description).toContain('KALP OK = Yes');

      // 5d. Verifiera gateway-contexts
      expect(creditEvaluationExtraction?.gatewayContexts.size).toBe(2);
      const testWithYesContext = creditEvaluationExtraction?.gatewayContexts.get(
        testWithYes!.id
      );
      const testWithNoContext = creditEvaluationExtraction?.gatewayContexts.get(testWithNo!.id);

      expect(testWithYesContext).toBeDefined();
      expect(testWithYesContext?.length).toBe(1);
      expect(testWithYesContext?.[0].conditionText).toBe('KALP OK = Yes');

      expect(testWithNoContext).toBeDefined();
      expect(testWithNoContext?.length).toBe(1);
      expect(testWithNoContext?.[0].conditionText).toBe('KALP OK = No');
    });

    it('should handle Feature Goals without gateway conditions', async () => {
      vi.mock('@/lib/llmClient', () => ({
        isLlmEnabled: () => false,
      }));

      const { extractFeatureGoalTestsWithGatewayContext } = await import(
        '@/lib/e2eToFeatureGoalTestExtractor'
      );

      // Setup: E2E-scenario utan gateway-conditions
      const e2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Simple path',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Simple scenario',
          given: 'Customer is identified',
          when: 'Customer applies',
          then: 'Application is complete',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'application',
              featureGoalFile: 'application',
              description: 'Application process',
              hasPlaywrightSupport: false,
              given: 'Customer is identified',
              when: 'Customer fills in application',
              then: 'Application is validated',
            },
          ],
        },
      ];

      const paths: ProcessPath[] = [
        {
          type: 'possible-path',
          startEvent: 'start-1',
          endEvent: 'end-1',
          featureGoals: ['application'],
          gatewayConditions: [], // Inga gateway-conditions
          nodeIds: ['start-1', 'application', 'end-1'],
        },
      ];

      const featureGoalDocs = new Map<string, FeatureGoalDocModel>([
        [
          'mortgage-se-application.bpmn::application',
          {
            summary: 'Application process',
            prerequisites: ['Customer is identified'],
            flowSteps: ['Customer fills in application'],
            userStories: [],
            dependencies: [],
          },
        ],
      ]);

      // Execute
      const result = await extractFeatureGoalTestsWithGatewayContext(
        e2eScenarios,
        paths,
        featureGoalDocs
      );

      // Assert: Feature Goal ska ha tester utan gateway-conditions
      const applicationExtraction = result.get('mortgage-se-application.bpmn::application');
      expect(applicationExtraction).toBeDefined();
      expect(applicationExtraction?.testScenarios.length).toBe(1);
      expect(applicationExtraction?.testScenarios[0].description).not.toContain('Gateway Conditions');
      expect(applicationExtraction?.gatewayContexts.size).toBe(1);
      expect(applicationExtraction?.gatewayContexts.get(applicationExtraction.testScenarios[0].id)).toEqual([]);
    });

    it('should deduplicate tests with same gateway context', async () => {
      vi.mock('@/lib/llmClient', () => ({
        isLlmEnabled: () => false,
      }));

      const { extractFeatureGoalTestsWithGatewayContext } = await import(
        '@/lib/e2eToFeatureGoalTestExtractor'
      );

      // Setup: Två E2E-scenarios med samma Feature Goal och samma gateway-conditions
      const e2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Happy path 1',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Happy path',
          given: 'Customer is identified',
          when: 'Customer applies',
          then: 'Application is complete',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'credit-evaluation',
              featureGoalFile: 'credit-evaluation',
              description: 'Credit evaluation process',
              hasPlaywrightSupport: false,
              given: 'Household data is complete',
              when: 'System evaluates credit',
              then: 'Credit evaluation is complete',
            },
          ],
        },
        {
          id: 'e2e-2',
          name: 'Happy path 2',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Happy path',
          given: 'Customer is identified',
          when: 'Customer applies',
          then: 'Application is complete',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'credit-evaluation',
              featureGoalFile: 'credit-evaluation',
              description: 'Credit evaluation process',
              hasPlaywrightSupport: false,
              given: 'Household data is complete',
              when: 'System evaluates credit',
              then: 'Credit evaluation is complete',
            },
          ],
        },
      ];

      const gatewayCondition: GatewayCondition = {
        gatewayId: 'gateway-kalp-ok',
        gatewayName: 'KALP OK?',
        condition: '${creditDecision.approved === true}',
        conditionText: 'KALP OK = Yes',
        flowId: 'flow-kalp-yes',
        targetNodeId: 'credit-evaluation',
      };

      const paths: ProcessPath[] = [
        {
          type: 'possible-path',
          startEvent: 'start-1',
          endEvent: 'end-1',
          featureGoals: ['credit-evaluation'],
          gatewayConditions: [gatewayCondition],
          nodeIds: ['start-1', 'gateway-kalp-ok', 'credit-evaluation', 'end-1'],
        },
        {
          type: 'possible-path',
          startEvent: 'start-2',
          endEvent: 'end-2',
          featureGoals: ['credit-evaluation'],
          gatewayConditions: [gatewayCondition], // Samma gateway-condition
          nodeIds: ['start-2', 'gateway-kalp-ok', 'credit-evaluation', 'end-2'],
        },
      ];

      const featureGoalDocs = new Map<string, FeatureGoalDocModel>([
        [
          'mortgage-se-application.bpmn::credit-evaluation',
          {
            summary: 'Credit evaluation',
            prerequisites: ['Household data is complete'],
            flowSteps: ['System evaluates credit'],
            userStories: [],
            dependencies: [],
          },
        ],
      ]);

      // Execute
      const result = await extractFeatureGoalTestsWithGatewayContext(
        e2eScenarios,
        paths,
        featureGoalDocs
      );

      // Assert: Tester ska dedupliceras (endast ett test för samma gateway-context)
      const creditEvaluationExtraction = result.get(
        'mortgage-se-application.bpmn::credit-evaluation'
      );
      expect(creditEvaluationExtraction).toBeDefined();
      expect(creditEvaluationExtraction?.testScenarios.length).toBe(1); // Deduplicerad
      expect(creditEvaluationExtraction?.testScenarios[0].description).toContain('KALP OK = Yes');
    });

    it('should handle multiple gateways in sequence', async () => {
      vi.mock('@/lib/llmClient', () => ({
        isLlmEnabled: () => false,
      }));

      const { extractFeatureGoalTestsWithGatewayContext } = await import(
        '@/lib/e2eToFeatureGoalTestExtractor'
      );

      // Setup: E2E-scenario med flera gateways i sekvens
      const e2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Complex path',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Complex scenario',
          given: 'Customer is identified',
          when: 'Customer applies',
          then: 'Application is complete',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'application',
              featureGoalFile: 'application',
              description: 'Application process',
              hasPlaywrightSupport: false,
              given: 'Customer is identified',
              when: 'Customer fills in application',
              then: 'Application is validated',
            },
            {
              order: 2,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'credit-evaluation',
              featureGoalFile: 'credit-evaluation',
              description: 'Credit evaluation process',
              hasPlaywrightSupport: false,
              given: 'Application is validated',
              when: 'System evaluates credit',
              then: 'Credit evaluation is complete',
            },
            {
              order: 3,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'mortgage-commitment',
              featureGoalFile: 'mortgage-commitment',
              description: 'Mortgage commitment process',
              hasPlaywrightSupport: false,
              given: 'Credit evaluation is complete',
              when: 'System creates mortgage commitment',
              then: 'Mortgage commitment is created',
            },
          ],
        },
      ];

      const gatewayCondition1: GatewayCondition = {
        gatewayId: 'gateway-1',
        gatewayName: 'KALP OK?',
        condition: '${creditDecision.approved === true}',
        conditionText: 'KALP OK = Yes',
        flowId: 'flow-1',
        targetNodeId: 'credit-evaluation',
      };

      const gatewayCondition2: GatewayCondition = {
        gatewayId: 'gateway-2',
        gatewayName: 'Commitment OK?',
        condition: '${commitment.approved === true}',
        conditionText: 'Commitment OK = Yes',
        flowId: 'flow-2',
        targetNodeId: 'mortgage-commitment',
      };

      const paths: ProcessPath[] = [
        {
          type: 'possible-path',
          startEvent: 'start-1',
          endEvent: 'end-1',
          featureGoals: ['application', 'credit-evaluation', 'mortgage-commitment'],
          gatewayConditions: [gatewayCondition1, gatewayCondition2],
          nodeIds: [
            'start-1',
            'application',
            'gateway-1',
            'credit-evaluation',
            'gateway-2',
            'mortgage-commitment',
            'end-1',
          ],
        },
      ];

      const featureGoalDocs = new Map<string, FeatureGoalDocModel>([
        [
          'mortgage-se-application.bpmn::application',
          {
            summary: 'Application',
            prerequisites: ['Customer is identified'],
            flowSteps: ['Customer fills in application'],
            userStories: [],
            dependencies: [],
          },
        ],
        [
          'mortgage-se-application.bpmn::credit-evaluation',
          {
            summary: 'Credit evaluation',
            prerequisites: ['Application is validated'],
            flowSteps: ['System evaluates credit'],
            userStories: [],
            dependencies: [],
          },
        ],
        [
          'mortgage-se-application.bpmn::mortgage-commitment',
          {
            summary: 'Mortgage commitment',
            prerequisites: ['Credit evaluation is complete'],
            flowSteps: ['System creates mortgage commitment'],
            userStories: [],
            dependencies: [],
          },
        ],
      ]);

      // Execute
      const result = await extractFeatureGoalTestsWithGatewayContext(
        e2eScenarios,
        paths,
        featureGoalDocs
      );

      // Assert: Feature Goals ska ha rätt gateway-conditions
      const creditEvaluationExtraction = result.get(
        'mortgage-se-application.bpmn::credit-evaluation'
      );
      expect(creditEvaluationExtraction).toBeDefined();
      const creditTest = creditEvaluationExtraction?.testScenarios[0];
      expect(creditTest?.description).toContain('KALP OK = Yes');
      expect(creditTest?.description).not.toContain('Commitment OK = Yes'); // Endast gateway FÖRE

      const mortgageCommitmentExtraction = result.get(
        'mortgage-se-application.bpmn::mortgage-commitment'
      );
      expect(mortgageCommitmentExtraction).toBeDefined();
      const commitmentTest = mortgageCommitmentExtraction?.testScenarios[0];
      expect(commitmentTest?.description).toContain('KALP OK = Yes'); // Gateway FÖRE
      expect(commitmentTest?.description).toContain('Commitment OK = Yes'); // Gateway FÖRE
    });

    it('should handle missing ProcessPath gracefully', async () => {
      vi.mock('@/lib/llmClient', () => ({
        isLlmEnabled: () => false,
      }));

      const { extractFeatureGoalTestsWithGatewayContext } = await import(
        '@/lib/e2eToFeatureGoalTestExtractor'
      );

      // Setup: E2E-scenario utan motsvarande ProcessPath
      const e2eScenarios: E2eScenario[] = [
        {
          id: 'e2e-1',
          name: 'Orphan scenario',
          priority: 'P0',
          type: 'happy-path',
          iteration: 'Köp bostadsrätt',
          bpmnProcess: 'mortgage-se-application.bpmn',
          featureGoalFile: 'application',
          testFile: 'test.spec.ts',
          command: 'npx playwright test test.spec.ts',
          summary: 'Orphan scenario',
          given: 'Customer is identified',
          when: 'Customer applies',
          then: 'Application is complete',
          notesForBankProject: '',
          bankProjectTestSteps: [],
          subprocessSteps: [
            {
              order: 1,
              bpmnFile: 'mortgage-se-application.bpmn',
              callActivityId: 'application',
              featureGoalFile: 'application',
              description: 'Application process',
              hasPlaywrightSupport: false,
              given: 'Customer is identified',
              when: 'Customer fills in application',
              then: 'Application is validated',
            },
          ],
        },
      ];

      const paths: ProcessPath[] = []; // Inga paths

      const featureGoalDocs = new Map<string, FeatureGoalDocModel>([
        [
          'mortgage-se-application.bpmn::application',
          {
            summary: 'Application',
            prerequisites: ['Customer is identified'],
            flowSteps: ['Customer fills in application'],
            userStories: [],
            dependencies: [],
          },
        ],
      ]);

      // Execute (should not throw)
      const result = await extractFeatureGoalTestsWithGatewayContext(
        e2eScenarios,
        paths,
        featureGoalDocs
      );

      // Assert: Feature Goal ska ha tester utan gateway-conditions (fallback)
      const applicationExtraction = result.get('mortgage-se-application.bpmn::application');
      expect(applicationExtraction).toBeDefined();
      expect(applicationExtraction?.testScenarios.length).toBe(1);
      expect(applicationExtraction?.testScenarios[0].description).not.toContain('Gateway Conditions');
    });
  });
});

