/**
 * Hook for handling test generation
 * 
 * This hook manages:
 * - handleGenerateTestsForSelectedFile - Generate tests for selected file
 * - handleGenerateTestsForAllFiles - Generate tests for all files
 * - Test generation state management
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import { generateTestsForFile, generateTestsForAllFiles } from '@/lib/testGenerators';
import { getLlmModeConfig, type LlmGenerationMode } from '@/lib/llmMode';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { getDefaultLlmProvider } from '@/lib/llmClients';
import { buildHierarchySilently } from '../utils/hierarchyHelpers';
import { invalidateArtifactQueries, invalidateStructureQueries } from '@/lib/queryInvalidation';
import { pickRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { supabase } from '@/integrations/supabase/client';
import type { GenerationProgress, GenerationResult } from '@/components/GenerationDialog';

export interface UseTestGenerationProps {
  files: BpmnFile[];
  rootFileName: string | null;
  generationMode: LlmGenerationMode;
  selectedFile: BpmnFile | null;
  // State setters from parent component
  setGeneratingFile: (fileName: string | null) => void;
  setCurrentGenerationStep: (step: { step: string; detail?: string } | null) => void;
  // GenerationDialog state setters
  setShowGenerationDialog: (show: boolean) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  setGenerationDialogResult: (result: GenerationResult | null) => void;
}

export interface UseTestGenerationReturn {
  handleGenerateTestsForSelectedFile: () => Promise<void>;
  handleGenerateTestsForAllFiles: () => Promise<void>;
}

/**
 * Resolve root BPMN file from files and dependencies
 */
async function resolveRootBpmnFile(
  files: BpmnFile[],
  toast: ReturnType<typeof useToast>['toast'],
): Promise<BpmnFile | null> {
  if (!files.length) {
    toast({
      title: 'Inga BPMN-filer',
      description: 'Ladda upp minst en BPMN-fil innan du genererar artefakter.',
      variant: 'destructive',
    });
    return null;
  }

  try {
    const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
    const { resolveRootBpmnFileFromMap } = await import('@/lib/bpmn/bpmnMapLoader');
    const bpmnMapResult = await loadBpmnMapFromStorage();
    if (bpmnMapResult.valid && bpmnMapResult.map) {
      const rootFromMap = resolveRootBpmnFileFromMap(bpmnMapResult.map);
      if (rootFromMap) {
        const rootFromMapFile = files.find((f) => f.file_name === rootFromMap) ?? null;
        if (rootFromMapFile) {
          return rootFromMapFile;
        }
      }
    }
  } catch (error) {
    console.warn('[resolveRootBpmnFile] Could not load bpmn-map root, falling back to dependencies:', error);
  }

  const allFileRows = files.map((f) => ({ file_name: f.file_name }));
  const { data: deps, error } = await supabase
    .from('bpmn_dependencies')
    .select('parent_file, child_file');

  if (error) {
    console.error('Error fetching dependencies for root selection:', error);
  }

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
}

async function resolveRootBpmnFileNameFromMap(): Promise<string | null> {
  try {
    const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
    const { resolveRootBpmnFileFromMap } = await import('@/lib/bpmn/bpmnMapLoader');
    const bpmnMapResult = await loadBpmnMapFromStorage();
    if (bpmnMapResult.valid && bpmnMapResult.map) {
      return resolveRootBpmnFileFromMap(bpmnMapResult.map);
    }
  } catch (error) {
    console.warn('[resolveRootBpmnFileNameFromMap] Could not load bpmn-map root:', error);
  }
  return null;
}

export function useTestGeneration({
  files,
  rootFileName,
  generationMode,
  selectedFile,
  setGeneratingFile,
  setCurrentGenerationStep,
  setShowGenerationDialog,
  setGenerationProgress,
  setGenerationDialogResult,
}: UseTestGenerationProps): UseTestGenerationReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGenerateTestsForSelectedFile = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: 'Ingen fil vald',
        description: 'Välj en fil i tabellen först.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för testgenerering',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedFile.storage_path) {
      toast({
        title: 'Filen är inte uppladdad än',
        description: 'Ladda upp BPMN-filen innan du genererar tester.',
        variant: 'destructive',
      });
      return;
    }

    // Automatisk hierarki-byggning: Bygg hierarki automatiskt innan testgenerering
    // Använd root-fil om den finns, annars använd den valda filen
    const hierarchyFile = rootFileName 
      ? files.find(f => f.file_name === rootFileName) || selectedFile
      : selectedFile;
    
    if (hierarchyFile && hierarchyFile.file_type === 'bpmn' && hierarchyFile.storage_path) {
      // Bygg hierarki tyst i bakgrunden (transparent för användaren)
      try {
        await buildHierarchySilently(hierarchyFile, queryClient);
        // Invalidera queries så att UI uppdateras med ny hierarki
        queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] });
      } catch (error) {
        // Logga felet men fortsätt med testgenerering (hierarki är inte kritiskt)
        // Failed to build hierarchy automatically, continuing anyway
      }
    }

    // Hämta alla filer i hierarkin från bpmn_dependencies
    // Detta säkerställer att vi genererar testinfo för hela kedjan
    const getAllFilesInHierarchy = async (startFile: string): Promise<string[]> => {
      const hierarchyFiles = new Set<string>([startFile]);
      
      // Hämta alla children rekursivt från filen
      const getChildrenRecursively = async (parent: string) => {
        const { data: children } = await supabase
          .from('bpmn_dependencies')
          .select('child_file')
          .eq('parent_file', parent);
        
        if (children) {
          for (const child of children) {
            if (child.child_file && files.some(f => f.file_name === child.child_file)) {
              if (!hierarchyFiles.has(child.child_file)) {
                hierarchyFiles.add(child.child_file);
                // Rekursivt hämta children till children
                await getChildrenRecursively(child.child_file);
              }
            }
          }
        }
      };
      
      // Hämta alla parents rekursivt från filen
      const getParentsRecursively = async (child: string) => {
        const { data: parents } = await supabase
          .from('bpmn_dependencies')
          .select('parent_file')
          .eq('child_file', child);
        
        if (parents) {
          for (const parent of parents) {
            if (parent.parent_file && files.some(f => f.file_name === parent.parent_file)) {
              if (!hierarchyFiles.has(parent.parent_file)) {
                hierarchyFiles.add(parent.parent_file);
                // Rekursivt hämta parents till parents
                await getParentsRecursively(parent.parent_file);
              }
            }
          }
        }
      };
      
      await getChildrenRecursively(startFile);
      await getParentsRecursively(startFile);
      
      const result = Array.from(hierarchyFiles);
      
      // FALLBACK: Om hierarkin inte är byggd ännu (bara en fil hittades) och det finns fler filer,
      // använd alla BPMN-filer som fallback för att säkerställa att vi genererar för hela kedjan
      if (result.length === 1 && files.filter(f => f.file_type === 'bpmn').length > 1) {
        if (import.meta.env.DEV) {
          // Hierarchy not built yet, using all BPMN files as fallback
        }
        // Använd alla BPMN-filer som fallback
        return files.filter(f => f.file_type === 'bpmn').map(f => f.file_name);
      }
      
      return result;
    };

    // FORBÄTTRING: Explicit LLM-tillgänglighetskontroll
    const { isLlmEnabled } = await import('@/lib/llmClient');
    if (!isLlmEnabled()) {
      toast({
        title: 'LLM inte tillgängligt',
        description: 'Aktivera LLM för att generera tester. Testgenerering kräver LLM för att generera E2E scenarios.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingFile(selectedFile.file_name);
    const llmProvider = getDefaultLlmProvider();

    if (!llmProvider) {
      toast({
        title: 'LLM provider saknas',
        description: 'Kunde inte hitta LLM provider. Kontrollera LLM-konfigurationen.',
        variant: 'destructive',
      });
      return;
    }

    // Hämta alla filer i hierarkin
    const allFilesInHierarchy = await getAllFilesInHierarchy(selectedFile.file_name);
    
    // Root-fil-detektering: föredra bpmn-map.json om den finns.
    // Om bpmn-map saknas, använd tidigare heuristik.
    let isRootFile = false;
    const rootFromMap = await resolveRootBpmnFileNameFromMap();
    if (rootFromMap) {
      isRootFile = selectedFile.file_name === rootFromMap;
    } else if (rootFileName && selectedFile.file_name === rootFileName) {
      isRootFile = true;
    } else if (allFilesInHierarchy.length > 0 && allFilesInHierarchy[0] === selectedFile.file_name) {
      // Kolla om filen finns som child i dependencies
      const { data: asChild } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file')
        .eq('child_file', selectedFile.file_name)
        .limit(1);
      
      // Om filen inte finns som child, är den troligen root
      isRootFile = !asChild || asChild.length === 0;
    } else if (allFilesInHierarchy.length === 1) {
      // Om bara en fil i hierarkin, är den root
      isRootFile = true;
    }

    // Show generation dialog immediately
    setShowGenerationDialog(true);
    const startTime = Date.now();

    try {
      // Initialize progress
      setGenerationProgress({
        totalProgress: 0,
        currentStep: 'Förbereder testgenerering...',
        docs: { completed: 0, total: 0 },
        htmlUpload: { completed: 0, total: 0 },
        tests: { completed: 0, total: 0 },
        startTime,
      });

      const result = await generateTestsForFile(
        selectedFile.file_name,
        llmProvider,
        (progress) => {
          // Update both currentGenerationStep (for TransitionOverlay) and GenerationProgress (for GenerationDialog)
          setCurrentGenerationStep({
            step: `Genererar tester: ${progress.currentElement || '...'}`,
            detail: `${progress.current}/${progress.total} noder`,
          });

          // Calculate progress percentage
          const progressPercent = progress.total > 0 
            ? Math.round((progress.current / progress.total) * 100)
            : 0;

          // Map status to step text
          let stepText = 'Förbereder...';
          if (progress.status === 'parsing') {
            stepText = 'Parsar BPMN-fil...';
          } else if (progress.status === 'generating') {
            stepText = `Genererar tester: ${progress.currentElement || '...'}`;
          } else if (progress.status === 'uploading') {
            stepText = 'Laddar upp tester...';
          } else if (progress.status === 'complete') {
            stepText = 'Klar!';
          }

          setGenerationProgress({
            totalProgress: progressPercent,
            currentStep: stepText,
            currentStepDetail: `${progress.current}/${progress.total} steg`,
            docs: { completed: 0, total: 0 },
            htmlUpload: { completed: 0, total: 0 },
            tests: { completed: progress.current, total: progress.total },
            startTime,
          });
          },
          undefined, // checkCancellation
          undefined, // abortSignal
          allFilesInHierarchy.length > 1, // useHierarchy: true om det finns fler filer i hierarkin
          allFilesInHierarchy, // existingBpmnFiles: alla filer i hierarkin
          isRootFile, // isActualRootFile: true om detta är root-filen
        );

      // Convert TestGenerationResult to GenerationResult format
      const dialogResult: GenerationResult = {
        fileName: selectedFile.file_name,
        filesAnalyzed: result.filesGenerated || allFilesInHierarchy, // Använd filesGenerated från resultatet
        docFiles: [],
        jiraMappings: [],
        subprocessMappings: [],
        testScenarios: result.totalScenarios,
        e2eScenarios: result.e2eScenarios,
        featureGoalScenarios: result.featureGoalScenarios,
        e2eScenarioDetails: result.e2eScenarioDetails,
        featureGoalScenarioDetails: result.featureGoalScenarioDetails,
        warnings: result.warnings,
        missingDocumentation: result.missingDocumentation,
        e2eGenerationErrors: result.e2eGenerationErrors,
        featureGoalTestErrors: result.featureGoalTestErrors,
      };

      // Show result in dialog
      setGenerationProgress(null);
      setGenerationDialogResult(dialogResult);

      // Also show toast for quick feedback
      toast({
        title: 'Testgenerering klar',
        description: `Genererade ${result.totalScenarios || 0} E2E-scenarios för ${selectedFile.file_name}.`,
      });

      if (result.missingDocumentation && result.missingDocumentation.length > 0) {
        const missingNames = result.missingDocumentation
          .map(d => d.elementName || d.elementId)
          .slice(0, 3)
          .join(', ');
        const moreText = result.missingDocumentation.length > 3 
          ? ` och ${result.missingDocumentation.length - 3} fler` 
          : '';
        toast({
          title: 'Dokumentation saknas',
          description: `Dokumentation saknas för ${result.missingDocumentation.length} nod(er): ${missingNames}${moreText}. Generera dokumentation först.`,
          variant: 'destructive',
        });
      }

      // Visa alla fel och varningar på ett användarvänligt sätt
      const hasErrors = result.errors.length > 0 || 
                       (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) ||
                       (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0);
      const hasWarnings = result.warnings && result.warnings.length > 0;

      if (hasErrors) {
        const errorCount = result.errors.length + 
                          (result.e2eGenerationErrors?.length || 0) + 
                          (result.featureGoalTestErrors?.length || 0);
        
        let errorDetails: string[] = [];
        
        if (result.errors.length > 0) {
          const preview = result.errors.slice(0, 2).map(e => e.elementName || e.elementId).join(', ');
          const more = result.errors.length > 2 ? ` … och ${result.errors.length - 2} fler` : '';
          errorDetails.push(`Allmänna fel (${result.errors.length}): ${preview}${more}`);
        }
        
        if (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) {
          const preview = result.e2eGenerationErrors.slice(0, 2).map(e => e.path).join(', ');
          const more = result.e2eGenerationErrors.length > 2 ? ` … och ${result.e2eGenerationErrors.length - 2} fler` : '';
          errorDetails.push(`E2E-generering (${result.e2eGenerationErrors.length}): ${preview}${more}`);
        }
        
        if (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0) {
          const preview = result.featureGoalTestErrors.slice(0, 2).map(e => e.callActivityId).join(', ');
          const more = result.featureGoalTestErrors.length > 2 ? ` … och ${result.featureGoalTestErrors.length - 2} fler` : '';
          errorDetails.push(`Feature Goal-tester (${result.featureGoalTestErrors.length}): ${preview}${more}`);
        }
        
        toast({
          title: `Testgenerering misslyckades (${errorCount} fel)`,
          description: errorDetails.join(' | '),
          variant: 'destructive',
          duration: 10000,
        });
      }

      if (hasWarnings) {
        const warningPreview = result.warnings!.slice(0, 2).join(', ');
        const moreWarnings = result.warnings!.length > 2 ? ` … och ${result.warnings!.length - 2} fler` : '';
        toast({
          title: `Varningar (${result.warnings!.length})`,
          description: `${warningPreview}${moreWarnings}`,
          variant: 'default',
          duration: 8000,
        });
      }

      // Invalidera queries för att uppdatera UI
      invalidateStructureQueries(queryClient);
      invalidateArtifactQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['bpmn-files'] });
      await queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] });
      await queryClient.invalidateQueries({ queryKey: ['file-artifact-coverage'] });
    } catch (error) {
      // Hide dialog on error
      setShowGenerationDialog(false);
      setGenerationProgress(null);
      setGenerationDialogResult(null);
      
      toast({
        title: 'Testgenerering misslyckades',
        description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFile(null);
      setCurrentGenerationStep(null);
    }
  }, [
    selectedFile,
    rootFileName,
    files,
    generationMode,
    setGeneratingFile,
    setCurrentGenerationStep,
    setShowGenerationDialog,
    setGenerationProgress,
    setGenerationDialogResult,
    toast,
    queryClient,
  ]);

  const handleGenerateTestsForAllFiles = useCallback(async () => {
    const allBpmnFiles = files.filter((f) => f.file_type === 'bpmn');

    if (allBpmnFiles.length === 0) {
      toast({
        title: 'Inga BPMN-filer',
        description: 'Ladda upp minst en BPMN-fil innan du genererar tester.',
        variant: 'destructive',
      });
      return;
    }

    // FORBÄTTRING: Explicit LLM-tillgänglighetskontroll
    const { isLlmEnabled } = await import('@/lib/llmClient');
    if (!isLlmEnabled()) {
      toast({
        title: 'LLM inte tillgängligt',
        description: 'Aktivera LLM för att generera tester. Testgenerering kräver LLM för att generera E2E scenarios.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingFile('all');
    const llmProvider = getDefaultLlmProvider();

    if (!llmProvider) {
      toast({
        title: 'LLM provider saknas',
        description: 'Kunde inte hitta LLM provider. Kontrollera LLM-konfigurationen.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Automatisk hierarki-byggning: Bygg hierarki automatiskt innan testgenerering
      // Använd root-fil om den finns, annars använd första filen
      let rootFile: BpmnFile | null = null;
      try {
        rootFile = await resolveRootBpmnFile(files, toast);
      } catch (error) {
        console.error('[handleGenerateTestsForAllFiles] Error resolving root file:', error);
        // Fortsätt med första filen som fallback
      }
      
      const hierarchyFile = rootFile || allBpmnFiles[0];
      
      if (!hierarchyFile) {
        toast({
          title: 'Kunde inte hitta fil att generera tester för',
          description: 'Ingen BPMN-fil kunde hittas för testgenerering.',
          variant: 'destructive',
        });
        return;
      }
      
      if (!hierarchyFile.storage_path) {
        toast({
          title: 'Filen är inte uppladdad än',
          description: `BPMN-filen ${hierarchyFile.file_name} är inte uppladdad än. Ladda upp filen först.`,
          variant: 'destructive',
        });
        return;
      }
      
      if (hierarchyFile.file_type === 'bpmn' && hierarchyFile.storage_path) {
        // Bygg hierarki tyst i bakgrunden (transparent för användaren)
        try {
          await buildHierarchySilently(hierarchyFile, queryClient);
          // Invalidera queries så att UI uppdateras med ny hierarki
          queryClient.invalidateQueries({ queryKey: ['process-tree'] });
          queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] });
        } catch (error) {
          // Logga felet men fortsätt med testgenerering (hierarki är inte kritiskt)
          // Failed to build hierarchy automatically, continuing anyway
        }
      }

      // För "alla filer": Generera EN gång för hela hierarkin istället för att loopa
      // Om vi har root-fil, generera bara för root (hierarkin inkluderar alla subprocesser automatiskt)
      if (rootFile) {
        // Show generation dialog immediately
        setShowGenerationDialog(true);
        const startTime = Date.now();

        // Initialize progress
        setGenerationProgress({
          totalProgress: 0,
          currentStep: 'Förbereder testgenerering för alla filer...',
          docs: { completed: 0, total: 0 },
          htmlUpload: { completed: 0, total: 0 },
          tests: { completed: 0, total: 0 },
          startTime,
        });

        // Generera tester för root-filen med hierarki (hierarkin inkluderar alla subprocesser automatiskt)
        const allBpmnFileNames = allBpmnFiles.map(f => f.file_name);
        const result = await generateTestsForFile(
          rootFile.file_name,
          llmProvider,
          (progress) => {
            // Update both currentGenerationStep (for TransitionOverlay) and GenerationProgress (for GenerationDialog)
            setCurrentGenerationStep({
              step: `Genererar tester: ${progress.currentElement || '...'}`,
              detail: `${progress.current}/${progress.total} noder`,
            });

            // Calculate progress percentage
            const progressPercent = progress.total > 0 
              ? Math.round((progress.current / progress.total) * 100)
              : 0;

            // Map status to step text
            let stepText = 'Förbereder...';
            if (progress.status === 'parsing') {
              stepText = 'Parsar BPMN-fil...';
            } else if (progress.status === 'generating') {
              stepText = `Genererar tester: ${progress.currentElement || '...'}`;
            } else if (progress.status === 'uploading') {
              stepText = 'Laddar upp tester...';
            } else if (progress.status === 'complete') {
              stepText = 'Klar!';
            }

            setGenerationProgress({
              totalProgress: progressPercent,
              currentStep: stepText,
              currentStepDetail: `${progress.current}/${progress.total} steg`,
              docs: { completed: 0, total: 0 },
              htmlUpload: { completed: 0, total: 0 },
              tests: { completed: progress.current, total: progress.total },
              startTime,
            });
          },
          undefined, // checkCancellation
          undefined, // abortSignal
          true, // useHierarchy = true (generate for all files in hierarchy)
          allBpmnFileNames, // existingBpmnFiles
          true, // isActualRootFile = true (this is the root file)
        );

        // Convert TestGenerationResult to GenerationResult format
        const dialogResult: GenerationResult = {
          fileName: rootFile.file_name,
          filesAnalyzed: result.filesGenerated || [rootFile.file_name], // Use filesGenerated if available
          docFiles: [],
          jiraMappings: [],
          subprocessMappings: [],
          testScenarios: result.totalScenarios,
          e2eScenarios: result.e2eScenarios,
          featureGoalScenarios: result.featureGoalScenarios,
          e2eScenarioDetails: result.e2eScenarioDetails,
          featureGoalScenarioDetails: result.featureGoalScenarioDetails,
          warnings: result.warnings,
          missingDocumentation: result.missingDocumentation,
          e2eGenerationErrors: result.e2eGenerationErrors,
          featureGoalTestErrors: result.featureGoalTestErrors,
        };

        // Show result in dialog
        setGenerationProgress(null);
        setGenerationDialogResult(dialogResult);

        // Also show toast for quick feedback
        toast({
          title: 'Testgenerering klar',
          description: `Genererade ${result.totalScenarios || 0} E2E-scenarios för hela hierarkin.`,
        });
        
        // Test generation completed
        if (import.meta.env.DEV && result.totalScenarios > 0) {
          console.log(`[useTestGeneration] Generated ${result.totalScenarios} test scenarios`);
        }

        // Visa alla fel och varningar på ett användarvänligt sätt
        const hasErrors = result.errors.length > 0 || 
                         (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) ||
                         (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0);
        const hasWarnings = result.warnings && result.warnings.length > 0;

        if (hasErrors) {
          const errorCount = result.errors.length + 
                            (result.e2eGenerationErrors?.length || 0) + 
                            (result.featureGoalTestErrors?.length || 0);
          
          let errorDetails: string[] = [];
          
          if (result.errors.length > 0) {
            const errorPreview = result.errors.slice(0, 2).map(e => e.elementName || e.elementId).join(', ');
            errorDetails.push(`Allmänna fel (${result.errors.length}): ${errorPreview}${result.errors.length > 2 ? '...' : ''}`);
          }
          
          if (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) {
            const e2ePreview = result.e2eGenerationErrors.slice(0, 1).map(e => e.path).join(', ');
            errorDetails.push(`E2E-generering (${result.e2eGenerationErrors.length}): ${e2ePreview}${result.e2eGenerationErrors.length > 1 ? '...' : ''}`);
          }
          
          if (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0) {
            const fgPreview = result.featureGoalTestErrors.slice(0, 1).map(e => e.callActivityId).join(', ');
            errorDetails.push(`Feature Goal-tester (${result.featureGoalTestErrors.length}): ${fgPreview}${result.featureGoalTestErrors.length > 1 ? '...' : ''}`);
          }

          toast({
            title: `${errorCount} fel uppstod`,
            description: errorDetails.join(' | '),
            variant: 'destructive',
            duration: 8000,
          });
        }

        if (hasWarnings && result.warnings) {
          const warningPreview = result.warnings.slice(0, 1)[0];
          toast({
            title: `${result.warnings.length} varning(ar)`,
            description: warningPreview + (result.warnings.length > 1 ? ` (+ ${result.warnings.length - 1} fler)` : ''),
            variant: 'default',
            duration: 6000,
          });
        }
      } else {
        // Om ingen root-fil finns, loopa över alla filer (fallback)
        toast({
          title: 'Startar testgenerering för alla filer',
          description: `Genererar tester för ${allBpmnFiles.length} BPMN-filer med LLM läge.`,
        });

        const fileNames = allBpmnFiles.map((f) => f.file_name);
        const result = await generateTestsForAllFiles(
          fileNames,
          llmProvider,
          (progress) => {
            setCurrentGenerationStep({
              step: `Genererar tester: ${progress.currentFile || '...'}`,
              detail: `Fil ${progress.current + 1}/${progress.totalFiles}: ${progress.currentElement || '...'}`,
            });
          },
        );

        toast({
          title: 'Testgenerering klar',
          description: `Genererade E2E-scenarios och Feature Goal-test scenarios för ${result.totalFiles} noder.`,
        });

        if (result.missingDocumentation && result.missingDocumentation.length > 0) {
          const missingNames = result.missingDocumentation
            .map(d => d.elementName || d.elementId)
            .slice(0, 3)
            .join(', ');
          const moreText = result.missingDocumentation.length > 3 
            ? ` och ${result.missingDocumentation.length - 3} fler` 
            : '';
          toast({
            title: 'Dokumentation saknas',
            description: `Dokumentation saknas för ${result.missingDocumentation.length} nod(er): ${missingNames}${moreText}. Generera dokumentation först.`,
            variant: 'destructive',
          });
        }

        // Visa alla fel och varningar på ett användarvänligt sätt
        const hasErrors = result.errors.length > 0 || 
                         (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) ||
                         (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0);
        const hasWarnings = result.warnings && result.warnings.length > 0;

        if (hasErrors) {
          const errorCount = result.errors.length + 
                            (result.e2eGenerationErrors?.length || 0) + 
                            (result.featureGoalTestErrors?.length || 0);
          
          let errorDetails: string[] = [];
          
          if (result.errors.length > 0) {
            const errorPreview = result.errors.slice(0, 2).map(e => e.elementName || e.elementId).join(', ');
            errorDetails.push(`Allmänna fel (${result.errors.length}): ${errorPreview}${result.errors.length > 2 ? '...' : ''}`);
          }
          
          if (result.e2eGenerationErrors && result.e2eGenerationErrors.length > 0) {
            const e2ePreview = result.e2eGenerationErrors.slice(0, 1).map(e => e.path).join(', ');
            errorDetails.push(`E2E-generering (${result.e2eGenerationErrors.length}): ${e2ePreview}${result.e2eGenerationErrors.length > 1 ? '...' : ''}`);
          }
          
          if (result.featureGoalTestErrors && result.featureGoalTestErrors.length > 0) {
            const fgPreview = result.featureGoalTestErrors.slice(0, 1).map(e => e.callActivityId).join(', ');
            errorDetails.push(`Feature Goal-tester (${result.featureGoalTestErrors.length}): ${fgPreview}${result.featureGoalTestErrors.length > 1 ? '...' : ''}`);
          }

          toast({
            title: `${errorCount} fel uppstod`,
            description: errorDetails.join(' | '),
            variant: 'destructive',
            duration: 8000,
          });
        }

        if (hasWarnings && result.warnings) {
          const warningPreview = result.warnings.slice(0, 1)[0];
          toast({
            title: `${result.warnings.length} varning(ar)`,
            description: warningPreview + (result.warnings.length > 1 ? ` (+ ${result.warnings.length - 1} fler)` : ''),
            variant: 'default',
            duration: 6000,
          });
        }
      }

      // Invalidate test-related queries
      queryClient.invalidateQueries({ queryKey: ['node-test-links'] });
      queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
    } catch (error) {
      // Hide dialog on error
      setShowGenerationDialog(false);
      setGenerationProgress(null);
      setGenerationDialogResult(null);
      
      toast({
        title: 'Testgenerering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFile(null);
      setCurrentGenerationStep(null);
    }
  }, [
    files,
    generationMode,
    setGeneratingFile,
    setCurrentGenerationStep,
    setShowGenerationDialog,
    setGenerationProgress,
    setGenerationDialogResult,
    toast,
    queryClient,
  ]);

  return {
    handleGenerateTestsForSelectedFile,
    handleGenerateTestsForAllFiles,
  };
}


