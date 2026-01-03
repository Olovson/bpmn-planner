/**
 * Helper functions for fetching test data from database and E2E scenarios
 * Used when generating HTML documentation with test information
 */

import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';
import { scenarios as e2eScenarios } from '@/pages/E2eTestsOverviewPage';
import type { E2eScenario, BankProjectTestStep } from '@/pages/E2eTestsOverviewPage';

export type ScenarioProvider = 'cloud' | 'claude' | 'ollama' | 'chatgpt';

export interface TestScenarioData {
  provider: ScenarioProvider;
  origin: 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct';
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
    if (import.meta.env.DEV) {
      console.log(`[fetchPlannedScenarios] Querying for ${bpmnFile}::${elementId}`);
    }
    
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

    if (import.meta.env.DEV) {
      if (data && data.length > 0) {
        console.log(`[fetchPlannedScenarios] Found ${data.length} row(s) for ${bpmnFile}::${elementId}`);
        const firstRow = data[0];
        if (firstRow.scenarios && Array.isArray(firstRow.scenarios) && firstRow.scenarios.length > 0) {
          const firstScenario = firstRow.scenarios[0] as any;
          console.log(`[fetchPlannedScenarios] First scenario:`, {
            id: firstScenario.id,
            name: firstScenario.name,
            hasDescription: !!firstScenario.description,
            descriptionPreview: firstScenario.description?.substring(0, 100),
          });
        }
      } else {
        console.log(`[fetchPlannedScenarios] No data found for ${bpmnFile}::${elementId}`);
      }
    }

    if (!data || data.length === 0) {
      return null;
    }

    // If preferred provider is specified, try to find it first
    if (preferredProvider) {
      const rowsWithProvider = data.filter((row) => row.provider === preferredProvider);
      if (rowsWithProvider.length > 0) {
        // Prioritera origin: 'claude-direct' över 'design'
        const originPriority: Array<'claude-direct' | 'llm-doc' | 'spec-parsed' | 'design'> = [
          'claude-direct',
          'llm-doc',
          'spec-parsed',
          'design',
        ];
        for (const origin of originPriority) {
          const match = rowsWithProvider.find((row) => row.origin === origin);
          if (match) {
            return {
              provider: match.provider as ScenarioProvider,
              origin: match.origin as 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct',
              scenarios: (match.scenarios || []) as unknown as TestScenario[],
            };
          }
        }
      }
    }

    // VIKTIGT: Prioritera origin: 'claude-direct' över 'design'
    // Detta säkerställer att nya testscenarios (med given/when/then från Claude) prioriteras över gamla
    const originPriority: Array<'claude-direct' | 'llm-doc' | 'spec-parsed' | 'design'> = [
      'claude-direct',
      'llm-doc',
      'spec-parsed',
      'design',
    ];
    
    // Otherwise, prefer cloud/chatgpt > ollama
    const providerPriority: ScenarioProvider[] = ['cloud', 'claude', 'chatgpt', 'ollama'];
    
    // Först: Försök hitta rad med högsta provider-prioritet OCH högsta origin-prioritet
    for (const provider of providerPriority) {
      const rowsWithProvider = data.filter((row) => row.provider === provider);
      if (rowsWithProvider.length > 0) {
        // Hitta rad med högsta origin-prioritet
        for (const origin of originPriority) {
          const match = rowsWithProvider.find((row) => row.origin === origin);
          if (match) {
            return {
              provider: match.provider as ScenarioProvider,
              origin: match.origin as 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct',
              scenarios: (match.scenarios || []) as unknown as TestScenario[],
            };
          }
        }
      }
    }

    // Fallback to first available
    const first = data[0];
    return {
      provider: first.provider as ScenarioProvider,
      origin: first.origin as 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct',
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

