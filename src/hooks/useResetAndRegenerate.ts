import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { invalidateAllBpmnQueries } from '@/lib/queryInvalidation';

interface ResetOptions {
  safeMode?: boolean;
  deleteBpmn?: boolean;
  deleteDmn?: boolean;
  deleteDocs?: boolean;
  deleteTests?: boolean;
  deleteReports?: boolean;
  deleteDorDod?: boolean;
  deleteMappings?: boolean;
  deleteAllTables?: boolean;
  deleteGitHub?: boolean;
  deleteTestResults?: boolean;
}

interface ResetResult {
  success: boolean;
  safeMode: boolean;
  deleted: Record<string, number>;
  preserved: Record<string, number>;
  storage_deleted: number;
  github_deleted: number;
}

interface RegenerationProgress {
  total: number;
  completed: number;
  currentFile: string;
  errors: Array<{ file: string; error: string }>;
}

export const useResetAndRegenerate = () => {
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState<RegenerationProgress | null>(null);
  const { toast } = useToast();

  const resetGeneratedData = async (options: ResetOptions = {}): Promise<ResetResult | null> => {
    try {
      setIsResetting(true);

      const { data, error } = await supabase.functions.invoke('reset-generated-data', {
        body: options,
      });

      if (error) throw error;

      // Clear client-side caches
      if (!options.safeMode) {
        // Full reset: clear all BPMN-related caches
        console.log('Clearing all caches after full reset');
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        
        // Force hard reload after showing toast to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (options.deleteAllTables) {
        // Safe mode with delete all: also clear everything
        console.log('Clearing all caches after safe mode delete all');
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Selective invalidation based on what was deleted
        if (options.deleteDorDod) {
          queryClient.invalidateQueries({ queryKey: ['all-dor-dod-criteria'] });
          queryClient.invalidateQueries({ queryKey: ['dor-dod-status'] });
        }
        if (options.deleteTests) {
          queryClient.invalidateQueries({ queryKey: ['node-test-links'] });
          queryClient.invalidateQueries({ queryKey: ['e2e-scenarios'] });
        }
        if (options.deleteTestResults) {
          queryClient.invalidateQueries({ queryKey: ['test-results'] });
        }
        if (options.deleteDocs) {
          queryClient.invalidateQueries({ queryKey: ['bpmn-docs'] });
        }
        if (options.deleteMappings) {
          queryClient.invalidateQueries({ queryKey: ['bpmn-mappings'] });
          // Also clear localStorage mappings
          localStorage.removeItem('bpmn-node-mappings');
        }
        // Note: BPMN/DMN sources are deleted only in full reset mode. In safe mode we leave caches intact.
      }

      const deletedSummary = Object.entries(data.deleted)
        .map(([key, count]) => `${count} ${key}`)
        .join(', ');

      toast({
        title: options.safeMode ? 'Vald data har rensats' : 'Registret har rensats',
        description: `Borttaget: ${deletedSummary}. Storage: ${data.storage_deleted} filer. GitHub: ${data.github_deleted} filer. Jobbkön rensad och eventuella BPMN/DMN måste laddas upp igen.`,
      });

      return data as ResetResult;
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: 'Reset misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsResetting(false);
      queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] });
    }
  };

  const regenerateAll = async () => {
    try {
      setIsRegenerating(true);

      // Fetch all BPMN files
      const { data: files, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name, storage_path')
        .eq('file_type', 'bpmn')
        .order('file_name');

      if (filesError) throw filesError;

      const totalFiles = files?.length || 0;
      const errors: Array<{ file: string; error: string }> = [];

      setProgress({
        total: totalFiles,
        completed: 0,
        currentFile: '',
        errors: [],
      });

      // List of all BPMN files for matching
      const allBpmnFiles = files?.map(f => f.file_name) || [];
      const dmnFiles: string[] = []; // Add DMN support later if needed

      // Identifiera toppnivåfiler (mortgage.bpmn och andra huvudfiler)
      const topLevelFiles = allBpmnFiles.filter(f => 
        f === 'mortgage.bpmn' || !f.includes('mortgage-se-')
      );

      for (let i = 0; i < totalFiles; i++) {
        const file = files![i];
        
        setProgress(prev => ({
          ...prev!,
          completed: i,
          currentFile: file.file_name,
        }));

        try {
          // Använd hierarkisk generering för toppnivåfiler
          const useHierarchy = topLevelFiles.includes(file.file_name);
          
          console.log(`Generating ${file.file_name} (hierarchy: ${useHierarchy})`);
          
          // Generate all artifacts (med eller utan hierarki)
          // Note: isActualRootFile is undefined here - will be inferred from graphFileScope length
          const result = await generateAllFromBpmnWithGraph(
            file.file_name,
            allBpmnFiles,
            dmnFiles,
            useHierarchy,
            true,
            undefined, // progressCallback
            undefined, // generationSource
            undefined, // llmProvider
            false, // localAvailable
            'v2', // featureGoalTemplateVersion
            undefined, // nodeFilter
            undefined, // getVersionHashForFile
            undefined, // checkCancellation
            undefined, // abortSignal
            undefined, // isActualRootFile - will be inferred
          );

          // Save DoR/DoD
          if (result.dorDod.size > 0) {
            const criteriaToInsert: any[] = [];
            result.dorDod.forEach((criteria, subprocessName) => {
              criteria.forEach(criterion => {
                criteriaToInsert.push({
                  subprocess_name: subprocessName,
                  ...criterion,
                });
              });
            });

            await supabase.from('dor_dod_status').upsert(criteriaToInsert, {
              onConflict: 'subprocess_name,criterion_key,criterion_type',
            });
          }

          // Save test links
          if (result.tests.size > 0) {
            const testLinks: any[] = [];
            // Extract element IDs from test file names
            result.tests.forEach((content, testFileName) => {
              // testFileName format: "element-id.spec.ts"
              const elementId = testFileName.replace('.spec.ts', '');
              testLinks.push({
                bpmn_file: file.file_name,
                bpmn_element_id: elementId,
                test_file_path: `tests/${testFileName}`,
                test_name: elementId, // We don't have element.name here, use ID
              });
            });

            if (testLinks.length > 0) {
              await supabase.from('node_test_links').upsert(testLinks, {
                onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
              });
            }
          }

          // Uppdatera bpmn_files.meta så att processträdet speglar den faktiska BPMN-strukturen
          try {
            const parseResult = await parseBpmnFile(`/bpmn/${file.file_name}`);
            await supabase
              .from('bpmn_files')
              .update({ meta: parseResult.meta })
              .eq('file_name', file.file_name);
          } catch (metaError) {
            console.error(`Error updating meta for ${file.file_name}:`, metaError);
            errors.push({
              file: file.file_name,
              error:
                metaError instanceof Error
                  ? `Kunde inte uppdatera meta: ${metaError.message}`
                  : 'Kunde inte uppdatera meta (okänt fel)',
            });
          }

        } catch (error) {
          console.error(`Error generating for ${file.file_name}:`, error);
          errors.push({
            file: file.file_name,
            error: error instanceof Error ? error.message : 'Okänt fel',
          });
        }
      }

      setProgress(prev => ({
        ...prev!,
        completed: totalFiles,
        currentFile: '',
        errors,
      }));

      toast({
        title: 'Regenerering klar',
        description: `${totalFiles} filer behandlade. ${errors.length} fel uppstod.`,
        variant: errors.length > 0 ? 'destructive' : 'default',
      });

      return { totalFiles, errors };
    } catch (error) {
      console.error('Regeneration error:', error);
      toast({
        title: 'Regenerering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRegenerating(false);
    }
  };

  const resetAndRegenerate = async () => {
    const resetResult = await resetGeneratedData();
    if (!resetResult) return;

    await regenerateAll();
  };

  return {
    resetGeneratedData,
    regenerateAll,
    resetAndRegenerate,
    isResetting,
    isRegenerating,
    progress,
  };
};
