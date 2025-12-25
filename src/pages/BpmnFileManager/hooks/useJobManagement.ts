import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createGenerationJob, updateGenerationJob, setJobStatus } from '../utils/jobHelpers';
import type { GenerationJob, GenerationOperation, GenerationStatus } from '@/hooks/useGenerationJobs';
import { formatOperationLabel } from '../utils/uiHelpers';

interface UseJobManagementProps {
  generationJobs: GenerationJob[];
}

export function useJobManagement({ generationJobs }: UseJobManagementProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshGenerationJobs = () => {
    queryClient.invalidateQueries({ queryKey: ['generation-jobs'] });
  };

  const createJob = async (
    fileName: string,
    operation: GenerationOperation,
    mode?: 'slow',
  ) => {
    return createGenerationJob(fileName, operation, mode, refreshGenerationJobs);
  };

  const updateJob = async (
    jobId: string,
    updates: Partial<Pick<GenerationJob, 'status' | 'progress' | 'total' | 'result' | 'error' | 'started_at' | 'finished_at'>>
  ) => {
    return updateGenerationJob(jobId, updates, refreshGenerationJobs);
  };

  const setStatus = async (jobId: string, status: GenerationStatus, extra: Record<string, unknown> = {}) => {
    return setJobStatus(jobId, status, extra, refreshGenerationJobs);
  };

  const abortJob = async (job: GenerationJob) => {
    try {
      await updateJob(job.id, {
        status: 'cancelled',
        error: 'Avbruten av användare',
        finished_at: new Date().toISOString(),
      });
      toast({
        title: 'Jobb stoppat',
        description: `${job.file_name} (${formatOperationLabel(job.operation)}) markerat som avbrutet`,
      });
    } catch (error) {
      console.error('Abort job error:', error);
      toast({
        title: 'Kunde inte stoppa jobb',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  return {
    refreshGenerationJobs,
    createJob,
    updateJob,
    setStatus,
    abortJob,
  };
}

