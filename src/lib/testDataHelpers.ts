/**
 * Helper functions for fetching test data from database and E2E scenarios
 * Used when generating HTML documentation with test information
 */

import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';
import { scenarios as e2eScenarios } from '@/pages/E2eTestsOverviewPage';
import type { E2eScenario, BankProjectTestStep } from '@/pages/E2eTestsOverviewPage';

export type ScenarioProvider = 'local-fallback' | 'cloud' | 'claude' | 'ollama' | 'chatgpt';

export interface TestScenarioData {
  provider: ScenarioProvider;
  origin: 'design' | 'llm-doc' | 'spec-parsed';
  scenarios: TestScenario[];
}

export interface E2eTestStepInfo {
  apiCall?: string;
  uiInteraction?: string;
  dmnDecision?: string;
  action: string;
  assertion: string;
  backendState?: string;
}

/**
 * Fetches planned test scenarios from database for a specific node
 */
export async function fetchPlannedScenarios(
  bpmnFile: string,
  elementId: string,
  preferredProvider?: ScenarioProvider,
): Promise<TestScenarioData | null> {
  try {
    const { data, error } = await supabase
      .from('node_planned_scenarios')
      .select('provider, origin, scenarios')
      .eq('bpmn_file', bpmnFile)
      .eq('bpmn_element_id', elementId);

    if (error) {
      console.warn(
        '[fetchPlannedScenarios] Failed to load node_planned_scenarios:',
        error,
      );
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // If preferred provider is specified, try to find it first
    if (preferredProvider) {
      const preferred = data.find((row) => row.provider === preferredProvider);
      if (preferred) {
        return {
          provider: preferred.provider as ScenarioProvider,
          origin: preferred.origin as 'design' | 'llm-doc' | 'spec-parsed',
          scenarios: (preferred.scenarios || []) as unknown as TestScenario[],
        };
      }
    }

    // Otherwise, prefer cloud/chatgpt > local-fallback > ollama
    const priority: ScenarioProvider[] = ['cloud', 'claude', 'chatgpt', 'local-fallback', 'ollama'];
    for (const provider of priority) {
      const match = data.find((row) => row.provider === provider);
      if (match) {
        return {
          provider: match.provider as ScenarioProvider,
          origin: match.origin as 'design' | 'llm-doc' | 'spec-parsed',
          scenarios: (match.scenarios || []) as unknown as TestScenario[],
        };
      }
    }

    // Fallback to first available
    const first = data[0];
    return {
      provider: first.provider as ScenarioProvider,
      origin: first.origin as 'design' | 'llm-doc' | 'spec-parsed',
      scenarios: (first.scenarios || []) as unknown as TestScenario[],
    };
  } catch (error) {
    console.warn('[fetchPlannedScenarios] Error:', error);
    return null;
  }
}

/**
 * Finds E2E test step information for a specific BPMN node
 * Returns API calls, UI interactions, and DMN decisions from E2E scenarios
 */
export function findE2eTestInfoForNode(
  bpmnNodeId: string,
  bpmnFile?: string,
): E2eTestStepInfo[] {
  const results: E2eTestStepInfo[] = [];

  for (const scenario of e2eScenarios) {
    // Filter by BPMN file if provided
    if (bpmnFile && scenario.bpmnProcess !== bpmnFile) {
      continue;
    }

    // Find matching test steps
    for (const step of scenario.bankProjectTestSteps || []) {
      if (step.bpmnNodeId === bpmnNodeId) {
        results.push({
          apiCall: step.apiCall,
          uiInteraction: step.uiInteraction,
          dmnDecision: step.dmnDecision,
          action: step.action,
          assertion: step.assertion,
          backendState: step.backendState,
        });
      }
    }
  }

  return results;
}

/**
 * Aggregates E2E test information for all child nodes of a Feature Goal
 */
export function aggregateE2eTestInfoForFeatureGoal(
  childNodeIds: string[],
  bpmnFile?: string,
): Map<string, E2eTestStepInfo[]> {
  const aggregated = new Map<string, E2eTestStepInfo[]>();

  for (const nodeId of childNodeIds) {
    const testInfo = findE2eTestInfoForNode(nodeId, bpmnFile);
    if (testInfo.length > 0) {
      aggregated.set(nodeId, testInfo);
    }
  }

  return aggregated;
}

