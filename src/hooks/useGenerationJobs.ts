import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GenerationOperation = 'hierarchy' | 'generation' | 'local_generation' | 'llm_generation';
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationJob {
  id: string;
  file_name: string;
  operation: GenerationOperation;
  status: GenerationStatus;
  progress: number | null;
  total: number | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const useGenerationJobs = () => {
  return useQuery({
    queryKey: ['generation-jobs'],
    queryFn: async (): Promise<GenerationJob[]> => {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []) as GenerationJob[];
    },
    refetchInterval: 4000,
  });
};
