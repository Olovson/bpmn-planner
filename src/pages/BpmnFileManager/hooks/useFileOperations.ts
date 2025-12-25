import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import { useDeleteBpmnFile } from '@/hooks/useBpmnFiles';

export interface UseFileOperationsProps {
  files: BpmnFile[];
  setDeletingAll: (deleting: boolean) => void;
  setDeleteProgress: (progress: { current: number; total: number }) => void;
  setShowDeleteAllDialog: (show: boolean) => void;
}

export function useFileOperations({
  files,
  setDeletingAll,
  setDeleteProgress,
  setShowDeleteAllDialog,
}: UseFileOperationsProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteBpmnFile();

  const handleDownload = useCallback(async (file: BpmnFile) => {
    const { data } = await supabase.storage
      .from('bpmn-files')
      .download(file.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const handleDeleteAllFiles = useCallback(async () => {
    if (files.length === 0) return;

    setDeletingAll(true);
    setDeleteProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        await deleteMutation.mutateAsync(files[i].id);
        setDeleteProgress({ current: i + 1, total: files.length });
      }

      toast({
        title: 'Alla filer raderade',
        description: `${files.length} filer har tagits bort från alla lokationer`,
      });

      setShowDeleteAllDialog(false);
    } catch (error) {
      toast({
        title: 'Fel vid radering',
        description: 'Ett fel uppstod när filerna skulle tas bort',
        variant: 'destructive',
      });
    } finally {
      setDeletingAll(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  }, [files, deleteMutation, setDeletingAll, setDeleteProgress, setShowDeleteAllDialog, toast]);

  return {
    handleDownload,
    handleDeleteAllFiles,
  };
}

