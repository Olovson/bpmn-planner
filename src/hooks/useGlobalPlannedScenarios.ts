import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';
import type { ScenarioProvider } from './useNodePlannedScenarios';

export interface GlobalPlannedNode {
  bpmnFile: string;
  elementId: string;
  byProvider: {
    provider: ScenarioProvider;
    origin: 'design' | 'llm-doc' | 'spec-parsed';
    scenarios: TestScenario[];
  }[];
}

export interface GlobalPlannedSummary {
  totalNodesWithScenarios: number;
  totalPlannedScenarios: number;
  nodes: GlobalPlannedNode[];
}

export const useGlobalPlannedScenarios = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['global-planned-scenarios'],
    queryFn: async (): Promise<GlobalPlannedSummary | null> => {
      const { data, error } = await supabase
        .from('node_planned_scenarios')
        .select('bpmn_file, bpmn_element_id, provider, origin, scenarios');

      if (error) {
        console.warn(
          '[useGlobalPlannedScenarios] Failed to load node_planned_scenarios:',
          error,
        );
        return null;
      }

      const byNodeKey = new Map<
        string,
        {
          bpmnFile: string;
          elementId: string;
          byProvider: {
            provider: ScenarioProvider;
            origin: 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct';
            scenarios: TestScenario[];
          }[];
        }
      >();

      let totalPlannedScenarios = 0;

      for (const row of data || []) {
        const bpmnFile = (row as any).bpmn_file as string | null;
        const elementId = (row as any).bpmn_element_id as string | null;
        if (!bpmnFile || !elementId) continue;

        const provider =
          ((row as any).provider as ScenarioProvider | null) ??
          'claude';
        const origin =
          ((row as any).origin as 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct' | null) ??
          'design';
        const scenarios =
          (((row as any).scenarios || []) as unknown as TestScenario[]) || [];

        const key = `${bpmnFile}::${elementId}`;
        if (!byNodeKey.has(key)) {
          byNodeKey.set(key, {
            bpmnFile,
            elementId,
            byProvider: [],
          });
        }

        const nodeEntry = byNodeKey.get(key)!;
        nodeEntry.byProvider.push({
          provider,
          origin,
          scenarios,
        });

        totalPlannedScenarios += scenarios.length;
      }

      return {
        totalNodesWithScenarios: byNodeKey.size,
        totalPlannedScenarios,
        nodes: Array.from(byNodeKey.values()),
      };
    },
  });

  return {
    summary: data,
    isLoading,
  };
};

