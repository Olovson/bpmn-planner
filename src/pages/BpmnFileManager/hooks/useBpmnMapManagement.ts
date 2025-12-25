import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';
import type { MapSuggestion } from '@/lib/bpmn/bpmnMapSuggestions';

export interface UseBpmnMapManagementProps {
  setValidatingMap: (validating: boolean) => void;
  setMapValidationResult: (result: any) => void;
  setShowMapValidationDialog: (show: boolean) => void;
  mapSuggestions: MapSuggestion[];
  acceptedSuggestions: Set<string>;
  setBpmnMapValidation: (validation: { valid: boolean; error?: string; details?: string; source?: string } | null) => void;
  setRegeneratingMap: (regenerating: boolean) => void;
  setShowMapSuggestionsDialog: (show: boolean) => void;
}

export function useBpmnMapManagement({
  setValidatingMap,
  setMapValidationResult,
  setShowMapValidationDialog,
  mapSuggestions,
  acceptedSuggestions,
  setBpmnMapValidation,
  setRegeneratingMap,
  setShowMapSuggestionsDialog,
}: UseBpmnMapManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleValidateBpmnMap = useCallback(async () => {
    try {
      setValidatingMap(true);
      setMapValidationResult(null);

      const { data: filesData, error } = await supabase
        .from('bpmn_files')
        .select('file_name, meta')
        .eq('file_type', 'bpmn');

      if (error) {
        console.error('[BpmnFileManager] validate-bpmn-map error', error);
        toast({
          title: 'Validering misslyckades',
          description: error.message || 'Kunde inte hämta BPMN-metadata.',
          variant: 'destructive',
        });
        return;
      }

      const files = filesData ?? [];
      const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
      const currentMap = await loadBpmnMapFromStorageSimple();
      const mapProcesses = currentMap.processes;

      const bpmnFilesSet = new Set<string>(files.map((f: any) => f.file_name));
      const unmappedCallActivities: any[] = [];
      const callActivitiesMissingInMap: any[] = [];
      const missingSubprocessFiles: any[] = [];
      const mapInconsistencies: any[] = [];
      const orphanProcesses: any[] = [];

      const fileMetaByName = new Map<string, any>();
      for (const file of files) {
        fileMetaByName.set(file.file_name, file.meta || {});
      }

      const mapCallsByKey = new Map<string, { proc: any; entry: any }>();
      for (const proc of mapProcesses) {
        const bpmnFile = proc.bpmn_file;
        const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
        for (const ca of calls) {
          if (!ca || !ca.bpmn_id) continue;
          const key = `${bpmnFile}::${ca.bpmn_id}`;
          mapCallsByKey.set(key, { proc, entry: ca });
        }
      }

      for (const proc of mapProcesses) {
        const bpmnFile = proc.bpmn_file;
        const meta = fileMetaByName.get(bpmnFile) || {};
        const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

        if (!bpmnFilesSet.has(bpmnFile)) {
          mapInconsistencies.push({
            type: 'bpmn_file_not_found',
            bpmn_file: bpmnFile,
            process_id: proc.process_id,
          });
          continue;
        }

        const metaProcess =
          processesMeta.find((p: any) => p.id === proc.process_id) ||
          processesMeta[0] ||
          null;

        const metaSubprocesses = Array.isArray(meta.subprocesses) ? meta.subprocesses : [];
        const metaCallActivities =
          (metaProcess?.callActivities as any[]) ||
          (meta.callActivities as any[]) ||
          [];
        const metaTasks =
          (metaProcess?.tasks as any[]) ||
          (meta.tasks as any[]) ||
          [];

        const metaIds = new Set<string>([
          ...metaCallActivities.map((ca: any) => ca.id),
          ...metaSubprocesses.map((sp: any) => sp.id),
          ...metaTasks.map((t: any) => t.id),
        ]);

        const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
        for (const ca of calls) {
          if (!ca || !ca.bpmn_id) continue;

          if (!metaIds.has(ca.bpmn_id)) {
            mapInconsistencies.push({
              type: 'map_bpmn_id_not_in_meta',
              bpmn_file: bpmnFile,
              process_id: proc.process_id,
              bpmn_id: ca.bpmn_id,
            });
          }

          if (ca.subprocess_bpmn_file) {
            if (!bpmnFilesSet.has(ca.subprocess_bpmn_file)) {
              missingSubprocessFiles.push({
                bpmn_file: bpmnFile,
                bpmn_id: ca.bpmn_id,
                subprocess_bpmn_file: ca.subprocess_bpmn_file,
              });
            }
          } else {
            unmappedCallActivities.push({
              bpmn_file: bpmnFile,
              process_id: proc.process_id,
              bpmn_id: ca.bpmn_id,
              name: ca.name || ca.bpmn_id,
              reason: 'subprocess_bpmn_file_missing',
            });
          }
        }
      }

      for (const file of files) {
        const bpmnFile = file.file_name;
        const meta = file.meta || {};
        const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

        for (const procMeta of processesMeta) {
          const procId = procMeta.id || bpmnFile;
          const callActivities = procMeta.callActivities || [];

          for (const ca of callActivities) {
            const key = `${bpmnFile}::${ca.id}`;
            if (!mapCallsByKey.has(key)) {
              callActivitiesMissingInMap.push({
                bpmn_file: bpmnFile,
                process_id: procId,
                bpmn_id: ca.id,
                name: ca.name || ca.id,
              });
            }
          }
        }
      }

      const referencedSubprocessFiles = new Set<string>(
        mapProcesses
          .flatMap((p: any) => p.call_activities || [])
          .map((ca: any) => ca?.subprocess_bpmn_file)
          .filter((f: any) => typeof f === 'string'),
      );

      const rootFileNameFromMap: string | null =
        typeof currentMap.orchestration?.root_process === 'string'
          ? `${currentMap.orchestration.root_process}.bpmn`
          : null;

      for (const file of files) {
        const bpmnFile = file.file_name;
        if (!referencedSubprocessFiles.has(bpmnFile) && bpmnFile !== rootFileNameFromMap) {
          orphanProcesses.push({
            bpmn_file: bpmnFile,
            hint: 'Aldrig refererad som subprocess_bpmn_file i bpmn-map.json',
          });
        }
      }

      const result = {
        generated_at: new Date().toISOString(),
        summary: {
          unmapped_call_activities: unmappedCallActivities.length,
          call_activities_missing_in_map: callActivitiesMissingInMap.length,
          missing_subprocess_files: missingSubprocessFiles.length,
          map_inconsistencies: mapInconsistencies.length,
          orphan_processes: orphanProcesses.length,
        },
        unmapped_call_activities: unmappedCallActivities,
        call_activities_missing_in_map: callActivitiesMissingInMap,
        missing_subprocess_files: missingSubprocessFiles,
        map_inconsistencies: mapInconsistencies,
        orphan_processes: orphanProcesses,
      };

      setMapValidationResult(result);
      setShowMapValidationDialog(true);

      toast({
        title: 'Validering klar',
        description: `Omatchade call activities: ${result.summary.unmapped_call_activities}, saknas i map: ${result.summary.call_activities_missing_in_map}.`,
      });
    } catch (err) {
      console.error('[BpmnFileManager] validate-bpmn-map unexpected error', err);
      toast({
        title: 'Validering misslyckades',
        description: err instanceof Error ? err.message : 'Okänt fel vid BPMN-kartvalidering.',
        variant: 'destructive',
      });
    } finally {
      setValidatingMap(false);
    }
  }, [setValidatingMap, setMapValidationResult, setShowMapValidationDialog, toast]);

  const handleSaveUpdatedMap = useCallback(async (syncToGitHub: boolean = false) => {
    try {
      const { loadBpmnMapFromStorageSimple, saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const { generateUpdatedBpmnMap } = await import('@/lib/bpmn/bpmnMapSuggestions');
      const currentMap = await loadBpmnMapFromStorageSimple();
      const updatedMap = generateUpdatedBpmnMap(currentMap, mapSuggestions, acceptedSuggestions, undefined);
      
      const result = await saveBpmnMapToStorage(updatedMap, syncToGitHub);
      
      if (result.success) {
        toast({
          title: 'bpmn-map.json uppdaterad',
          description: result.githubSynced
            ? 'Filen har uppdaterats i Supabase storage och synkats till GitHub.'
            : 'Filen har uppdaterats i Supabase storage.',
        });
        
        // Invalidera queries så att ny mappning laddas
        invalidateStructureQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        await queryClient.invalidateQueries({ queryKey: ['process-graph'] });
        
        setShowMapSuggestionsDialog(false);
      } else {
        toast({
          title: 'Uppdatering misslyckades',
          description: result.error || 'Kunde inte spara bpmn-map.json',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[BpmnFileManager] Error saving map:', error);
      toast({
        title: 'Uppdatering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  }, [mapSuggestions, acceptedSuggestions, queryClient, setShowMapSuggestionsDialog, toast]);

  const handleRegenerateBpmnMap = useCallback(async () => {
    try {
      setRegeneratingMap(true);
      
      const { generateBpmnMapFromFiles } = await import('@/lib/bpmn/bpmnMapAutoGenerator');
      const generatedMap = await generateBpmnMapFromFiles();
      
      const { saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const result = await saveBpmnMapToStorage(generatedMap, false);
      
      if (result.success) {
        toast({
          title: 'bpmn-map.json genererad',
          description: `Map genererad från ${generatedMap.processes.length} processer. ${generatedMap.processes.reduce((sum, p) => sum + (p.call_activities?.filter(ca => ca.needs_manual_review).length || 0), 0)} matchningar behöver granskning.`,
        });
        
        // Invalidera queries och validera map igen
        invalidateStructureQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        await queryClient.invalidateQueries({ queryKey: ['process-graph'] });
        
        // Validera map igen
        const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
        const validationResult = await loadBpmnMapFromStorage();
        setBpmnMapValidation({
          valid: validationResult.valid,
          error: validationResult.error,
          details: validationResult.details,
          source: validationResult.source,
        });
      } else {
        toast({
          title: 'Generering misslyckades',
          description: result.error || 'Kunde inte spara den genererade map:en',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[BpmnFileManager] Error regenerating map:', error);
      toast({
        title: 'Generering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingMap(false);
    }
  }, [setRegeneratingMap, queryClient, setBpmnMapValidation, toast]);

  const handleExportUpdatedMap = useCallback(async () => {
    // Fallback: exportera som fil om användaren vill ha det manuellt
    const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
    const { generateUpdatedBpmnMap } = await import('@/lib/bpmn/bpmnMapSuggestions');
    const currentMap = await loadBpmnMapFromStorageSimple();
    const updatedMap = generateUpdatedBpmnMap(currentMap, mapSuggestions, acceptedSuggestions, undefined);
    
    const jsonStr = JSON.stringify(updatedMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bpmn-map-updated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'bpmn-map.json exporterad',
      description: 'Den uppdaterade filen har laddats ner.',
    });
  }, [mapSuggestions, acceptedSuggestions, toast]);

  return {
    handleValidateBpmnMap,
    handleSaveUpdatedMap,
    handleRegenerateBpmnMap,
    handleExportUpdatedMap,
  };
}

