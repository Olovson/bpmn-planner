import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GenerationOperation = 'hierarchy' | 'generation' | 'local_generation' | 'llm_generation';
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationJob {
  id: string;
  file_name: string;
  operation: GenerationOperation;
  // Mode sätts antingen via egen kolumn i generation_jobs eller via result.mode
  mode?: 'local' | 'slow' | null;
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

      const rows = (data || []) as Array<
        GenerationJob & { result?: { mode?: 'local' | 'slow'; llmProvider?: 'cloud' | 'local' | 'fallback' } }
      >;

      return rows.map((row) => {
        const derivedMode =
          row.mode ??
          (row.result && typeof row.result === 'object'
            ? (row.result.mode as 'local' | 'slow' | undefined)
            : undefined);
        return {
          ...row,
          mode: derivedMode ?? null,
        };
      });
    },
    refetchInterval: 4000,
  });
};
