/**
 * Hook for handling file generation (artifacts, documentation)
 * 
 * This hook manages:
 * - handleGenerateArtifacts - Generate artifacts for a single file
 * - handleGenerateAllArtifacts - Generate artifacts for all files
 * - handleGenerateSelectedFile - Generate documentation for selected file
 * - Generation state management
 */

import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { DetailedGenerationResult, GenerationScope, AggregatedGenerationResult } from '../types';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { buildHierarchySilently } from '../utils/hierarchyHelpers';
import { createGenerationJob, updateGenerationJob, setJobStatus } from '../utils/jobHelpers';
import { resetGenerationState, checkCancellation, validateFileForGeneration } from '../utils/generationHelpers';
import type { GenerationJob, GenerationOperation, GenerationStatus } from '@/hooks/useGenerationJobs';
import { supabase } from '@/integrations/supabase/client';
import { generateAllFromBpmnWithGraph, type GenerationPhaseKey } from '@/lib/bpmnGenerators';
import { buildBpmnProcessGraph, createGraphSummary, getTestableNodes } from '@/lib/bpmnProcessGraph';
import { getLlmModeConfig, setLlmGenerationMode as persistLlmGenerationMode, type LlmGenerationMode } from '@/lib/llmMode';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import { invalidateArtifactQueries, invalidateStructureQueries } from '@/lib/queryInvalidation';
import type { GenerationPlan, GenerationProgress, GenerationResult } from '@/components/GenerationDialog';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';

const JOB_PHASE_TOTAL = 5; // Base number of phases (graph, hierTests, dor, dependencies, mappings)

export interface UseFileGenerationProps {
  files: BpmnFile[];
  rootFileName: string | null;
  generationMode: LlmGenerationMode;
  llmProvider: LlmProvider;
  getVersionHashForFile: (fileName: string) => Promise<string | null>;
  refreshGenerationJobs: () => void;
  // State setters from parent component
  setGeneratingFile: (fileName: string | null) => void;
  setActiveOperation: (operation: 'llm' | 'hierarchy' | null) => void;
  setShowGenerationDialog: (show: boolean) => void;
  setGenerationPlan: (plan: GenerationPlan | null) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  setGenerationDialogResult: (result: GenerationResult | null) => void;
  setCurrentGenerationStep: (step: { step: string; detail?: string } | null) => void;
  setGraphTotals: (totals: { files: number; nodes: number }) => void;
  setDocgenProgress: (progress: { completed: number; total: number }) => void;
  setDocUploadProgress: (progress: { planned: number; completed: number }) => void;
  setOverlayMessage: (message: string) => void;
  setOverlayDescription: (description: string) => void;
  setShowTransitionOverlay: (show: boolean) => void;
  cancelGenerationRef: React.MutableRefObject<boolean>;
  hasGenerationResultRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  // State getters from parent component (needed for reading current values)
  generationPlan: GenerationPlan | null;
  docgenProgress: { completed: number; total: number };
  currentGenerationStep: { step: string; detail?: string } | null;
  overlayDescription: string;
  setCancelGeneration: (value: boolean) => void;
  // Optional: selectedFile for handleGenerateSelectedFile
  selectedFile?: BpmnFile | null;
}

export interface UseFileGenerationReturn {
  handleGenerateArtifacts: (
    file: BpmnFile,
    mode?: LlmGenerationMode,
    scope?: GenerationScope,
    showReport?: boolean,
    customNodeFilter?: (node: BpmnProcessNode) => boolean,
  ) => Promise<DetailedGenerationResult | null>;
  handleGenerateAllArtifacts: () => Promise<void>;
  handleGenerateSelectedFile: (selectedFile: BpmnFile) => Promise<void>;
}

export function useFileGeneration({
  files,
  rootFileName,
  generationMode,
  llmProvider,
  getVersionHashForFile,
  refreshGenerationJobs,
  setGeneratingFile,
  setActiveOperation,
  setShowGenerationDialog,
  setGenerationPlan,
  setGenerationProgress,
  setGenerationDialogResult,
  setCurrentGenerationStep,
  setGraphTotals,
  setDocgenProgress,
  setDocUploadProgress,
  setOverlayMessage,
  setOverlayDescription,
  setShowTransitionOverlay,
  cancelGenerationRef,
  hasGenerationResultRef,
  abortControllerRef,
  generationPlan,
  docgenProgress,
  currentGenerationStep,
  overlayDescription,
  setCancelGeneration,
  selectedFile,
}: UseFileGenerationProps): UseFileGenerationReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const llmModeDetails = getLlmModeConfig(generationMode);

  // Helper function for logging generation progress
  const logGenerationProgress = useCallback((modeLabel: string, step: string, detail?: string) => {
    setCurrentGenerationStep({ step, detail });
  }, [setCurrentGenerationStep]);

  // Helper function to reset generation state
  const resetGenState = useCallback(() => {
    resetGenerationState({
      setCancelGeneration,
      setCurrentGenerationStep,
      setGraphTotals,
      setDocgenProgress,
      setDocUploadProgress,
      setGenerationPlan,
      setGenerationProgress,
      setGenerationDialogResult,
      cancelGenerationRef,
      hasGenerationResultRef,
      abortControllerRef,
    });
  }, [
    setCancelGeneration,
    setCurrentGenerationStep,
    setGraphTotals,
    setDocgenProgress,
    setDocUploadProgress,
    setGenerationPlan,
    setGenerationProgress,
    setGenerationDialogResult,
    cancelGenerationRef,
    hasGenerationResultRef,
    abortControllerRef,
  ]);

  // Helper function to check cancellation
  const checkCancel = useCallback(() => {
    checkCancellation(cancelGenerationRef);
  }, [cancelGenerationRef]);

  const handleGenerateArtifacts = useCallback(async (
    file: BpmnFile,
    mode: LlmGenerationMode = 'slow',
    scope: GenerationScope = 'file',
    showReport: boolean = true,
    customNodeFilter?: (node: BpmnProcessNode) => boolean,
  ): Promise<DetailedGenerationResult | null> => {
    // Validate file
    const validation = validateFileForGeneration(file);
    if (!validation.valid) {
      toast({
        title: validation.error === 'Endast BPMN-filer stöds för generering' ? 'Ej stödd filtyp' : 'Filen är inte uppladdad än',
        description: validation.error || 'Okänt fel',
        variant: 'destructive',
      });
      return null;
    }

    const generationScope: GenerationScope = scope;
    const modeLabel = mode;
    // Progress model bookkeeping for this run
    let totalGraphFiles = 0;
    let totalGraphNodes = 0;
    let docgenCompleted = 0;
    // OBS: testUploadsPlanned och testUploadsCompleted används inte längre - testgenerering sker i separat steg
    // De behövs fortfarande för progress-tracking (sätts till 0 eftersom vi inte genererar tester här)
    let testUploadsPlanned = 0;
    let testUploadsCompleted = 0;
    let docUploadsPlanned = 0;
    let docUploadsCompleted = 0;
    // Time tracking for estimation
    const generationStartTime = Date.now();
    let lastEstimationUpdate = 0;
    resetGenState();
    const effectiveLlmMode: LlmGenerationMode = 'slow';
    persistLlmGenerationMode(effectiveLlmMode);
    setGeneratingFile(file.file_name);
    setActiveOperation('llm');
    
    // Show dialog immediately (will show plan, then progress, then result)
    setShowGenerationDialog(true);
    
    let activeJob: GenerationJob | null = null;
    let jobProgressCount = 0;
    let jobTotalCount = JOB_PHASE_TOTAL;
    const syncOverlayProgress = (label?: string) => {
      setOverlayMessage(`Steg ${Math.min(jobProgressCount, jobTotalCount)} av ${jobTotalCount}`);
      if (label) {
        setOverlayDescription(label);
      }
    };
    const ensureJobTotal = async (newTotal: number) => {
      if (newTotal <= jobTotalCount) return;
      jobTotalCount = newTotal;
      if (activeJob) {
        await updateGenerationJob(activeJob.id, { total: jobTotalCount });
      }
      syncOverlayProgress();
    };
    const incrementJobProgress = async (label?: string) => {
      jobProgressCount = Math.min(jobProgressCount + 1, jobTotalCount);
      if (activeJob) {
        await updateGenerationJob(activeJob.id, { progress: jobProgressCount });
      }
      syncOverlayProgress(label);
    };

    // Helper för att beräkna tidsestimat
    const calculateTimeEstimate = (): { estimatedTotalTime?: number; estimatedTimeRemaining?: number } => {
      const now = Date.now();
      const elapsedSeconds = (now - generationStartTime) / 1000;
      
      // Beräkna tidsestimat baserat på dokumentationsprogress (den tunga delen)
      if (docgenCompleted > 0 && totalGraphNodes > 0) {
        // Beräkna genomsnittlig tid per nod
        const avgTimePerNode = elapsedSeconds / docgenCompleted;
        // Beräkna förväntad total tid
        const estimatedTotal = avgTimePerNode * totalGraphNodes;
        // Beräkna återstående tid
        const remaining = Math.max(0, estimatedTotal - elapsedSeconds);
        
        // Uppdatera estimatet max var 5:e sekund för att undvika för mycket uppdateringar
        if (now - lastEstimationUpdate > 5000 || lastEstimationUpdate === 0) {
          lastEstimationUpdate = now;
          return {
            estimatedTotalTime: estimatedTotal,
            estimatedTimeRemaining: remaining,
          };
        }
      }
      
      return {};
    };

    // Helper för att uppdatera progress med explicit step/detail (undviker state-delay)
    const updateGenerationProgressWithStep = (step: string, detail?: string) => {
      const totalSteps = jobTotalCount;
      const completedSteps = jobProgressCount;
      // Säkerställ att progress inte överstiger 100%
      const totalProgressPercent = totalSteps > 0 
        ? Math.min(100, Math.round((completedSteps / totalSteps) * 100))
        : 0;
      
      // Bygg detaljer om de inte finns
      let stepDetail = detail;
      if (!stepDetail) {
        // Försök bygga detaljer från progress
        const currentTotal = totalGraphNodes || docgenProgress.total || docgenCompleted;
        if (docgenCompleted > 0 && currentTotal > 0) {
          stepDetail = `Dokumentation: ${docgenCompleted}/${currentTotal} filer`;
        } else if (docUploadsCompleted > 0 && docUploadsPlanned > 0) {
          stepDetail = `Laddar upp: ${docUploadsCompleted}/${docUploadsPlanned} filer`;
        } else if (currentTotal > 0) {
          stepDetail = `Förbereder ${currentTotal} filer`;
        }
      }
      
      // Beräkna tidsestimat
      const timeEstimate = calculateTimeEstimate();
      
      const progress: GenerationProgress = {
        totalProgress: totalProgressPercent,
        currentStep: step,
        currentStepDetail: stepDetail,
        docs: {
          completed: docgenCompleted,
          // Använd faktisk totalGraphNodes (fix total, ändras aldrig efter total:init)
          total: totalGraphNodes || docgenProgress.total || docgenCompleted,
        },
        htmlUpload: {
          completed: docUploadsCompleted,
          total: docUploadsPlanned || 0,
        },
        tests: {
          completed: testUploadsCompleted,
          total: testUploadsPlanned || 0, // Playwright-testfiler har tagits bort
        },
        startTime: generationStartTime,
        ...timeEstimate,
      };
      
      setGenerationProgress(progress);
    };

    const updateGenerationProgress = () => {
      const totalSteps = jobTotalCount;
      const completedSteps = jobProgressCount;
      // Säkerställ att progress inte överstiger 100%
      let totalProgressPercent = totalSteps > 0 
        ? Math.min(100, Math.round((completedSteps / totalSteps) * 100))
        : 0;
      
      // VIKTIGT: Progress ska inte vara 100% om docs inte är klara
      // Detta förhindrar att popupen spinner på 100% medan filer fortfarande genereras
      if (totalGraphNodes > 0 && docgenCompleted < totalGraphNodes) {
        // Max 99% om docs inte är klara
        totalProgressPercent = Math.min(99, totalProgressPercent);
      }
      
      // Bygg en mer informativ currentStep-sträng
      let currentStepText = overlayDescription || 'Förbereder generering';
      if (currentGenerationStep?.step) {
        currentStepText = currentGenerationStep.step;
      }
      
      // Lägg till detaljer om vad som faktiskt pågår
      let stepDetail = currentGenerationStep?.detail;
      if (!stepDetail) {
        // Försök bygga detaljer från progress
        const currentTotal = totalGraphNodes || docgenProgress.total || docgenCompleted;
        if (docgenCompleted > 0 && currentTotal > 0) {
          stepDetail = `Dokumentation: ${docgenCompleted}/${currentTotal} filer`;
        } else if (docUploadsCompleted > 0 && docUploadsPlanned > 0) {
          stepDetail = `Laddar upp: ${docUploadsCompleted}/${docUploadsPlanned} filer`;
        } else if (currentTotal > 0) {
          stepDetail = `Förbereder ${currentTotal} filer`;
        }
      }
      
      // Beräkna tidsestimat
      const timeEstimate = calculateTimeEstimate();
      
      const progress: GenerationProgress = {
        totalProgress: totalProgressPercent,
        currentStep: currentStepText,
        currentStepDetail: stepDetail,
        docs: {
          completed: docgenCompleted,
          // Använd faktisk totalGraphNodes (fix total, ändras aldrig efter total:init)
          total: totalGraphNodes || docgenProgress.total || docgenCompleted,
        },
        htmlUpload: {
          completed: docUploadsCompleted,
          total: docUploadsPlanned || 0,
        },
        tests: {
          completed: testUploadsCompleted,
          total: testUploadsPlanned || 0, // Playwright-testfiler har tagits bort
        },
        startTime: generationStartTime,
        ...timeEstimate,
      };
      
      setGenerationProgress(progress);
    };

    const handleGeneratorPhase = async (phase: GenerationPhaseKey, label: string, detail?: string) => {
      logGenerationProgress(modeLabel, label, detail);
      
      // Uppdatera step direkt (använd en ref för att undvika state-delay)
      let stepText = label;
      let stepDetail = detail;
      
      switch (phase) {
        case 'graph:start':
          stepText = 'Analyserar BPMN-struktur';
          stepDetail = detail;
          syncOverlayProgress(stepText);
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          // Uppdatera progress direkt med step-info
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'graph:complete':
          stepText = 'Processträd klart';
          stepDetail = detail;
          await incrementJobProgress(stepText);
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        // Playwright-testfiler har tagits bort - hier-tests cases används inte längre
        // case 'hier-tests:start':
        // case 'hier-tests:file':
        case 'node-analysis:start':
          stepText = 'Analyserar noder';
          stepDetail = detail;
          syncOverlayProgress(`Analyserar noder (${detail || ''})`);
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'node-analysis:node':
          // Nodanalyser används främst som förberedelse – räkna inte varje nod som ett eget framsteg,
          // utan visa bara status i overlayen.
          stepText = 'Analyserar noder';
          stepDetail = detail;
          syncOverlayProgress(`Analyserar nod: ${detail || ''}`);
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'docgen:start':
          stepText = 'Genererar dokumentation';
          stepDetail = detail;
          syncOverlayProgress(stepText);
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'docgen:file':
          // Här sker den tunga logiken (mallar/LLM per nod), så koppla framsteg till verkligt antal filer.
          // VIKTIGT: Om detail är ett filnamn (slutar med .bpmn eller .html), så är det en fil-markerare, inte en faktisk fil
          // Vi räknar bara faktiska filer (genererade från noder), inte fil-markörer
          const isFileMarker = detail && (detail.endsWith('.bpmn') || detail.endsWith('.html'));
          if (!isFileMarker) {
            docgenCompleted += 1;
          }
          // Använd fix totalGraphNodes (satt från total:init, ändras aldrig)
          // Om totalGraphNodes inte är satt ännu, använd prev.total eller completed som fallback
          setDocgenProgress((prev) => ({
            completed: docgenCompleted,
            total: totalGraphNodes || prev.total || docgenCompleted,
          }));
          stepText = 'Genererar dokumentation';
          // Använd detail om det finns (innehåller nodtyp och namn direkt från reportProgress)
          // Detail kommer från reportProgress och innehåller format: "service tasken: nodeName" eller liknande
          const currentTotal = totalGraphNodes || docgenProgress.total || docgenCompleted;
          if (detail) {
            // Detail är redan formaterat som "service tasken: nodeName" eller liknande
            stepDetail = `Genererar information för ${detail}`;
          } else if (currentTotal > 0) {
            stepDetail = `${docgenCompleted} av ${currentTotal} filer`;
          } else {
            stepDetail = `Bearbetar fil ${docgenCompleted}`;
          }
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          if (currentTotal > 0) {
            await incrementJobProgress(
              `Dokumentation ${docgenCompleted} av ${currentTotal} filer`
            );
          } else {
            await incrementJobProgress(`Dokumentation: ${detail || ''}`);
          }
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'docgen:complete':
          stepText = 'Dokumentation klar';
          stepDetail = detail;
          setCurrentGenerationStep({ step: stepText, detail: stepDetail });
          syncOverlayProgress(stepText);
          // Säkerställ att vi har räknat alla steg
          if (jobProgressCount < jobTotalCount) {
            jobProgressCount = jobTotalCount;
            if (activeJob) {
              await updateGenerationJob(activeJob.id, { progress: jobProgressCount });
            }
          }
          updateGenerationProgressWithStep(stepText, stepDetail);
          break;
        case 'total:init':
          if (detail) {
            try {
              const parsed = JSON.parse(detail) as { files?: number; nodes?: number };
              const extraFiles = Number(parsed.files) || 0;
              const extraNodes = Number(parsed.nodes) || 0;
              totalGraphFiles = extraFiles;
              totalGraphNodes = extraNodes;
              setGraphTotals({ files: extraFiles, nodes: extraNodes });
              setDocgenProgress({ completed: 0, total: extraNodes });
              // Lägg till ett steg per fil och ett steg per nod (docgen),
              // tidiga faser (graf/nodanalyser) förblir en liten del av den totala bilden.
              const extraSteps = extraFiles + extraNodes;
              await ensureJobTotal(JOB_PHASE_TOTAL + extraSteps);
              updateGenerationProgress();
            } catch (error) {
              console.warn('Failed to parse total:init detail', detail);
            }
          }
          break;
        default:
          break;
      }
    };
    syncOverlayProgress('Förbereder generering');
    
    // Automatisk hierarki-byggning: Bygg hierarki automatiskt innan generering
    // Använd root-fil om den finns, annars använd den valda filen
    const hierarchyFile = rootFileName 
      ? files.find(f => f.file_name === rootFileName) || file
      : file;
    
    if (hierarchyFile && hierarchyFile.file_type === 'bpmn' && hierarchyFile.storage_path) {
      // Bygg hierarki tyst i bakgrunden (transparent för användaren)
      try {
        await buildHierarchySilently(hierarchyFile, queryClient);
        // Invalidera queries så att UI uppdateras med ny hierarki
        queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] });
      } catch (error) {
        // Logga felet men fortsätt med generering (hierarki är inte kritiskt)
        console.warn('[handleGenerateArtifacts] Failed to build hierarchy automatically, continuing anyway:', error);
      }
    }
    
    // Build plan if not already built
    if (!generationPlan) {
      try {
        const { data: allFiles } = await supabase
          .from('bpmn_files')
          .select('file_name, file_type, storage_path')
          .eq('file_type', 'bpmn');
        
        const existingBpmnFiles = (allFiles || [])
          .filter(f => !!f.storage_path)
          .map(f => f.file_name);
        
        const isRootFile = rootFileName && file.file_name === rootFileName;
        
        // Kolla om filen är subprocess för att inkludera i plan
        const { data: depsForPlan } = await supabase
          .from('bpmn_dependencies')
          .select('parent_file, child_file')
          .eq('child_file', file.file_name);
        
        const isSubprocess = depsForPlan && depsForPlan.length > 0;
        const parentFile = isSubprocess ? depsForPlan![0].parent_file : null;
        const useHierarchy = isRootFile || (isSubprocess && parentFile);
        
        let plan: GenerationPlan;
        if (useHierarchy && existingBpmnFiles.length > 0) {
          // Bestäm vilka filer som ska inkluderas
          let planFiles: string[];
          if (isRootFile) {
            planFiles = existingBpmnFiles;
          } else if (isSubprocess && parentFile) {
            // Subprocess: inkludera parent + subprocess + siblings
            const parentDeps = await supabase
              .from('bpmn_dependencies')
              .select('child_file')
              .eq('parent_file', parentFile);
            
            const relatedFiles = new Set<string>([parentFile, file.file_name]);
            if (parentDeps.data) {
              parentDeps.data.forEach(dep => {
                if (dep.child_file) relatedFiles.add(dep.child_file);
              });
            }
            planFiles = Array.from(relatedFiles).filter(f => existingBpmnFiles.includes(f));
          } else {
            planFiles = [file.file_name];
          }
          
          const graph = await buildBpmnProcessGraph(file.file_name, planFiles);
          const summary = createGraphSummary(graph);
          const testableNodes = getTestableNodes(graph);
          
          plan = {
            files: summary.filesIncluded,
            totalNodes: testableNodes.length,
            totalFiles: summary.totalFiles,
            hierarchyDepth: summary.hierarchyDepth,
            llmMode: llmModeDetails.label,
            mode: 'llm',
          };
        } else {
          plan = {
            files: [file.file_name],
            totalNodes: 0,
            totalFiles: 1,
            hierarchyDepth: 1,
            llmMode: llmModeDetails.label,
            mode: 'llm',
          };
        }
        setGenerationPlan(plan);
      } catch (error) {
        console.error('Error building generation plan:', error);
      }
    }

    // Skapa ny AbortController för denna generering
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      // Kolla om användaren är autentiserad mot Supabase
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
      }
      const isAuthenticated = !!authData?.session;

      if (!isAuthenticated) {
        // Visa tydligt meddelande och avbryt innan vi börjar skriva något
        toast({
          title: 'Inloggning krävs',
          description: 'Du är inte inloggad i Supabase. Logga in via Auth-sidan för att kunna generera och spara dokumentation och tester till registret.',
          variant: 'destructive',
        });

        console.warn(
          `Skipping artifact generation for ${file.file_name} because user is not authenticated against Supabase.`
        );
        return null;
      }
      checkCancel();
      // Alltid använd 'llm_generation' eftersom vi har tagit bort local generation
      const jobOperation: GenerationOperation = 'llm_generation';
      activeJob = await createGenerationJob(file.file_name, jobOperation, mode);
      checkCancel();
      await setJobStatus(activeJob.id, 'running', {
        started_at: new Date().toISOString(),
        progress: 0,
        total: JOB_PHASE_TOTAL,
      });
      checkCancel();

      // Hämta alla tillgängliga BPMN-filer
      const { data: allFiles, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name, file_type, storage_path')
        .eq('file_type', 'bpmn');

      if (filesError) throw filesError;
      checkCancel();

      const missingUploads = (allFiles || []).filter(f => !f.storage_path).map(f => f.file_name);
      // Only show this warning if showReport is true (single file generation)
      // For batch generation, this is less critical and can be logged instead
      if (showReport && missingUploads.length) {
        toast({
          title: 'BPMN-filer saknar uppladdning',
          description: `Hoppar över ${missingUploads.length} filer som inte finns i Supabase Storage: ${missingUploads.join(', ')}.`,
          variant: 'destructive',
        });
      } else if (!showReport && missingUploads.length) {
        // Log for batch generation instead of showing toast
        console.warn(`[Batch generation] Hoppar över ${missingUploads.length} filer som inte finns i Supabase Storage: ${missingUploads.join(', ')}`);
      }

      const existingBpmnFiles = (allFiles || [])
        .filter(f => !!f.storage_path)
        .map(f => f.file_name);
      const existingDmnFiles: string[] = []; // DMN files kan läggas till senare

      // Logik för att avgöra om hierarki ska användas:
      // 1. Om filen är root-fil: använd hierarki (inkluderar alla subprocesser)
      // 2. Om filen är subprocess: inkludera parent-processer för kontext
      // 3. Annars: generera isolerat (fallback)
      const isRootFile = rootFileName && file.file_name === rootFileName;
      
      // Kolla om filen är en subprocess (har parent i bpmn_dependencies)
      const { data: dependencies } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_file')
        .eq('child_file', file.file_name);
      
      const isSubprocess = dependencies && dependencies.length > 0;
      const parentFile = isSubprocess ? dependencies![0].parent_file : null;
      
      // Använd hierarki om:
      // - Filen är root-fil, ELLER
      // - Filen är subprocess och vi vill inkludera parent-kontext
      const useHierarchy = isRootFile || (isSubprocess && parentFile);

      logGenerationProgress(modeLabel, 'Analyserar BPMN-struktur');
      checkCancel();

      // Generera alla artefakter med hierarkisk analys
      const generationSourceLabel = llmProvider === 'cloud'
        ? 'llm-slow-chatgpt'
        : 'llm-slow-ollama';
      
      // Bestäm vilka filer som ska inkluderas i grafen:
      // - Om root: alla filer (hierarki)
      // - Om subprocess med parent: parent + subprocess (för kontext)
      // - Annars: bara filen själv (isolat)
      let graphFiles: string[];
      if (isRootFile && useHierarchy) {
        // Root-fil: inkludera alla filer i hierarkin
        graphFiles = existingBpmnFiles;
      } else if (isSubprocess && parentFile && useHierarchy) {
        // Subprocess: inkludera parent för kontext
        // Hitta alla filer som är relaterade (parent + subprocess + eventuella siblings)
        const parentDeps = await supabase
          .from('bpmn_dependencies')
          .select('child_file')
          .eq('parent_file', parentFile);
        
        const relatedFiles = new Set<string>([parentFile, file.file_name]);
        if (parentDeps.data) {
          parentDeps.data.forEach(dep => {
            if (dep.child_file) relatedFiles.add(dep.child_file);
          });
        }
        graphFiles = Array.from(relatedFiles).filter(f => existingBpmnFiles.includes(f));
      } else {
        // Isolerat: bara filen själv
        graphFiles = [file.file_name];
      }
      // Automatisk diff-baserad regenerering: skapa filter baserat på olösta diff:er
      // Fallback-strategi: om vi är osäkra (ingen diff-data), regenerera allt
      // Om customNodeFilter finns, använd den istället (t.ex. för User Task epics)
      let nodeFilter: ((node: any) => boolean) | undefined = customNodeFilter;
      
      // Only set up diff-based filter if no custom filter is provided
      if (!customNodeFilter) {
        try {
          const { getAllUnresolvedDiffs, createDiffBasedNodeFilter } = await import('@/lib/bpmnDiffRegeneration');
          const unresolvedDiffs = await getAllUnresolvedDiffs();
          
          if (unresolvedDiffs.size > 0) {
            // Skapa filter som endast inkluderar noder med olösta diff:er (added/modified)
            // Fallback: om ingen diff-data finns för en fil, regenerera allt (säkrast)
            nodeFilter = createDiffBasedNodeFilter(unresolvedDiffs, {
              autoRegenerateChanges: true, // Regenerera added/modified
              autoRegenerateUnchanged: false, // Inte regenerera unchanged (sparar kostnad)
              autoRegenerateRemoved: false, // Inte regenerera removed (de finns inte längre)
            });
            
          } else {
            // Ingen diff-data: fallback till att regenerera allt (säkrast)
          }
        } catch (error) {
          console.warn('[BpmnFileManager] Error setting up diff filter, falling back to regenerate all:', error);
          // Fallback: regenerera allt om diff-logik failar
        }
      }
      
      const result = await generateAllFromBpmnWithGraph(
        file.file_name,
        graphFiles,
        existingDmnFiles,
        useHierarchy,
        true, // useLlm
        handleGeneratorPhase,
        generationSourceLabel,
        llmProvider,
        nodeFilter,
        getVersionHashForFile, // Pass version selection function
        checkCancel, // Pass cancellation check function
        abortSignal, // Pass abort signal for LLM calls
        isRootFile, // Pass flag indicating if this is the actual root file
        false, // forceRegenerate: Skip existing files, only generate missing ones (saves time and cost)
      );
      checkCancel();

      // Only show warnings if showReport is true (single file generation)
      // For batch generation, warnings are collected and shown in the summary
      if (showReport) {
        // Fallback information removed per user request
      }
      const nodeArtifacts = result.nodeArtifacts || [];
      const missingDependencies = result.metadata?.missingDependencies || [];
      const skippedSubprocesses = new Set<string>(result.metadata?.skippedSubprocesses || []);
      if (showReport && skippedSubprocesses.size) {
        const skippedArray = Array.from(skippedSubprocesses);
        const preview = skippedArray.slice(0, 3).join(', ');
        const more = skippedArray.length > 3 ? ` … och ${skippedArray.length - 3} till` : '';
        toast({
          title: 'Ofullständig subprocess-täckning',
          description: `Följande subprocesser saknar BPMN-fil: ${preview}${more}. Artefakter genereras utan dem.`,
          variant: 'destructive',
        });
      }
      // DoR/DoD generering har tagits bort - används inte längre

      // Spara subprocess mappings (dependencies) till databasen.
      // Detta steg är gemensamt för lokal och LLM‑generering men beter sig olika
      // beroende på scope: för node‑scope hoppar vi över global synk och använder
      // endast mappings i minnet.
      const detailedSubprocessMappings: Array<{ callActivity: string; subprocessFile: string }> = [];
      
      logGenerationProgress(modeLabel, 'Synkar subprocess-kopplingar', file.file_name);
      checkCancel();

      // VIKTIGT: Spara subprocess mappings till bpmn_dependencies-tabellen
      // Detta säkerställer att hierarkin kan byggas korrekt senare
      if (result.subprocessMappings.size > 0) {
        const dependenciesToInsert: Array<{ parent_file: string; child_process: string; child_file: string }> = [];
        
        result.subprocessMappings.forEach((childFile, elementId) => {
          if (childFile) {
            // Hitta parent-filen genom att leta efter callActivity i grafen
            // eller använd file.file_name som parent (eftersom callActivity är i den filen)
            dependenciesToInsert.push({
              parent_file: file.file_name,
              child_process: elementId,
              child_file: childFile,
            });
            detailedSubprocessMappings.push({
              callActivity: elementId,
              subprocessFile: childFile,
            });
          }
        });

        if (dependenciesToInsert.length > 0) {
          const { error: depError } = await supabase
            .from('bpmn_dependencies')
            .upsert(dependenciesToInsert, {
              onConflict: 'parent_file,child_process',
              ignoreDuplicates: false,
            });

          if (depError) {
            console.error('[Generation] Error saving subprocess mappings to bpmn_dependencies:', depError);
          } else if (import.meta.env.DEV) {
            console.log(`[Generation] Saved ${dependenciesToInsert.length} subprocess mappings to bpmn_dependencies`);
          }
        }
        checkCancel();
      }

      // Subprocess mappings har redan sparats ovan (rad 774-810)
      // Denna sektion behålls för att samla detailedSubprocessMappings för resultatet
      // men sparandet till databasen sker ovan oavsett scope

      await incrementJobProgress('Synkar subprocess-kopplingar');

      // Spara BPMN element mappings med Jira-information
      // Detta behövs för att listvyn ska kunna visa jira_type och jira_name
      const mappingsToInsert: any[] = [];
      const detailedJiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }> = [];
      
      // Hämta dependencies för att bygga fullständig hierarki
      const { data: allDependencies } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_process, child_file');
      
      const depsMap = new Map<string, { parentFile: string; callActivityName: string }>();
      if (allDependencies) {
        for (const dep of allDependencies) {
          if (dep.child_file) {
            depsMap.set(dep.child_file, {
              parentFile: dep.parent_file,
              callActivityName: dep.child_process,
            });
          }
        }
      }
      
      // Helper: Bygg parentPath rekursivt från dependencies.
      // Robust mot saknade subprocess-filer och eventuella cycles i bpmn_dependencies.
      const buildParentPath = async (
        fileName: string,
        visited: Set<string> = new Set(),
      ): Promise<string[]> => {
        if (visited.has(fileName)) {
          console.warn(
            '[Generation] Cykel upptäckt i bpmn_dependencies när parentPath byggdes för',
            fileName,
          );
          return [];
        }
        visited.add(fileName);

        const dep = depsMap.get(fileName);
        if (!dep) return []; // Toppnivåfil utan registrerad parent

        const parentRoot = dep.parentFile
          .replace('.bpmn', '')
          .replace(/^mortgage-se-/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const capitalizedRoot =
          parentRoot.charAt(0).toUpperCase() + parentRoot.slice(1);

        const grandparentPath = await buildParentPath(dep.parentFile, visited);

        return [...grandparentPath, capitalizedRoot];
      };
      
      // NOTE: Jira-namn (jira_name) genereras INTE här längre.
      // De genereras istället av handleBuildHierarchy() som använder hela ProcessTree
      // och kan bygga korrekta paths. Här skriver vi bara jira_type för noder som saknar det.
      // 
      // Om jira_name behövs, använd "Bygg/uppdatera hierarki från root" först.
      
      if (useHierarchy && result.metadata) {
        // För hierarkiska filer: extrahera jira_type för noder som saknar det
        for (const bpmnFileName of result.metadata.filesIncluded) {
          try {
            const bpmnUrl = `/bpmn/${bpmnFileName}`;
            const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
            
            // Bygg parentPath från dependencies
            const parentPath = await buildParentPath(bpmnFileName);
            const hierarchy = await buildBpmnHierarchy(bpmnFileName, bpmnUrl, parentPath);
            
            // Extrahera alla noder från hierarkin (hierarchy.allNodes är redan en flat lista)
            const allNodes = hierarchy.allNodes;
            
            // Skapa mappings för varje nod (bara jira_type, inte jira_name)
            for (const node of allNodes) {
              mappingsToInsert.push({
                bpmn_file: node.bpmnFile,
                element_id: node.id,
                jira_type: node.jiraType || null,
                // jira_name: INTE satt här - genereras av handleBuildHierarchy istället
              });
              
              if (node.jiraType) {
                detailedJiraMappings.push({
                  elementId: node.id,
                  elementName: node.name,
                  jiraType: node.jiraType,
                  jiraName: '', // Tomt - kommer från handleBuildHierarchy
                });
              }
            }
          } catch (error) {
            console.error(`Error building mappings for ${bpmnFileName}:`, error);
          }
        }
      } else {
        // För icke-hierarkiska filer: bygg basic hierarki för denna fil
        try {
          const bpmnUrl = `/bpmn/${file.file_name}`;
          const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
          
          // Bygg parentPath från dependencies
          const parentPath = await buildParentPath(file.file_name);
          const hierarchy = await buildBpmnHierarchy(file.file_name, bpmnUrl, parentPath);
          
          // Extrahera alla noder från hierarkin (hierarchy.allNodes är redan en flat lista)
          const allNodes = hierarchy.allNodes;
          
          // Skapa mappings för varje nod (bara jira_type, inte jira_name)
          for (const node of allNodes) {
            mappingsToInsert.push({
              bpmn_file: node.bpmnFile,
              element_id: node.id,
              jira_type: node.jiraType || null,
              // jira_name: INTE satt här - genereras av handleBuildHierarchy istället
            });
            
            if (node.jiraType) {
              detailedJiraMappings.push({
                elementId: node.id,
                elementName: node.name,
                jiraType: node.jiraType,
                jiraName: '', // Tomt - kommer från handleBuildHierarchy
              });
            }
          }
        } catch (error) {
          console.error(`Error building mappings for ${file.file_name}:`, error);
        }
      }
      
      if (mappingsToInsert.length > 0) {
        const { error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .upsert(mappingsToInsert, {
            onConflict: 'bpmn_file,element_id',
            ignoreDuplicates: false,
          });

        if (mappingsError) {
          // Check if it's a foreign key constraint error (user_id doesn't exist)
          // This can happen after database reset when user session is invalid
          const isForeignKeyError = mappingsError.code === '23503' || 
            mappingsError.message?.includes('foreign key constraint') ||
            mappingsError.message?.includes('user_id');
          
          if (isForeignKeyError) {
            console.warn('Save element mappings error (user session invalid - mappings saved but version creation skipped):', mappingsError.message);
            // Mappings are still saved, but version creation failed - this is ok
          } else {
            console.error('Save element mappings error:', mappingsError);
          }
        }
      }
      await incrementJobProgress('Bygger Jira-mappningar');

      // OBS: Testgenerering har separerats till ett eget steg (handleGenerateTestsForSelectedFile/handleGenerateTestsForAllFiles)
      // Här genererar vi bara dokumentation, inte tester
      
      await ensureJobTotal(jobTotalCount + result.docs.size);

      // Spara dokumentation till Supabase Storage
      let docsCount = 0;
      const detailedDocFiles: string[] = [];
      
      logGenerationProgress(modeLabel, 'Publicerar dokumentation', file.file_name);
      docUploadsPlanned = result.docs.size;
      docUploadsCompleted = 0;
      setDocUploadProgress({
        planned: docUploadsPlanned,
        completed: 0,
      });
      setOverlayDescription(
        docUploadsPlanned > 0
          ? `Publicerar dokumentation – laddar upp HTML (0 av ${docUploadsPlanned})`
          : 'Publicerar dokumentation – laddar upp HTML'
      );
      checkCancel();

      // Helper function to extract BPMN file from docFileName
      // VIKTIGT: Varje dokument ska använda sin egen BPMN-fils version hash
      const extractBpmnFileFromDocFileName = (docFileName: string, filesIncluded?: string[]): string | null => {
        // For node docs: nodes/{bpmnFile}/{elementId}.html
        const nodeMatch = docFileName.match(/^nodes\/([^\/]+)\/[^\/]+\.html$/);
        if (nodeMatch) {
          const baseName = nodeMatch[1];
          // If it doesn't have .bpmn, add it
          const bpmnFile = baseName.includes('.bpmn') ? baseName : `${baseName}.bpmn`;
          // Verify it's in filesIncluded if available
          if (filesIncluded && !filesIncluded.includes(bpmnFile)) {
            // Try without .bpmn extension
            if (filesIncluded.includes(baseName)) {
              return baseName;
            }
          }
          return bpmnFile;
        }
        
        // For feature goals: feature-goals/{...}.html
        // Feature goals can be:
        // 1. Hierarchical naming (parent-elementId) for callActivities: "mortgage-se-application-internal-data-gathering"
        // 2. Non-hierarchical naming for Process Feature Goals: "mortgage-se-internal-data-gathering"
        // VIKTIGT: För hierarchical naming måste vi hitta subprocess-filen, inte parent-filen
        // eftersom filen sparas under subprocess-filens version hash
        if (docFileName.startsWith('feature-goals/')) {
          const featureGoalName = docFileName.replace('feature-goals/', '').replace('.html', '');
          
          // FIRST: Check if featureGoalName matches a file directly (non-hierarchical Process Feature Goal)
          // For Process Feature Goals, the featureGoalName IS the baseName of the file
          if (filesIncluded && filesIncluded.length > 0) {
            const directMatch = filesIncluded.find(f => {
              const baseName = f.replace('.bpmn', '');
              return baseName === featureGoalName;
            });
            
            if (directMatch) {
              if (import.meta.env.DEV) {
                console.log(`[extractBpmnFileFromDocFileName] Direct match for Process Feature Goal "${featureGoalName}": ${directMatch}`);
              }
              return directMatch;
            }
          }
          
          // Continue with hierarchical matching for callActivities
          if (filesIncluded && filesIncluded.length > 0) {
            // For hierarchical naming (parent-elementId), try to extract elementId
            // Pattern: "mortgage-se-application-internal-data-gathering" eller "test-{timestamp}-test-parent-call-activity-test-call-activity"
            // We want to find the subprocess file that matches the elementId part
            // VIKTIGT: Prioritera subprocess-filen (som slutar med elementId) över parent-filen
            
            // Special handling for test files with timestamps: extract timestamp prefix
            const testTimestampMatch = featureGoalName.match(/^(test-\d+-\d+-)/);
            if (testTimestampMatch) {
              const timestampPrefix = testTimestampMatch[1];
              // For test files, try to find subprocess file with same timestamp prefix
              // Pattern: "test-{timestamp}-{parent}-{elementId}" -> "test-{timestamp}-{subprocess}"
              const partsAfterTimestamp = featureGoalName.substring(timestampPrefix.length).split('-');
              
              // VIKTIGT: För hierarchical naming, elementId är vanligtvis de sista delarna
              // T.ex. "test-xxx-mortgage-se-application-internal-data-gathering" -> elementId = "internal-data-gathering"
              // Subprocess-filen är "test-xxx-mortgage-se-internal-data-gathering.bpmn"
              
              // Try to extract elementId from hierarchical name
              // Pattern: "mortgage-se-application-internal-data-gathering" -> elementId = "internal-data-gathering"
              // We need to find where "mortgage-se-application" ends and elementId begins
              const mortgageSeIndex = partsAfterTimestamp.indexOf('mortgage');
              if (mortgageSeIndex >= 0 && partsAfterTimestamp[mortgageSeIndex + 1] === 'se') {
                // Found "mortgage-se", now find where parent file name ends
                // Parent is typically "mortgage-se-{name}" (e.g., "mortgage-se-application")
                // ElementId starts after parent (e.g., "internal-data-gathering")
                const parentEndIndex = mortgageSeIndex + 3; // After "mortgage-se-{name}"
                if (parentEndIndex < partsAfterTimestamp.length) {
                  const elementId = partsAfterTimestamp.slice(parentEndIndex).join('-');
                  
                  // Now try to find subprocess file that ends with this elementId
                  for (const includedFile of filesIncluded) {
                    const baseName = includedFile.replace('.bpmn', '');
                    // Check if file starts with same timestamp prefix and ends with elementId
                    if (baseName.startsWith(timestampPrefix)) {
                      const baseNameWithoutPrefix = baseName.substring(timestampPrefix.length);
                      // Check if baseName ends with elementId (subprocess file)
                      // T.ex. "mortgage-se-internal-data-gathering" ends with "internal-data-gathering"
                      if (baseNameWithoutPrefix.endsWith(`-${elementId}`) || 
                          baseNameWithoutPrefix === elementId ||
                          baseNameWithoutPrefix.endsWith(`mortgage-se-${elementId}`) ||
                          baseNameWithoutPrefix === `mortgage-se-${elementId}`) {
                        if (import.meta.env.DEV) {
                          console.log(`[extractBpmnFileFromDocFileName] Matched test subprocess file for "${featureGoalName}": ${includedFile} (elementId: ${elementId})`);
                        }
                        return includedFile;
                      }
                    }
                  }
                }
              }
              
              // Fallback: try to find subprocess file using last 2-3 parts as elementId
              const possibleElementIds = [
                partsAfterTimestamp.slice(-3).join('-'), // Last 3 parts (e.g., "internal-data-gathering")
                partsAfterTimestamp.slice(-2).join('-'), // Last 2 parts (e.g., "data-gathering")
              ];
              
              for (const includedFile of filesIncluded) {
                const baseName = includedFile.replace('.bpmn', '');
                // Check if file starts with same timestamp prefix
                if (baseName.startsWith(timestampPrefix)) {
                  const baseNameWithoutPrefix = baseName.substring(timestampPrefix.length);
                  // Check if file ends with elementId (subprocess file)
                  for (const elementId of possibleElementIds) {
                    if (elementId && (
                      baseNameWithoutPrefix.endsWith(`-${elementId}`) || 
                      baseNameWithoutPrefix === elementId ||
                      baseNameWithoutPrefix.endsWith(`mortgage-se-${elementId}`) ||
                      baseNameWithoutPrefix === `mortgage-se-${elementId}`
                    )) {
                      if (import.meta.env.DEV) {
                        console.log(`[extractBpmnFileFromDocFileName] Matched test subprocess file (fallback) for "${featureGoalName}": ${includedFile} (elementId: ${elementId})`);
                      }
                      return includedFile;
                    }
                  }
                }
              }
            }
            
            // Special handling for test files: if featureGoalName contains "parent", look for files with "subprocess"
            if (featureGoalName.includes('parent') && !featureGoalName.includes('subprocess')) {
              for (const includedFile of filesIncluded) {
                const baseName = includedFile.replace('.bpmn', '');
                // For test files, if parent file is in the name, look for corresponding subprocess file
                if (baseName.includes('subprocess') && !baseName.includes('parent')) {
                  // Extract timestamp prefix if present (e.g., "test-{timestamp}-")
                  const parentMatch = featureGoalName.match(/^(test-\d+-\d+-)/);
                  if (parentMatch) {
                    const timestampPrefix = parentMatch[1];
                    // Check if subprocess file has the same timestamp prefix
                    if (baseName.startsWith(timestampPrefix)) {
                      return includedFile;
                    }
                  } else if (baseName.includes('subprocess') && baseName.includes('call-activity')) {
                    // Fallback: if both have "call-activity" but one has "subprocess", use that
                    return includedFile;
                  }
                }
              }
            }
            
            const parts = featureGoalName.split('-');
            if (parts.length > 3) {
              // Likely hierarchical: try to match last 2-3 parts as elementId
              // E.g., "internal-data-gathering" -> "mortgage-se-internal-data-gathering.bpmn"
              const possibleElementId = parts.slice(-3).join('-'); // Last 3 parts (e.g., "internal-data-gathering")
              const possibleElementId2 = parts.slice(-2).join('-'); // Last 2 parts (e.g., "data-gathering")
              
              // PRIORITERA: Först sök efter filer som slutar med elementId (subprocess-filer)
              // Detta är viktigt för att undvika att matcha parent-filen
              const subprocessMatches: string[] = [];
              for (const includedFile of filesIncluded) {
                const baseName = includedFile.replace('.bpmn', '');
                // Check if baseName ends with the elementId (subprocess-fil)
                // T.ex. "mortgage-se-internal-data-gathering" ends with "internal-data-gathering"
                if (baseName.endsWith(`-${possibleElementId}`) || 
                    baseName.endsWith(`-${possibleElementId2}`) ||
                    baseName === `mortgage-se-${possibleElementId}` ||
                    baseName === `mortgage-se-${possibleElementId2}`) {
                  subprocessMatches.push(includedFile);
                }
              }
              
              // Om vi hittade subprocess-filer, returnera den första (bör bara finnas en)
              if (subprocessMatches.length > 0) {
                if (import.meta.env.DEV) {
                  console.log(`[extractBpmnFileFromDocFileName] Matched subprocess file for "${featureGoalName}": ${subprocessMatches[0]}`);
                }
                return subprocessMatches[0];
              }
              
              // VIKTIGT: För test-filer med hierarchical naming, kan vi behöva matcha mot filer
              // som innehåller elementId men inte nödvändigtvis slutar med det
              // T.ex. "test-xxx-mortgage-se-application-internal-data-gathering" -> "test-xxx-mortgage-se-internal-data-gathering.bpmn"
              for (const includedFile of filesIncluded) {
                const baseName = includedFile.replace('.bpmn', '');
                // Check if baseName contains elementId and is likely a subprocess file
                // (not the parent file, which would be shorter)
                if ((baseName.includes(`-${possibleElementId}`) || baseName.includes(`-${possibleElementId2}`)) &&
                    !baseName.includes('application') && // Exclude parent file
                    baseName.length > parts.slice(0, 3).join('-').length) { // Subprocess files are usually longer
                  if (import.meta.env.DEV) {
                    console.log(`[extractBpmnFileFromDocFileName] Matched subprocess file (fallback) for "${featureGoalName}": ${includedFile}`);
                  }
                  return includedFile;
                }
              }
            }
          }
          
          // FALLBACK for Process Feature Goals (non-hierarchical): 
          // If filesIncluded is empty or doesn't contain the file, construct the filename
          // For Process Feature Goals, featureGoalName IS the baseName of the file
          const constructedFileName = `${featureGoalName}.bpmn`;
          if (import.meta.env.DEV) {
            console.log(`[extractBpmnFileFromDocFileName] No match found for "${featureGoalName}", using constructed filename: ${constructedFileName}`);
          }
          return constructedFileName;
        }
        
        // For combined file docs: {bpmnFile}.html (both root and subprocess files)
        // Pattern: "mortgage-se-application.bpmn.html" -> "mortgage-se-application.bpmn"
        if (docFileName.endsWith('.html') && !docFileName.includes('/')) {
          // Remove .html extension and check if it ends with .bpmn
          const withoutHtml = docFileName.replace('.html', '');
          if (withoutHtml.endsWith('.bpmn')) {
            return withoutHtml;
          }
          // If not .bpmn, assume it's a base name and add .bpmn
          return `${withoutHtml}.bpmn`;
        }
        
        return null;
      };

      // Get version hashes for all files that might be in the result
      const versionHashCache = new Map<string, string | null>();
      const getVersionHashForDoc = async (bpmnFileName: string | null): Promise<string | null> => {
        const targetFile = bpmnFileName || file.file_name;
        if (versionHashCache.has(targetFile)) {
          return versionHashCache.get(targetFile) || null;
        }
        
        // Try 1: Use getVersionHashForFile (respects user's version selection)
        let hash = await getVersionHashForFile(targetFile);
        
        // Try 2: If null, try getCurrentVersionHash directly (bypasses version selection)
        if (!hash) {
          try {
            hash = await getCurrentVersionHash(targetFile);
            if (import.meta.env.DEV && hash) {
              console.log(`[BpmnFileManager] Fallback: Got version hash for ${targetFile} via getCurrentVersionHash`);
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(`[BpmnFileManager] Failed to get current version hash for ${targetFile}:`, error);
            }
          }
        }
        
        // Try 3: If still null and it's a subprocess, try root file's hash as last resort
        if (!hash && targetFile !== file.file_name) {
          try {
            const rootHash = await getVersionHashForFile(file.file_name);
            if (rootHash) {
              hash = rootHash;
              if (import.meta.env.DEV) {
                console.log(`[BpmnFileManager] Fallback: Using root file's version hash for subprocess ${targetFile}`);
              }
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(`[BpmnFileManager] Failed to get root file's version hash for fallback:`, error);
            }
          }
        }
        
        versionHashCache.set(targetFile, hash);
        return hash;
      };

      if (result.docs.size > 0) {
        if (import.meta.env.DEV) {
          console.log(`[BpmnFileManager] Uploading ${result.docs.size} docs for ${file.file_name}`);
        }
        // Get filesIncluded from result metadata for better file matching
        const filesIncluded = result.metadata?.filesIncluded || [];
        
        for (const [docFileName, docContent] of result.docs.entries()) {
          checkCancel();
          
          // Extract BPMN file from docFileName
          const docBpmnFile = extractBpmnFileFromDocFileName(docFileName, filesIncluded) || file.file_name;
          const docVersionHash = await getVersionHashForDoc(docBpmnFile);
          
          if (import.meta.env.DEV) {
            if (docBpmnFile !== file.file_name) {
              console.log(`[BpmnFileManager] Doc ${docFileName} belongs to ${docBpmnFile} (not root ${file.file_name})`);
            }
            if (docFileName.startsWith('feature-goals/')) {
              console.log(`[BpmnFileManager] Feature Goal doc "${docFileName}" -> BPMN file: ${docBpmnFile}, version hash: ${docVersionHash}`);
            }
          }
          
          // Validate version hash before proceeding
          if (!docVersionHash) {
            const errorMsg = `Missing version hash for BPMN file "${docBpmnFile}" (doc: ${docFileName}). Cannot upload documentation.`;
            console.error(`[BpmnFileManager] ${errorMsg}`);
            toast({
              title: 'Fel: Saknad version hash',
              description: `Kunde inte hitta version hash för filen "${docBpmnFile}". Dokumentationen kunde inte laddas upp.`,
              variant: 'destructive',
            });
            continue; // Skip this document and continue with others
          }
          
          const { modePath: docPath } = buildDocStoragePaths(
            docFileName,
            effectiveLlmMode ?? null,
            llmProvider,
            docBpmnFile, // Use the extracted BPMN file, not the root file
            docVersionHash // Use the version hash for that specific file
          );
          if (import.meta.env.DEV) {
            console.log(`[BpmnFileManager] Uploading doc: ${docFileName} -> ${docPath}`);
          }
          const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(docPath, htmlBlob, {
              upsert: true,
              contentType: 'text/html; charset=utf-8',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error(`[BpmnFileManager] Error uploading ${docFileName} to ${docPath}:`, uploadError);
          } else {
            if (import.meta.env.DEV) {
              console.log(`[BpmnFileManager] ✓ Successfully uploaded ${docFileName} to ${docPath}`);
            }
            docsCount++;
            detailedDocFiles.push(docFileName);
          }
          checkCancel();
          docUploadsCompleted += 1;
          setDocUploadProgress((prev) => ({
            planned: prev.planned || docUploadsPlanned,
            completed: docUploadsCompleted,
          }));
          const label =
            docUploadsPlanned > 0
              ? `Dokumentation ${docUploadsCompleted} av ${docUploadsPlanned} filer`
              : `Dokumentation: ${docFileName}`;
          await incrementJobProgress(label);
          // Uppdatera progress med detaljerad information
          const uploadDetail = docUploadsPlanned > 0
            ? `Laddar upp: ${docUploadsCompleted}/${docUploadsPlanned} filer`
            : `Laddar upp: ${docFileName}`;
          setCurrentGenerationStep({ step: 'Laddar upp dokumentation', detail: uploadDetail });
          updateGenerationProgressWithStep('Laddar upp dokumentation', uploadDetail);
        }
      }

      // Clear structure change flag after successful generation
      if (file.has_structure_changes) {
        await supabase
          .from('bpmn_files')
          .update({ has_structure_changes: false })
          .eq('file_name', file.file_name);
      }

      // Set generation result for display
      const filesAnalyzed = useHierarchy && result.metadata 
        ? result.metadata.filesIncluded 
        : [file.file_name];
      
      const skippedList = Array.from(skippedSubprocesses);
      const nodeDocCount = nodeArtifacts.filter(a => a.docFileName).length;
      const totalDocCount = nodeDocCount || docsCount;
      // Testgenerering sker i separat steg, så totalTestCount är alltid 0 här
      const totalTestCount = 0;

      const resultMessage: string[] = [];
      {
          resultMessage.push(
            `LLM-provider: ${
              llmProvider === 'cloud'
                ? 'Claude (moln)'
                : 'Ollama (lokal)'
            }`,
          );
      }
      if (useHierarchy && result.metadata) {
        resultMessage.push(`Hierarkisk analys: ${result.metadata.totalFilesAnalyzed} filer`);
      }
      resultMessage.push(`${totalDocCount} dokumentationsfiler`);
      if (skippedList.length) {
        resultMessage.push(`Hoppade över ${skippedList.length} saknade subprocesser`);
      }

      if (showReport) {
        toast({
          title: 'Artefakter genererade!',
          description: resultMessage.join(', '),
        });
      }

      const generationResult: DetailedGenerationResult = {
        fileName: file.file_name,
        filesAnalyzed,
        // Playwright-testfiler har tagits bort
        docFiles: detailedDocFiles,
        jiraMappings: detailedJiraMappings,
        subprocessMappings: detailedSubprocessMappings,
        nodeArtifacts,
        missingDependencies,
        skippedSubprocesses: skippedList,
      };
      
      // Convert to GenerationDialog result format
      const dialogResult: GenerationResult = {
        fileName: file.file_name,
        filesAnalyzed,
        // Playwright-testfiler har tagits bort
        docFiles: detailedDocFiles,
        jiraMappings: detailedJiraMappings.map(jm => ({
          elementName: jm.elementName,
          jiraType: jm.jiraType,
          jiraName: jm.jiraName,
        })),
        subprocessMappings: detailedSubprocessMappings.map(sm => ({
          callActivity: sm.callActivity,
          subprocessFile: sm.subprocessFile,
        })),
        skippedSubprocesses: skippedList,
      };
      
      // Säkerställ att progress är 100% innan vi visar resultatet
      if (jobProgressCount < jobTotalCount) {
        jobProgressCount = jobTotalCount;
        if (activeJob) {
          await updateGenerationJob(activeJob.id, {
            progress: jobProgressCount,
            total: jobTotalCount,
          });
        }
      }
      
      // Visa resultatet omedelbart - detta kommer automatiskt växla dialogen till result-vyn
      hasGenerationResultRef.current = true; // Markera att result finns
      setGenerationDialogResult(dialogResult);
      setGenerationProgress(null); // Clear progress to show result
      
      // GenerationDialog visar redan resultatet i sin result-vy
      syncOverlayProgress('Generering klar');
      
      // Kör async-operationer i bakgrunden (inte blockerande för popupen)
      (async () => {
        try {
          // Mark diffs as resolved for all successfully generated nodes
          // This applies whether we used a diff filter or regenerated everything
          if (nodeArtifacts.length > 0) {
            try {
              const { markDiffsAsResolved } = await import('@/lib/bpmnDiffRegeneration');
              const { data: { user } } = await supabase.auth.getUser();
              
              // Collect all node keys from generated artifacts
              const generatedNodeKeys = nodeArtifacts
                .map(artifact => `${artifact.bpmnFile}::${artifact.elementId}`)
                .filter(Boolean);
              
              if (generatedNodeKeys.length > 0) {
                // Mark diffs as resolved for all files that were included in generation
                const filesToResolve = new Set(nodeArtifacts.map(a => a.bpmnFile));
                for (const fileName of filesToResolve) {
                  const fileNodeKeys = generatedNodeKeys.filter(key => key.startsWith(`${fileName}::`));
                  if (fileNodeKeys.length > 0) {
                    await markDiffsAsResolved(fileName, fileNodeKeys, user?.id);
                  }
                }
              }
            } catch (error) {
              // Don't fail generation if marking diffs as resolved fails
              console.warn('[BpmnFileManager] Error marking diffs as resolved:', error);
            }
          }
          
          if (activeJob) {
            await setJobStatus(activeJob.id, 'succeeded', {
              finished_at: new Date().toISOString(),
              progress: jobProgressCount,
              total: jobTotalCount,
              result: {
                tests: totalTestCount,
                docs: totalDocCount,
                filesAnalyzed,
                mode: 'slow',
                llmProvider: llmProvider,
                missingDependencies,
                skippedSubprocesses: skippedList,
              },
            });
          }

          // Refresh data (structure + artifacts)
          invalidateStructureQueries(queryClient);
          invalidateArtifactQueries(queryClient);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['bpmn-files'] }),
            queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] }),
            queryClient.invalidateQueries({ queryKey: ['file-artifact-coverage'] }),
            queryClient.invalidateQueries({ queryKey: ['all-dor-dod-criteria'] }),
            queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
            queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
            queryClient.invalidateQueries({ queryKey: ['node-test-links'] }),
          ]);
          // Force immediate refetch of files list
          await queryClient.refetchQueries({ queryKey: ['bpmn-files'] });
          
          // Dispatch event to notify other components that artifacts have been updated
          window.dispatchEvent(new CustomEvent('bpmn-artifacts-updated'));
        } catch (error) {
          // Don't fail generation if background operations fail
          console.warn('[BpmnFileManager] Error in background operations:', error);
        }
      })();
      
      return generationResult;
    } catch (error) {
      const isCancelled = error instanceof Error && error.message === 'Avbrutet av användaren';
      const isAuthError = error instanceof Error && (
        error.message?.includes('User from sub claim in JWT does not exist') ||
        error.message?.includes('Din session är ogiltig') ||
        error.message?.includes('Not authenticated')
      );
      
      console.error('Generation error:', error);
      
      if (isAuthError) {
        // Auth error - sign out and prompt user to log in again
        await supabase.auth.signOut();
        toast({
          title: 'Session ogiltig',
          description: 'Din session är ogiltig (troligen efter databasreset). Logga in igen och försök sedan.',
          variant: 'destructive',
          duration: 10000,
        });
      } else {
        toast({
          title: isCancelled ? 'Generering avbruten' : 'Generering misslyckades',
          description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
          variant: isCancelled ? 'default' : 'destructive',
        });
      }
      if (activeJob) {
        await setJobStatus(activeJob.id, isCancelled ? 'cancelled' : 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        });
      }
      if (isCancelled) {
        setOverlayMessage('Generering avbruten');
        setOverlayDescription('Jobbet markerades som avbrutet och resterande steg hoppas över.');
      } else {
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }
      // Stäng generation dialogen oavsett om det var avbrutet eller fel
      setShowGenerationDialog(false);
      return null;
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setActiveOperation(null);
        setShowTransitionOverlay(false);
        // Stäng INTE dialogen om result finns - låt användaren se resultatet
        // Dialogen stängs när användaren klickar på "Stäng" i result-vyn
        // Använd ref för att kolla om result faktiskt sattes
        if (!hasGenerationResultRef.current) {
          setShowGenerationDialog(false);
          resetGenState();
        }
        // Reset ref för nästa generering
        hasGenerationResultRef.current = false;
        setOverlayMessage('');
        setOverlayDescription('');
      }, 200);
    }
  }, [
    toast, files, rootFileName, generationMode, llmProvider, getVersionHashForFile, refreshGenerationJobs, 
    setGeneratingFile, setActiveOperation, setShowGenerationDialog, setGenerationPlan, setGenerationProgress,
    setGenerationDialogResult, setCurrentGenerationStep, setGraphTotals, setDocgenProgress, setDocUploadProgress,
    setOverlayMessage, setOverlayDescription, setShowTransitionOverlay, cancelGenerationRef, hasGenerationResultRef,
    abortControllerRef, queryClient, generationPlan, docgenProgress, currentGenerationStep, overlayDescription,
    llmModeDetails, logGenerationProgress, resetGenState, checkCancel,
  ]);

  // Helper function to resolve root BPMN file
  const resolveRootBpmnFile = useCallback(async (): Promise<BpmnFile | null> => {
    if (!files.length) {
      toast({
        title: 'Inga BPMN-filer',
        description: 'Ladda upp minst en BPMN-fil innan du genererar artefakter.',
        variant: 'destructive',
      });
      return null;
    }

    const allFileRows = files.map((f) => ({ file_name: f.file_name }));
    const { data: deps, error } = await supabase
      .from('bpmn_dependencies')
      .select('parent_file, child_file');

    if (error) {
      console.error('Error fetching dependencies for root selection:', error);
    }

    // Import pickRootBpmnFile dynamically
    const { pickRootBpmnFile } = await import('@/hooks/useRootBpmnFile');
    const rootName = pickRootBpmnFile(allFileRows, deps || []);
    if (!rootName) {
      toast({
        title: 'Kunde inte hitta toppnod',
        description:
          'Systemet kunde inte avgöra en BPMN-rotfil. Kontrollera hierarkin och försök igen.',
        variant: 'destructive',
      });
      return null;
    }

    const rootFile = files.find((f) => f.file_name === rootName) ?? null;
    if (!rootFile) {
      toast({
        title: 'Kunde inte hitta toppnod',
        description: `Rotfilen ${rootName} finns inte i den aktuella fil-listan.`,
        variant: 'destructive',
      });
    }
    return rootFile;
  }, [files, toast]);

  const handleGenerateAllArtifacts = useCallback(async () => {
    const rootFile = await resolveRootBpmnFile();
    const allBpmnFiles = files.filter((f) => f.file_type === 'bpmn');

    if (!allBpmnFiles.length) {
      toast({
        title: 'Inga BPMN-filer',
        description: 'Ladda upp minst en BPMN-fil innan du genererar artefakter.',
        variant: 'destructive',
      });
      return;
    }

    // Automatisk hierarki-byggning: Bygg hierarki automatiskt innan generering
    // Använd root-fil om den finns, annars använd första filen
    const hierarchyFile = rootFile || allBpmnFiles[0];
    
    if (hierarchyFile && hierarchyFile.file_type === 'bpmn' && hierarchyFile.storage_path) {
      // Bygg hierarki tyst i bakgrunden (transparent för användaren)
      try {
        await buildHierarchySilently(hierarchyFile, queryClient);
        // Invalidera queries så att UI uppdateras med ny hierarki
        queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] });
      } catch (error) {
        // Logga felet men fortsätt med generering (hierarki är inte kritiskt)
        console.warn('[handleGenerateAllArtifacts] Failed to build hierarchy automatically, continuing anyway:', error);
      }
    }

    // För "alla filer": Generera EN gång för hela hierarkin istället för att loopa
    // Om vi har root-fil, generera bara för root med useHierarchy = true
    // Detta inkluderar automatiskt alla subprocesser
    if (rootFile) {
      toast({
        title: 'Startar generering för alla filer',
        description: `Genererar dokumentation och DoR/DoD för hela hierarkin med ${rootFile.file_name} som toppfil. Testgenerering sker i separat steg.`,
      });
      
      // Generera EN gång för hela hierarkin
      await handleGenerateArtifacts(rootFile, generationMode, 'file', true);
    } else {
      // Om ingen root-fil finns, loopa över alla filer (fallback)
      toast({
        title: 'Startar generering för alla BPMN-filer',
        description: `Genererar dokumentation och DoR/DoD för ${allBpmnFiles.length} BPMN-filer. Testgenerering sker i separat steg.`,
      });

      // Samla resultat från alla filer
      const aggregatedResult: AggregatedGenerationResult = {
        totalFiles: allBpmnFiles.length,
        allFilesAnalyzed: new Set<string>(),
        // Playwright-testfiler har tagits bort
        allDocFiles: [],
        allJiraMappings: [],
        allSubprocessMappings: [],
        allNodeArtifacts: [],
        allMissingDependencies: [],
        allSkippedSubprocesses: new Set<string>(),
        fileResults: [],
      };

      // Generera för varje fil utan att visa popup
      for (const file of allBpmnFiles) {
        try {
          const result = await handleGenerateArtifacts(file, generationMode, 'file', false);
          if (result) {
            // Aggregera resultat
            result.filesAnalyzed.forEach(f => aggregatedResult.allFilesAnalyzed.add(f));
            // Playwright-testfiler har tagits bort
            aggregatedResult.allDocFiles.push(...result.docFiles);
            aggregatedResult.allJiraMappings.push(...result.jiraMappings);
            aggregatedResult.allSubprocessMappings.push(...result.subprocessMappings);
            if (result.nodeArtifacts) {
              aggregatedResult.allNodeArtifacts.push(...result.nodeArtifacts);
            }
            if (result.missingDependencies) {
              aggregatedResult.allMissingDependencies.push(...result.missingDependencies);
            }
            if (result.skippedSubprocesses) {
              result.skippedSubprocesses.forEach(s => aggregatedResult.allSkippedSubprocesses.add(s));
            }
            aggregatedResult.fileResults.push({ fileName: file.file_name, success: true });
          }
        } catch (error) {
          aggregatedResult.fileResults.push({
            fileName: file.file_name,
            success: false,
            error: error instanceof Error ? error.message : 'Okänt fel',
          });
        }
      }

      // Konvertera till DetailedGenerationResult-format för visning
      const summaryResult: DetailedGenerationResult = {
        fileName: `Alla filer (${aggregatedResult.totalFiles})`,
        filesAnalyzed: Array.from(aggregatedResult.allFilesAnalyzed),
        // Playwright-testfiler har tagits bort
        docFiles: aggregatedResult.allDocFiles,
        jiraMappings: aggregatedResult.allJiraMappings,
        subprocessMappings: aggregatedResult.allSubprocessMappings,
        nodeArtifacts: aggregatedResult.allNodeArtifacts,
        missingDependencies: aggregatedResult.allMissingDependencies,
        skippedSubprocesses: Array.from(aggregatedResult.allSkippedSubprocesses),
      };

      // GenerationDialog visar redan resultatet i sin result-vy
      setGenerationDialogResult({
        fileName: summaryResult.fileName,
        filesAnalyzed: summaryResult.filesAnalyzed,
        // Playwright-testfiler har tagits bort
        docFiles: summaryResult.docFiles,
        jiraMappings: summaryResult.jiraMappings,
        subprocessMappings: summaryResult.subprocessMappings,
        skippedSubprocesses: summaryResult.skippedSubprocesses,
      });
      setGenerationProgress(null); // Clear progress to show result
    }
  }, [files, generationMode, toast, queryClient, resolveRootBpmnFile, handleGenerateArtifacts, buildHierarchySilently, setGenerationDialogResult, setGenerationProgress]);

  const handleGenerateSelectedFile = useCallback(async (selectedFileParam?: BpmnFile) => {
    const fileToUse = selectedFileParam || selectedFile;
    if (!fileToUse) {
      toast({
        title: 'Ingen fil vald',
        description: 'Välj en fil i tabellen först.',
        variant: 'destructive',
      });
      return;
    }

    if (fileToUse.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för generering',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Startar generering',
      description: `Genererar dokumentation för ${fileToUse.file_name} med Slow LLM läge.`,
    });

    await handleGenerateArtifacts(fileToUse, generationMode, 'file');
  }, [selectedFile, generationMode, toast, handleGenerateArtifacts]);

  return {
    handleGenerateArtifacts,
    handleGenerateAllArtifacts,
    handleGenerateSelectedFile,
  };
}


