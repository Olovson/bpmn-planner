/**
 * Types för Claude-genererade test scenarios.
 */

export interface TestScenarioLlmStep {
  order: number;
  action: string;
  expectedResult: string;
}

export interface TestScenarioLlmScenario {
  id: string;
  name: string;
  description: string;
  category: 'happy-path' | 'error-case' | 'edge-case';
  priority: 'P0' | 'P1' | 'P2';
  steps: TestScenarioLlmStep[];
  acceptanceCriteria: string[];
  prerequisites?: string[];
  edgeCases?: string[];
}

export interface TestScenarioLlmOutput {
  scenarios: TestScenarioLlmScenario[];
}

export interface TestScenarioContext {
  nodeContext: {
    bpmnFile: string;
    elementId: string;
    nodeType: 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity';
    nodeName: string;
  };
  documentation: {
    userStories: Array<{
      id: string;
      role: 'Kund' | 'Handläggare' | 'Processägare';
      goal: string;
      value: string;
      acceptanceCriteria: string[];
    }>;
    summary?: string;
    flowSteps?: string[];
    dependencies?: string[];
  };
  bpmnProcessFlow: {
    paths: Array<{
      type: 'happy-path' | 'error-path';
      nodes: Array<{
        id: string;
        type: string;
        name: string;
      }>;
      description?: string;
    }>;
    errorEvents?: Array<{
      nodeId: string;
      errorCode?: string;
      errorName: string;
    }>;
    gateways?: Array<{
      nodeId: string;
      name: string;
      conditions?: string[];
    }>;
  };
}

export interface TestScenarioLlmResult {
  scenarios: TestScenarioLlmScenario[];
  provider: string;
  fallbackUsed: boolean;
  latencyMs?: number;
}





