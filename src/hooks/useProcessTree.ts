import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessTreeNode } from '@/lib/processTree';

export const useProcessTree = (rootFile: string = 'mortgage.bpmn') => {
  return useQuery<ProcessTreeNode | null>({
    queryKey: ['process-tree', rootFile],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `build-process-tree?rootFile=${encodeURIComponent(rootFile)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (error) {
        console.error('Error building process tree:', error);
        throw error;
      }

      return data as ProcessTreeNode;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });
};
