import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';

export interface BpmnFileUsage {
  dorDodCount: number;
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
    onSuccess: (data) => {
      invalidateStructureQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] });

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
      invalidateStructureQueries(queryClient);

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
