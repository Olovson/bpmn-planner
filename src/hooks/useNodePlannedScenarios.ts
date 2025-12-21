import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';

export type ScenarioProvider = 'local-fallback' | 'claude' | 'chatgpt' | 'ollama';

export interface ProviderScenarioSet {
  provider: ScenarioProvider;
  origin: 'design' | 'llm-doc' | 'spec-parsed';
  scenarios: TestScenario[];
}

interface UseNodePlannedScenariosParams {
  bpmnFile?: string;
  elementId?: string;
}

export const useNodePlannedScenarios = ({
  bpmnFile,
  elementId,
}: UseNodePlannedScenariosParams) => {
  const enabled = Boolean(bpmnFile && elementId);

  const { data = [], isLoading } = useQuery({
    queryKey: ['node-planned-scenarios', bpmnFile, elementId],
    enabled,
    queryFn: async (): Promise<ProviderScenarioSet[]> => {
      if (!bpmnFile || !elementId) return [];

      const { data, error } = await supabase
        .from('node_planned_scenarios')
        .select('provider, origin, scenarios')
        .eq('bpmn_file', bpmnFile)
        .eq('bpmn_element_id', elementId);

      if (error) {
        console.warn(
          '[useNodePlannedScenarios] Failed to load node_planned_scenarios:',
          error,
        );
        return [];
      }

      return (data || []).map((row) => ({
        provider: row.provider as ScenarioProvider,
        origin: row.origin as 'design' | 'llm-doc' | 'spec-parsed',
        scenarios: (row.scenarios || []) as unknown as TestScenario[],
      }));
    },
  });

  return {
    variants: data,
    isLoading,
  };
};

