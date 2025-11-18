import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { E2EScenario, E2EScenarioPath } from '@/types/e2eScenario';

export const useE2EScenarios = (initiative?: string) => {
  return useQuery<E2EScenario[]>({
    queryKey: ['e2e-scenarios', initiative],
    queryFn: async () => {
      let query = supabase
        .from('e2e_scenarios')
        .select('*')
        .order('created_at', { ascending: true });

      if (initiative) {
        query = query.eq('initiative', initiative);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching E2E scenarios:', error);
        throw error;
      }

      return (data || []).map(row => {
        const pathData = row.path as unknown as E2EScenarioPath;
        const tagsData = (row.tags as unknown as string[]) || [];
        
        return {
          id: row.id,
          initiative: row.initiative,
          name: row.name,
          description: row.description || undefined,
          bpmnFile: row.bpmn_file,
          path: pathData,
          tags: tagsData,
          testFilePath: row.test_file_path || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
