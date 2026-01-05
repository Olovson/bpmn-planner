/**
 * Custom hook for file upload functionality
 * Handles drag & drop, file selection, and sequential upload
 */

import { useState, useCallback } from 'react';
import { useUploadBpmnFile } from '@/hooks/useBpmnFiles';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';
import { supabase } from '@/integrations/supabase/client';

export interface UseFileUploadReturn {
  dragActive: boolean;
  pendingFiles: File[];
  setPendingFiles: (files: File[]) => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFiles: (fileList: FileList) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
}

export function useFileUpload(
  onMapSuggestions?: (suggestions: any[]) => void,
  onShowMapSuggestionsDialog?: (show: boolean) => void,
  onSetAcceptedSuggestions?: (suggestions: Set<string>) => void,
): UseFileUploadReturn {
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const uploadMutation = useUploadBpmnFile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const analyzeAndSuggestMapUpdates = useCallback(async () => {
    try {
      const { data: filesData, error } = await supabase
        .from('bpmn_files')
        .select('file_name, meta')
        .eq('file_type', 'bpmn');
      
      if (error) throw error;
      
      const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
      const { suggestBpmnMapUpdates, generateUpdatedBpmnMap } = await import('@/lib/bpmn/bpmnMapSuggestions');
      const currentMap = await loadBpmnMapFromStorageSimple();
      const suggestions = await suggestBpmnMapUpdates(currentMap, filesData || []);

      // Möjlig LLM‑refinement av tvetydiga/lågkonfidens‑förslag innan vi visar dem
      let effectiveSuggestions = suggestions.suggestions;
      const useLlmForMapRefinement =
        (import.meta as any).env?.VITE_USE_LLM === 'true';

      if (useLlmForMapRefinement && effectiveSuggestions.length > 0) {
        try {
          const { refineBpmnMapWithLlm } = await import('@/lib/bpmn/bpmnMapLlmRefinement');

          // Bygg en temporär map där alla förslag appliceras heuristiskt,
          // så att LLM kan göra refinement på samma sätt som i orchestratorn.
          const allSuggestionKeys = new Set(
            effectiveSuggestions.map(s => `${s.bpmn_file}::${s.bpmn_id}`)
          );

          const newFilesDataForRefinement = suggestions.newFiles
            .map(fileName => {
              const fileData = filesData?.find(f => f.file_name === fileName);
              return fileData ? { file_name: fileName, meta: fileData.meta } : null;
            })
            .filter(Boolean) as Array<{ file_name: string; meta: any }>;

          const heuristicAppliedMap = generateUpdatedBpmnMap(
            currentMap,
            effectiveSuggestions,
            allSuggestionKeys,
            newFilesDataForRefinement.length > 0 ? newFilesDataForRefinement : undefined,
          );

          const refinedMap = await refineBpmnMapWithLlm(heuristicAppliedMap);

          // Bygg upp en lookup för refined callActivities per (bpmn_file, bpmn_id)
          const refinedLookup = new Map<string, { match_status?: string | null; subprocess_bpmn_file?: string | null }>();
          for (const proc of refinedMap.processes) {
            for (const ca of proc.call_activities || []) {
              const key = `${proc.bpmn_file}::${ca.bpmn_id}`;
              refinedLookup.set(key, {
                match_status: (ca as any).match_status ?? null,
                subprocess_bpmn_file: ca.subprocess_bpmn_file ?? null,
              });
            }
          }

          effectiveSuggestions = effectiveSuggestions.map(s => {
            const key = `${s.bpmn_file}::${s.bpmn_id}`;
            const refined = refinedLookup.get(key);
            if (!refined) return s;

            const updated = { ...s };

            if (refined.subprocess_bpmn_file && refined.subprocess_bpmn_file !== s.suggested_subprocess_bpmn_file) {
              updated.suggested_subprocess_bpmn_file = refined.subprocess_bpmn_file;
              updated.reason = `${s.reason}; Claude-refinement uppdaterade mappningen`;
            }

            if (refined.match_status) {
              updated.matchStatus = refined.match_status as any;
            }

            return updated;
          });
        } catch (e) {
          console.warn('[useFileUpload] LLM refinement for BPMN map suggestions failed:', e);
        }
      }

      // Separera matchningar: hög konfidens (matched) vs tvetydiga/låg konfidens
      const highConfidenceSuggestions = effectiveSuggestions.filter(
        s => s.matchStatus === 'matched'
      );
      const needsReviewSuggestions = effectiveSuggestions.filter(
        s => s.matchStatus !== 'matched'
      );
      
      // Automatiskt acceptera och spara hög konfidens-matchningar
      if (highConfidenceSuggestions.length > 0 || suggestions.newFiles.length > 0) {
        const autoAcceptedKeys = new Set(
          highConfidenceSuggestions.map(s => `${s.bpmn_file}::${s.bpmn_id}`)
        );
        
        // Förbered nya filer för att läggas till
        const newFilesData = suggestions.newFiles
          .map(fileName => {
            const fileData = filesData?.find(f => f.file_name === fileName);
            return fileData ? { file_name: fileName, meta: fileData.meta } : null;
          })
          .filter(Boolean) as Array<{ file_name: string; meta: any }>;
        
        const updatedMap = generateUpdatedBpmnMap(
          currentMap, 
          highConfidenceSuggestions, 
          autoAcceptedKeys,
          newFilesData.length > 0 ? newFilesData : undefined
        );
        
        // Spara automatiskt (utan GitHub-sync som standard)
        const { saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
        const result = await saveBpmnMapToStorage(updatedMap, false);
        
        if (result.success) {
          // Automatically updated bpmn-map.json with high-confidence matches
          
          if (highConfidenceSuggestions.length > 0 || suggestions.newFiles.length > 0) {
            toast({
              title: 'bpmn-map.json uppdaterad automatiskt',
              description: `${highConfidenceSuggestions.length} matchningar accepterades automatiskt${suggestions.newFiles.length > 0 ? `, ${suggestions.newFiles.length} nya filer tillagda` : ''}`,
            });
          }
          
          // Invalidera queries
          invalidateStructureQueries(queryClient);
          await queryClient.invalidateQueries({ queryKey: ['process-tree'] });
          await queryClient.invalidateQueries({ queryKey: ['process-graph'] });
        }
      }
      
      // Visa dialog endast för matchningar som behöver granskning
      if (needsReviewSuggestions.length > 0) {
        // Skicka suggestions med filinformation om callback stödjer det
        if (typeof onMapSuggestions === 'function' && onMapSuggestions.length >= 2) {
          (onMapSuggestions as (suggestions: any[], result?: { totalFiles?: number; hasEnoughFilesForReliableMatching?: boolean }) => void)(
            needsReviewSuggestions,
            {
              totalFiles: suggestions.totalFiles,
              hasEnoughFilesForReliableMatching: suggestions.hasEnoughFilesForReliableMatching,
            }
          );
        } else {
          onMapSuggestions?.(needsReviewSuggestions);
        }
        onShowMapSuggestionsDialog?.(true);
        onSetAcceptedSuggestions?.(new Set());
        
        toast({
          title: 'Granska matchningar',
          description: `${needsReviewSuggestions.length} matchningar behöver manuell granskning (tvetydiga eller låg konfidens)`,
          variant: 'default',
        });
      } else if (suggestions.newFiles.length > 0 && highConfidenceSuggestions.length === 0) {
        // Om det bara är nya filer utan matchningar, visa info
        toast({
          title: 'Nya filer upptäckta',
          description: `${suggestions.newFiles.length} nya filer har lagts till i bpmn-map.json`,
        });
      }
    } catch (error) {
      console.error('[useFileUpload] Error analyzing map updates:', error);
    }
  }, [toast, queryClient, onMapSuggestions, onShowMapSuggestionsDialog, onSetAcceptedSuggestions]);

  const uploadFiles = useCallback(async (files: File[]) => {
    console.debug(`Starting sequential upload of ${files.length} files`);
    
    // Show progress toast for multiple files
    if (files.length > 1) {
      toast({
        title: 'Uppladdning pågår',
        description: `Laddar upp ${files.length} filer...`,
      });
    }
    
    let successCount = 0;
    let failCount = 0;
    const uploadedFileNames: string[] = [];
    
    for (const file of files) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        successCount++;
        uploadedFileNames.push(result?.file?.file_name || file.name);
        console.debug(`Successfully uploaded: ${file.name}`);
      } catch (error) {
        failCount++;
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }
    
    console.debug('All file uploads completed');
    
    // Show summary toast for multiple files
    if (files.length > 1) {
      toast({
        title: 'Uppladdning klar',
        description: `${successCount} filer uppladdade${failCount > 0 ? `, ${failCount} misslyckades` : ''}`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
    }
    
    setPendingFiles([]);
    
    // Analysera och föreslå uppdateringar till bpmn-map.json om BPMN-filer laddades upp
    if (uploadedFileNames.some(name => name.endsWith('.bpmn'))) {
      try {
        await analyzeAndSuggestMapUpdates();
      } catch (error) {
        console.warn('[useFileUpload] Error analyzing map suggestions:', error);
      }
    }
  }, [uploadMutation, toast, analyzeAndSuggestMapUpdates]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).filter(file =>
      file.name.endsWith('.bpmn') || file.name.endsWith('.dmn')
    );

    if (files.length === 0) {
      toast({
        title: 'Inga filer hittades',
        description: 'Inga .bpmn eller .dmn filer hittades i vald mapp eller filer.',
        variant: 'destructive',
      });
      return;
    }

    // For folder uploads with many files, show confirmation
    if (files.length > 10) {
      setPendingFiles(files);
      return;
    }

    await uploadFiles(files);
  }, [toast, uploadFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  return {
    dragActive,
    pendingFiles,
    setPendingFiles,
    handleDrag,
    handleDrop,
    handleFiles,
    uploadFiles,
  };
}
