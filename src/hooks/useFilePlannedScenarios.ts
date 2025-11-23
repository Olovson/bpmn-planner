import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';

export interface FilePlannedScenarioSummary {
  bpmnFile: string;
  totalNodesWithPlannedScenarios: number;
  totalPlannedScenarios: number;
  byNode: {
    elementId: string;
    totalScenarios: number;
    byProvider: {
      provider: 'local-fallback' | 'chatgpt' | 'ollama';
      origin: 'design' | 'llm-doc' | 'spec-parsed';
      scenarios: TestScenario[];
    }[];
  }[];
}

export const useFilePlannedScenarios = (bpmnFile?: string | null) => {
  const enabled = Boolean(bpmnFile);

  const { data, isLoading } = useQuery({
    queryKey: ['file-planned-scenarios', bpmnFile],
    enabled,
    queryFn: async (): Promise<FilePlannedScenarioSummary | null> => {
      if (!bpmnFile) return null;

      const { data, error } = await supabase
        .from('node_planned_scenarios')
        .select('bpmn_element_id, provider, origin, scenarios')
        .eq('bpmn_file', bpmnFile);

      if (error) {
        console.warn(
          '[useFilePlannedScenarios] Failed to load node_planned_scenarios:',
          error,
        );
        return {
          bpmnFile,
          totalNodesWithPlannedScenarios: 0,
          totalPlannedScenarios: 0,
          byNode: [],
        };
      }

      const byNodeMap = new Map<
        string,
        {
          elementId: string;
          totalScenarios: number;
          byProvider: {
            provider: 'local-fallback' | 'chatgpt' | 'ollama';
            origin: 'design' | 'llm-doc' | 'spec-parsed';
            scenarios: TestScenario[];
          }[];
        }
      >();

      let totalPlannedScenarios = 0;

      for (const row of data || []) {
        const elementId = row.bpmn_element_id as string | null;
        if (!elementId) continue;

        const provider =
          (row.provider as 'local-fallback' | 'chatgpt' | 'ollama' | null) ??
          'local-fallback';
        const origin =
          (row.origin as 'design' | 'llm-doc' | 'spec-parsed' | null) ??
          'design';
        const scenarios = (row.scenarios || []) as unknown as TestScenario[];

        if (!byNodeMap.has(elementId)) {
          byNodeMap.set(elementId, {
            elementId,
            totalScenarios: 0,
            byProvider: [],
          });
        }

        const nodeEntry = byNodeMap.get(elementId)!;
        nodeEntry.byProvider.push({
          provider,
          origin,
          scenarios,
        });

        nodeEntry.totalScenarios += scenarios.length;
        totalPlannedScenarios += scenarios.length;
      }

      return {
        bpmnFile,
        totalNodesWithPlannedScenarios: byNodeMap.size,
        totalPlannedScenarios,
        byNode: Array.from(byNodeMap.values()),
      };
    },
  });

  return {
    summary: data,
    isLoading,
  };
};

