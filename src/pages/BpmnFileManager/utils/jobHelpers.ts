/**
 * Helper functions for generation job management
 */

import { supabase } from '@/integrations/supabase/client';
import type { GenerationJob, GenerationOperation, GenerationStatus } from '@/hooks/useGenerationJobs';

export async function createGenerationJob(
  fileName: string,
  operation: GenerationOperation,
  mode: 'slow' | undefined,
  refreshGenerationJobs?: () => void,
): Promise<GenerationJob> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) {
    throw new Error('Ingen användarsession hittades. Logga in och försök igen.');
  }

  const { data, error } = await supabase
    .from('generation_jobs')
    .insert({
      file_name: fileName,
      operation,
      mode: mode || null,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    const isSchemaModeError =
      typeof error.code === 'string' &&
      error.code === 'PGRST204' &&
      typeof error.message === 'string' &&
      error.message.includes("'mode' column of 'generation_jobs'");

    if (isSchemaModeError) {
      console.warn(
        '[GenerationJobs] generation_jobs.mode saknas i det aktiva schemat – försöker fallback-insert utan mode-kolumn. ' +
          'För full funktionalitet, kör Supabase-migrationerna (t.ex. supabase db reset eller supabase migration up) enligt README.'
      );

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('generation_jobs')
        .insert({
          file_name: fileName,
          operation,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (fallbackError) {
        console.error(
          '[GenerationJobs] Fallback-insert utan mode misslyckades också:',
          fallbackError
        );
        throw new Error(
          'Kolumnen mode saknas på generation_jobs i din lokala Supabase-databas och fallback utan mode misslyckades. ' +
            'Kontrollera din Supabase-instans och kör migrationerna enligt README.'
        );
      }

      refreshGenerationJobs?.();
      return fallbackData as GenerationJob;
    }

    throw error;
  }

  refreshGenerationJobs?.();
  return data as GenerationJob;
}

export async function updateGenerationJob(
  jobId: string,
  updates: Partial<Pick<GenerationJob, 'status' | 'progress' | 'total' | 'result' | 'error' | 'started_at' | 'finished_at'>>,
  refreshGenerationJobs?: () => void,
): Promise<void> {
  const { error } = await supabase
    .from('generation_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error('Failed updating generation job', error);
    throw error;
  } else {
    refreshGenerationJobs?.();
  }
}

export async function setJobStatus(
  jobId: string,
  status: GenerationStatus,
  extra: Record<string, unknown> = {},
  refreshGenerationJobs?: () => void
): Promise<void> {
  await updateGenerationJob(jobId, {
    status,
    ...extra,
  }, refreshGenerationJobs);
}

