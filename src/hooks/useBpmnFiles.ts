import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { invalidateStructureQueries, invalidateArtifactQueries } from '@/lib/queryInvalidation';
import { calculateAndSaveDiff } from '@/lib/bpmnDiffRegeneration';

export interface BpmnFileUsage {
  testsCount: number;
}

export interface BpmnFile {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: 'bpmn' | 'dmn';
  size_bytes: number | null;
  github_synced: boolean;
  has_structure_changes?: boolean;
  last_updated_at: string;
  created_at: string;
  usage?: BpmnFileUsage;
}

export const useBpmnFiles = () => {
  return useQuery({
    queryKey: ['bpmn-files'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-bpmn-files');
      if (error) throw error;
      return data.files as BpmnFile[];
    },
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useUploadBpmnFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-bpmn-file', {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      invalidateStructureQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] });
      // Force refetch of bpmn-files immediately
      await queryClient.refetchQueries({ queryKey: ['bpmn-files'] });

      // Calculate and save diff for the uploaded file
      if (data?.file?.file_name && data?.file?.file_type === 'bpmn') {
        try {
          // Fetch the file content from storage
          const { data: fileContent, error: contentError } = await supabase.storage
            .from('bpmn-files')
            .download(data.file.file_name);

          if (!contentError && fileContent) {
            const content = await fileContent.text();
            const meta = data.file.meta;

            // Calculate and save diff
            const diffResult = await calculateAndSaveDiff(
              data.file.file_name,
              content,
              meta
            );

            if (diffResult.diffCount > 0) {
              console.log(`[useBpmnFiles] Calculated diff for ${data.file.file_name}:`, {
                added: diffResult.added,
                removed: diffResult.removed,
                modified: diffResult.modified,
              });
            }
          }
        } catch (diffError) {
          // Don't fail the upload if diff calculation fails
          console.error('[useBpmnFiles] Error calculating diff:', diffError);
        }
      }

      toast({
        title: 'Fil uppladdad',
        // GitHub-sync är idag frivillig och ofta inaktiv; vi visar bara ett neutralt
        // meddelande för att undvika brus när GitHub inte används.
        description: 'Filen har laddats upp.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Uppladdning misslyckades',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteBpmnFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-bpmn-file', {
        body: { id: fileId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidera alla queries som kan försöka ladda den raderade filen
      invalidateStructureQueries(queryClient);
      invalidateArtifactQueries(queryClient);
      // Invalidera specifikt coverage queries som kan försöka ladda filerna
      queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['file-artifact-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['node-matrix'] });

      toast({
        title: 'Fil borttagen',
        // GitHub-sync används inte längre som primär kanal; vi ger ett neutralt
        // meddelande så att avsaknad av GitHub-konfiguration inte upplevs som fel.
        description: 'Filen har tagits bort.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Borttagning misslyckades',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
