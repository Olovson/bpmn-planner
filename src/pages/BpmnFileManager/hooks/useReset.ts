import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateStructureQueries, invalidateArtifactQueries } from '@/lib/queryInvalidation';
import { useResetAndRegenerate } from '@/hooks/useResetAndRegenerate';

export interface UseResetProps {
  setShowResetDialog: (show: boolean) => void;
  setOverlayMessage: (message: string) => void;
  setOverlayDescription: (description: string) => void;
  setShowTransitionOverlay: (show: boolean) => void;
}

export function useReset({
  setShowResetDialog,
  setOverlayMessage,
  setOverlayDescription,
  setShowTransitionOverlay,
}: UseResetProps) {
  const queryClient = useQueryClient();
  const { resetGeneratedData } = useResetAndRegenerate();

  const handleReset = useCallback(async () => {
    setShowResetDialog(false);
    setOverlayMessage('Återställer registret');
    setOverlayDescription('Alla genererade artefakter och jobbkön tas bort (BPMN/DMN-filer behålls).');
    setShowTransitionOverlay(true);
    
    await resetGeneratedData({
      safeMode: true,
      deleteBpmn: false,
      deleteDmn: false,
      deleteDocs: true,
      deleteTests: true,
      deleteReports: true,
      deleteMappings: true,
      deleteAllTables: true,
      deleteGitHub: false,
      deleteTestResults: true,
    });

    invalidateStructureQueries(queryClient);
    invalidateArtifactQueries(queryClient);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['node-test-links'] }),
      queryClient.resetQueries({ queryKey: ['all-files-artifact-coverage'] }, { exact: true }),
      queryClient.resetQueries({ queryKey: ['file-artifact-coverage'] }),
      queryClient.resetQueries({ queryKey: ['process-tree'] }),
      queryClient.resetQueries({ queryKey: ['generation-jobs'] }, { exact: true }),
      queryClient.setQueryData(['generation-jobs'], []),
      queryClient.resetQueries({ queryKey: ['node-matrix'] }),
    ]);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowTransitionOverlay(false);
    setOverlayMessage('');
    setOverlayDescription('');
  }, [
    setShowResetDialog,
    setOverlayMessage,
    setOverlayDescription,
    setShowTransitionOverlay,
    resetGeneratedData,
    queryClient,
  ]);

  return {
    handleReset,
  };
}

