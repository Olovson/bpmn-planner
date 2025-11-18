import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';

export interface SyncResult {
  added: Array<{ file_name: string }>;
  updated: Array<{ file_name: string }>;
  unchanged: Array<{ file_name: string }>;
  orphanedInDb: Array<{ file_name: string }>;
  errors: Array<{ file_name: string; reason: string }>;
}

export const useSyncFromGithub = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-bpmn-from-github', {
        method: 'POST',
      });

      if (error) throw error;
      return data as SyncResult;
    },
    onSuccess: (result) => {
      const totalChanges = result.added.length + result.updated.length;
      
      if (totalChanges > 0) {
        toast({
          title: 'Synk från GitHub slutförd',
          description: `${result.added.length} tillagda, ${result.updated.length} uppdaterade`,
        });
      } else if (result.errors.length > 0) {
        toast({
          title: 'Synk slutförd med fel',
          description: `${result.errors.length} filer misslyckades`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Alla filer är uppdaterade',
          description: 'Inga ändringar behövdes',
        });
      }

      // Invalidate queries to refetch file list and structure
      invalidateStructureQueries(queryClient);
    },
    onError: (error: Error) => {
      toast({
        title: 'Synk misslyckades',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
