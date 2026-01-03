/**
 * Separated test generation functions
 * These functions generate test files independently from documentation generation
 */

import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildBpmnProcessGraph, buildBpmnProcessGraphFromParseResults, getTestableNodes } from '@/lib/bpmnProcessGraph';
import { storageFileExists, getNodeDocStoragePath, getFeatureGoalDocStoragePaths } from '@/lib/artifactUrls';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateE2eScenariosForProcess } from '@/lib/e2eScenarioGenerator';
import { saveE2eScenariosToStorage } from '@/lib/e2eScenarioStorage';
// Removed: generateFeatureGoalTestsFromE2e - Feature Goal-tester genereras nu direkt från dokumentation med Claude
import { topologicalSortFiles } from './bpmnGenerators/fileSorting';

export interface TestGenerationResult {
  // Playwright-testfiler har tagits bort - de innehöll bara stubbar
  // All test information is now in E2E scenarios and Feature Goal-test scenarios
  totalFiles: number;
  totalScenarios: number;
  e2eScenarios?: number; // Number of E2E scenarios generated
  featureGoalScenarios?: number; // Number of Feature Goal test scenarios generated
  filesGenerated?: string[]; // List of files that were actually processed
  e2eScenarioDetails?: Array<{ // Detailed info about E2E scenarios
    bpmnFile: string;
    scenarioName: string;
    scenarioId: string;
  }>;
  featureGoalScenarioDetails?: Array<{ // Detailed info about Feature Goal test scenarios
    bpmnFile: string;
    callActivityId: string;
    scenarioName: string;
    scenarioId: string;
  }>;
  errors: Array<{
    elementId: string;
    elementName: string;
    error: string;
  }>;
  missingDocumentation?: Array<{
    elementId: string;
    elementName: string;
    docPath: string;
  }>;
  // Förbättrad felhantering: samla alla fel och varningar
  e2eGenerationErrors?: Array<{
    path: string;
    error: string;
  }>;
  featureGoalTestErrors?: Array<{
    callActivityId: string;
    error: string;
  }>;
  warnings?: string[];
}

export interface TestGenerationProgress {
  current: number;
  total: number;
  currentElement?: string;
  status: 'parsing' | 'generating' | 'uploading' | 'complete';
}

/**
 * Generate tests for a single BPMN file or all files in hierarchy
 */
export async function generateTestsForFile(
  bpmnFileName: string,
  llmProvider?: LlmProvider,
  progressCallback?: (progress: TestGenerationProgress) => void,
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
  useHierarchy: boolean = false,
  existingBpmnFiles: string[] = [],
  isActualRootFile?: boolean,
): Promise<TestGenerationResult> {
  // VIKTIGT: Ta bort alla gamla testscenarios med origin: 'design' innan testgenerering
  // Dessa skapas av buildHierarchySilently och saknar given/when/then-fält
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const filesToClean = useHierarchy && existingBpmnFiles.length > 0 
      ? existingBpmnFiles 
      : [bpmnFileName];
    
    for (const file of filesToClean) {
      const { error: deleteError } = await (supabase as any)
        .from('node_planned_scenarios')
        .delete()
        .eq('bpmn_file', file)
        .eq('origin', 'design');
      
      if (deleteError) {
        console.warn(`[testGenerators] Failed to delete old 'design' scenarios for ${file}:`, deleteError);
      } else if (import.meta.env.DEV) {
        console.log(`[testGenerators] Cleaned up old 'design' scenarios for ${file}`);
      }
    }
  } catch (error) {
    console.warn('[testGenerators] Error cleaning up old design scenarios:', error);
  }

  const result: TestGenerationResult = {
    totalFiles: 0,
    totalScenarios: 0,
    e2eScenarios: 0,
    featureGoalScenarios: 0,
    filesGenerated: [],
    e2eScenarioDetails: [],
    featureGoalScenarioDetails: [],
    errors: [],
  };

  try {
    // Determine which files to generate tests for
    const graphFileScope = useHierarchy && existingBpmnFiles.length > 0 
      ? existingBpmnFiles 
      : [bpmnFileName];
    
    // Build graph with all files in hierarchy if useHierarchy is true
    let graph;
    let filesToGenerate: string[];
    
    if (useHierarchy && existingBpmnFiles.length > 0) {
      // Build graph with all files in hierarchy (same logic as documentation generation)
      progressCallback?.({
        current: 0,
        total: 100,
        status: 'parsing',
        currentElement: 'Bygger hierarki...',
      });

      // Get version hashes for all files in scope
      const versionHashes = new Map<string, string | null>();
      for (const fileName of graphFileScope) {
        try {
          const versionHash = await getCurrentVersionHash(fileName);
          versionHashes.set(fileName, versionHash);
        } catch (error) {
          console.warn(`[testGenerators] Failed to get version hash for ${fileName}:`, error);
          versionHashes.set(fileName, null);
        }
      }

      graph = await buildBpmnProcessGraph(bpmnFileName, graphFileScope, versionHashes);
      
      // Determine which files to generate tests for (same logic as documentation generation)
      // If this is root file generation, generate for all files in hierarchy
      const allFilesInGraph = Array.from(graph.fileNodes.keys());
      const isRootFileGeneration = isActualRootFile === true || 
        (graphFileScope.length > 1 && allFilesInGraph.length > 1);
      
      if (isRootFileGeneration) {
        // Generate tests for all files in hierarchy, sorted topologically
        // Build dependencies map from graph
        const dependencies = new Map<string, Set<string>>();
        for (const [file, nodes] of graph.fileNodes.entries()) {
          const deps = new Set<string>();
          for (const node of nodes) {
            if (node.type === 'callActivity' && node.subprocessFile) {
              deps.add(node.subprocessFile);
            }
          }
          dependencies.set(file, deps);
        }
        
        filesToGenerate = topologicalSortFiles(Array.from(allFilesInGraph) as string[], dependencies);
        
        if (import.meta.env.DEV) {
          console.log(`[testGenerators] Root file generation: generating tests for ${filesToGenerate.length} files in hierarchy:`, filesToGenerate);
        }
      } else {
        // Generate tests only for the selected file
        filesToGenerate = [bpmnFileName];
      }
    } else {
      // Build graph from single file
      progressCallback?.({
        current: 0,
        total: 100,
        status: 'parsing',
        currentElement: 'Parsing BPMN file...',
      });

      const parseResult = await parseBpmnFile(bpmnFileName);
      if (!parseResult) {
        throw new Error(`Failed to parse BPMN file: ${bpmnFileName}`);
      }

      const parseResults = new Map<string, typeof parseResult>();
      parseResults.set(bpmnFileName, parseResult);
      
      graph = await buildBpmnProcessGraphFromParseResults(bpmnFileName, parseResults);
      filesToGenerate = [bpmnFileName];
    }
    
    // If generating for multiple files in hierarchy, loop over each file
    if (filesToGenerate.length > 1) {
      console.log(`[testGenerators] Generating tests for ${filesToGenerate.length} files in hierarchy:`, filesToGenerate);
      
      const aggregatedResult: TestGenerationResult = {
        totalFiles: 0,
        totalScenarios: 0,
        e2eScenarios: 0,
        featureGoalScenarios: 0,
        filesGenerated: [],
        e2eScenarioDetails: [],
        featureGoalScenarioDetails: [],
        errors: [],
      };
      
      for (let i = 0; i < filesToGenerate.length; i++) {
        const fileName = filesToGenerate[i];
        const isRootFileInHierarchy = i === 0; // First file in hierarchy is root (generates E2E scenarios)
        
        if (checkCancellation) {
          checkCancellation();
        }
        if (abortSignal?.aborted) {
          throw new Error('Test generation cancelled');
        }
        
        progressCallback?.({
          current: i,
          total: filesToGenerate.length,
          status: 'generating',
          currentElement: `Genererar tester för ${fileName}...`,
        });
        
        try {
          // Recursively call generateTestsForFile for each file (with useHierarchy=false to avoid infinite recursion)
          // Only root file (first file) should generate E2E scenarios
          const fileResult = await generateTestsForFile(
            fileName,
            llmProvider,
            (progress) => {
              progressCallback?.({
                current: i + (progress.current / progress.total),
                total: filesToGenerate.length,
                status: progress.status,
                currentElement: `${fileName}: ${progress.currentElement || '...'}`,
              });
            },
            checkCancellation,
            abortSignal,
            false, // useHierarchy = false (already in hierarchy loop)
            [], // existingBpmnFiles = [] (not needed for single file)
            isRootFileInHierarchy, // isActualRootFile = true only for first file (root) - generates E2E scenarios
          );
          
          // Aggregate results
          aggregatedResult.totalFiles += fileResult.totalFiles;
          aggregatedResult.totalScenarios += fileResult.totalScenarios;
          aggregatedResult.e2eScenarios = (aggregatedResult.e2eScenarios || 0) + (fileResult.e2eScenarios || 0);
          aggregatedResult.featureGoalScenarios = (aggregatedResult.featureGoalScenarios || 0) + (fileResult.featureGoalScenarios || 0);
          
          // Track which files were generated
          if (!aggregatedResult.filesGenerated) {
            aggregatedResult.filesGenerated = [];
          }
          aggregatedResult.filesGenerated.push(fileName);
          
          // Aggregate scenario details
          if (fileResult.e2eScenarioDetails) {
            if (!aggregatedResult.e2eScenarioDetails) {
              aggregatedResult.e2eScenarioDetails = [];
            }
            aggregatedResult.e2eScenarioDetails.push(...fileResult.e2eScenarioDetails);
          }
          if (fileResult.featureGoalScenarioDetails) {
            if (!aggregatedResult.featureGoalScenarioDetails) {
              aggregatedResult.featureGoalScenarioDetails = [];
            }
            aggregatedResult.featureGoalScenarioDetails.push(...fileResult.featureGoalScenarioDetails);
          }
          
          aggregatedResult.errors.push(...fileResult.errors);
          if (fileResult.missingDocumentation) {
            if (!aggregatedResult.missingDocumentation) {
              aggregatedResult.missingDocumentation = [];
            }
            aggregatedResult.missingDocumentation.push(...fileResult.missingDocumentation);
          }
          if (fileResult.e2eGenerationErrors) {
            if (!aggregatedResult.e2eGenerationErrors) {
              aggregatedResult.e2eGenerationErrors = [];
            }
            aggregatedResult.e2eGenerationErrors.push(...fileResult.e2eGenerationErrors);
          }
          if (fileResult.featureGoalTestErrors) {
            if (!aggregatedResult.featureGoalTestErrors) {
              aggregatedResult.featureGoalTestErrors = [];
            }
            aggregatedResult.featureGoalTestErrors.push(...fileResult.featureGoalTestErrors);
          }
          if (fileResult.warnings) {
            if (!aggregatedResult.warnings) {
              aggregatedResult.warnings = [];
            }
            aggregatedResult.warnings.push(...fileResult.warnings);
          }
        } catch (error) {
          aggregatedResult.errors.push({
            elementId: fileName,
            elementName: fileName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      progressCallback?.({
        current: filesToGenerate.length,
        total: filesToGenerate.length,
        status: 'complete',
        currentElement: 'Klar!',
      });
      
      // Ensure filesGenerated is set
      if (!aggregatedResult.filesGenerated || aggregatedResult.filesGenerated.length === 0) {
        aggregatedResult.filesGenerated = filesToGenerate;
      }
      
      return aggregatedResult;
    }
    
    // Single file generation (original logic)
    // Ensure filesGenerated is set for single file
    if (!result.filesGenerated || result.filesGenerated.length === 0) {
      result.filesGenerated = [bpmnFileName];
    }
    const allTestableNodes = getTestableNodes(graph);
    
    console.log(`[testGenerators] Found ${allTestableNodes.length} testable nodes in ${bpmnFileName}`);
    
    // Filter: Only generate test files for Feature Goals (callActivities)
    // Epic test generation has been removed - Epic information is already included
    // in Feature Goal documentation via childrenDocumentation
    const testableNodes = allTestableNodes.filter(node => node.type === 'callActivity');

    console.log(`[testGenerators] Found ${testableNodes.length} callActivities (Feature Goals) in ${bpmnFileName}`);

    // Validate documentation for testable nodes (callActivities)
    // FORBÄTTRING: Tillåt partiell generering - generera för Feature Goals som har dokumentation
    // Istället för att stoppa hela genereringen om EN dokumentation saknas
    if (testableNodes.length > 0) {
      progressCallback?.({
        current: 0,
        total: testableNodes.length,
        status: 'parsing',
        currentElement: 'Kontrollerar dokumentation...',
      });

      const missingDocs: Array<{ elementId: string; elementName: string; docPath: string }> = [];
      const validNodes: typeof testableNodes = [];
      
      for (const node of testableNodes) {
        // Use bpmnElementId directly from BpmnProcessNode (element is optional and may be undefined)
        const elementId = node.bpmnElementId;
        const elementName = node.name || elementId;
        let docExists = false;
        let docPath = '';

        // For callActivities, check Process Feature Goal documentation (non-hierarchical)
        // VIKTIGT: CallActivity Feature Goals genereras INTE längre.
        // Istället genereras Process Feature Goals för subprocess-filen (non-hierarchical naming).
        // Process Feature Goals använder format: feature-goals/{subprocessBaseName}.html
        // (inte hierarchical: feature-goals/{parent}-{elementId}.html)
        if (node.type === 'callActivity') {
          let subprocessFile = node.subprocessFile;
          
          // Fallback: Om subprocessFile saknas, försök hitta den via bpmn-map.json eller genom att leta efter filer
          if (!subprocessFile) {
            try {
              // Försök hitta via bpmn-map.json
              const { loadBpmnMapFromStorage } = await import('./bpmn/bpmnMapStorage');
              const { matchCallActivityUsingMap } = await import('./bpmn/bpmnMapLoader');
              
              const bpmnMapResult = await loadBpmnMapFromStorage();
              if (bpmnMapResult.valid && bpmnMapResult.map) {
                const mapResult = matchCallActivityUsingMap(
                  { id: elementId, name: elementName },
                  bpmnFileName,
                  bpmnMapResult.map
                );
                
                if (mapResult.matchedFileName) {
                  subprocessFile = mapResult.matchedFileName;
                  if (import.meta.env.DEV) {
                    console.log(`[testGenerators] Found subprocessFile via bpmn-map.json for ${elementId}: ${subprocessFile}`);
                  }
                }
              }
              
              // Ytterligare fallback: Försök hitta fil baserat på elementId-namnet
              if (!subprocessFile) {
                // Försök hitta filer som matchar elementId (t.ex. "credit-evaluation" -> "mortgage-se-credit-evaluation.bpmn")
                const normalizedElementId = elementId.toLowerCase().replace(/\s+/g, '-');
                const possibleFileNames = [
                  `mortgage-se-${normalizedElementId}.bpmn`,
                  `${normalizedElementId}.bpmn`,
                ];
                
                // Hämta lista över tillgängliga BPMN-filer
                const { supabase } = await import('@/integrations/supabase/client');
                const { data: files } = await supabase.storage
                  .from('bpmn-files')
                  .list('bpmn', { search: '.bpmn' });
                
                if (files) {
                  const fileNames = files.map(f => f.name);
                  for (const possibleFileName of possibleFileNames) {
                    if (fileNames.includes(possibleFileName)) {
                      subprocessFile = possibleFileName;
                      if (import.meta.env.DEV) {
                        console.log(`[testGenerators] Found subprocessFile via filename matching for ${elementId}: ${subprocessFile}`);
                      }
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn(`[testGenerators] Failed to find subprocessFile for ${elementId}:`, error);
              }
            }
          }
          
          if (!subprocessFile) {
            console.warn(`[testGenerators] CallActivity ${elementId} has no subprocessFile, cannot check documentation`);
            docExists = false;
          } else {
            // Get version hash for the subprocess file (not the parent file)
            // This is important because Feature Goal docs are stored under the subprocess file's version
            const subprocessVersionHash = await getCurrentVersionHash(subprocessFile);
            
            if (!subprocessVersionHash) {
              console.warn(`[testGenerators] No version hash found for ${subprocessFile}, cannot check documentation`);
              docExists = false;
            } else {
              // VIKTIGT: Använd Process Feature Goal (non-hierarchical) istället för CallActivity Feature Goal (hierarchical)
              // Process Feature Goals använder subprocess-filens baseName som elementId och ingen parent
              const subprocessBaseName = subprocessFile.replace('.bpmn', '');
              const { getFeatureGoalDocFileKey } = await import('./nodeArtifactPaths');
              const { buildDocStoragePaths } = await import('./artifactPaths');
              
              // Non-hierarchical naming för Process Feature Goal (ingen parent)
              const processFeatureGoalKey = getFeatureGoalDocFileKey(
                subprocessFile,
                subprocessBaseName, // För Process Feature Goals är elementId = baseName
                undefined, // no version suffix
                undefined, // no parent (non-hierarchical)
                false, // isRootProcess = false (detta är en subprocess)
              );
              
              const { modePath } = buildDocStoragePaths(
                processFeatureGoalKey,
                'slow', // mode
                'cloud', // provider (claude är cloud provider)
                subprocessFile, // bpmnFileForVersion: use subprocess file for versioned paths
                subprocessVersionHash,
              );
              
              docPath = modePath;
              
              if (import.meta.env.DEV) {
                console.log(`[testGenerators] Checking Process Feature Goal doc for ${bpmnFileName}::${elementId}:`, {
                  subprocessFile,
                  subprocessBaseName,
                  elementId,
                  parentBpmnFile: bpmnFileName,
                  versionHash: subprocessVersionHash,
                  processFeatureGoalKey,
                  docPath,
                });
              }
              
              docExists = docPath ? await storageFileExists(docPath) : false;
              
              if (import.meta.env.DEV && !docExists) {
                console.warn(`[testGenerators] Process Feature Goal doc not found at: ${docPath}`);
              }
            }
          }
        } else {
          // For other node types, check regular node documentation
          const versionHash = await getCurrentVersionHash(bpmnFileName);
          if (!versionHash) {
            console.warn(`[testGenerators] No version hash found for ${bpmnFileName}, cannot check documentation`);
            docExists = false;
          } else {
            docPath = await getNodeDocStoragePath(bpmnFileName, elementId, versionHash);
            docExists = await storageFileExists(docPath);
          }
        }
        
        if (!docExists) {
          missingDocs.push({
            elementId: elementId,
            elementName: elementName,
            docPath: docPath,
          });
        } else {
          // FORBÄTTRING: Lägg till noder med dokumentation i validNodes för partiell generering
          validNodes.push(node);
        }
      }

      // FORBÄTTRING: Tillåt partiell generering - varna om dokumentation saknas men fortsätt ändå
      if (missingDocs.length > 0) {
        result.missingDocumentation = missingDocs;
        const missingNames = missingDocs.map(d => d.elementName || d.elementId).join(', ');
        const warning = `Dokumentation saknas för ${missingDocs.length} Feature Goal(s): ${missingNames}. ` +
          `Genererar tester endast för Feature Goals med dokumentation (${validNodes.length} av ${testableNodes.length}).`;
        
        console.warn(`[testGenerators] ${warning}`);
        if (!result.warnings) {
          result.warnings = [];
        }
        result.warnings.push(warning);
      }

      // FORBÄTTRING: Om alla dokumentation saknas, ge tydligt felmeddelande
      if (validNodes.length === 0 && testableNodes.length > 0) {
        const missingNames = missingDocs.map(d => d.elementName || d.elementId).join(', ');
        throw new Error(
          `Dokumentation saknas för alla ${testableNodes.length} Feature Goal(s): ${missingNames}. ` +
          `Generera dokumentation först innan testgenerering.`
        );
      }
    } else {
      console.log(`[testGenerators] No callActivities found in ${bpmnFileName}. Will generate E2E scenarios for the process itself.`);
    }

    // Playwright-testfiler genereras inte längre
    result.totalFiles = 0;

    // E2E scenarios genereras även om det inte finns callActivities (för processer som är subprocesser)
    // Om det inte finns callActivities, hoppa direkt till E2E scenario-generering
    if (testableNodes.length > 0) {
      progressCallback?.({
        current: 0,
        total: testableNodes.length,
        status: 'generating',
        currentElement: `Found ${testableNodes.length} testable nodes`,
      });
    }

    // Generate E2E scenarios ONLY for root process (not for subprocesses)
    // Only generate E2E scenarios if:
    // 1. LLM is enabled
    // 2. This is the root file (isActualRootFile === true)
    const llmEnabled = isLlmEnabled();
    const isRootFile = isActualRootFile === true;
    
    console.log(`[testGenerators] LLM enabled: ${llmEnabled}, llmProvider: ${llmProvider ? llmProvider : 'undefined'}, isRootFile: ${isRootFile}`);
    
    if (llmEnabled && llmProvider && isRootFile) {
      try {
        // Check if E2E scenarios already exist for this file to avoid duplicate generation
        // Use loadE2eScenariosFromStorage which handles versioned paths correctly
        const { loadE2eScenariosFromStorage } = await import('./e2eScenarioStorage');
        const existingScenarios = await loadE2eScenariosFromStorage(bpmnFileName);
        
        // FORBÄTTRING: Om E2E scenarios redan finns, hoppa över E2E-generering men tillåt Feature Goal-test-generering
        if (existingScenarios.length > 0) {
          console.log(`[testGenerators] E2E scenarios already exist for ${bpmnFileName} (${existingScenarios.length} scenarios), skipping E2E generation to avoid duplicates`);
          result.totalScenarios += existingScenarios.length; // Add existing E2E scenarios to total
          result.e2eScenarios = (result.e2eScenarios || 0) + existingScenarios.length;
          
          // Generera Feature Goal-tester direkt från dokumentation med Claude
          // även om E2E scenarios redan finns
          try {
            progressCallback?.({
              current: existingScenarios.length,
              total: existingScenarios.length + 1,
              status: 'generating',
              currentElement: 'Genererar Feature Goal-tester från dokumentation...',
            });
            
            // Samla alla BPMN-filer som behövs
            const bpmnFilesSet = new Set<string>([bpmnFileName]);
            for (const scenario of existingScenarios) {
              for (const step of scenario.subprocessSteps || []) {
                if (step.bpmnFile) {
                  bpmnFilesSet.add(step.bpmnFile);
                }
              }
            }
            
            // Generera Feature Goal-tester direkt från dokumentation med Claude
            const { generateFeatureGoalTestsDirect } = await import('./featureGoalTestGeneratorDirect');
            const featureGoalTestResult = await generateFeatureGoalTestsDirect(
              Array.from(bpmnFilesSet),
              llmProvider,
              abortSignal
            );
            
            console.log(
              `[testGenerators] Generated ${featureGoalTestResult.generated} Feature Goal test scenarios directly from documentation, ` +
              `skipped ${featureGoalTestResult.skipped}, errors: ${featureGoalTestResult.errors.length}`
            );
            
            result.featureGoalScenarios = (result.featureGoalScenarios || 0) + featureGoalTestResult.generated;
            
            // Track Feature Goal scenario details
            try {
              const { fetchPlannedScenarios } = await import('./testDataHelpers');
              if (!result.featureGoalScenarioDetails) {
                result.featureGoalScenarioDetails = [];
              }
              
              // Collect unique call activities from existing scenarios
              const callActivities = new Set<string>();
              for (const scenario of existingScenarios) {
                for (const step of scenario.subprocessSteps || []) {
                  if (step.callActivityId && step.bpmnFile) {
                    callActivities.add(`${step.bpmnFile}::${step.callActivityId}`);
                  }
                }
              }
              
              // Fetch scenario details for each call activity
              for (const key of callActivities) {
                const [bpmnFile, callActivityId] = key.split('::');
                const plannedScenarios = await fetchPlannedScenarios(bpmnFile, callActivityId);
                if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
                  const firstScenario = plannedScenarios.scenarios[0];
                  // Check if we already have this scenario
                  const exists = result.featureGoalScenarioDetails.some(
                    d => d.bpmnFile === bpmnFile && d.callActivityId === callActivityId
                  );
                  if (!exists) {
                    result.featureGoalScenarioDetails.push({
                      bpmnFile,
                      callActivityId,
                      scenarioName: firstScenario.name || callActivityId,
                      scenarioId: firstScenario.id || callActivityId,
                    });
                  }
                }
              }
            } catch (error) {
              // Silent fail - details are optional
              if (import.meta.env.DEV) {
                console.warn('[testGenerators] Failed to fetch Feature Goal scenario details from existing scenarios:', error);
              }
            }
            
            if (featureGoalTestResult.errors.length > 0) {
              if (!result.featureGoalTestErrors) {
                result.featureGoalTestErrors = [];
              }
              result.featureGoalTestErrors.push(...featureGoalTestResult.errors);
            }
            
            if (!result.warnings) {
              result.warnings = [];
            }
            result.warnings.push(
              `E2E scenarios already exist for ${bpmnFileName}, skipped E2E generation. ` +
              `Generated ${featureGoalTestResult.generated} Feature Goal test scenarios from documentation.`
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[testGenerators] Failed to generate Feature Goal tests from documentation:`, error);
            if (!result.warnings) {
              result.warnings = [];
            }
            result.warnings.push(
              `E2E scenarios already exist for ${bpmnFileName}, skipped generation. ` +
              `Failed to generate Feature Goal tests: ${errorMessage}`
            );
          }
          
          return result;
        }
        
        progressCallback?.({
          current: 0,
          total: 1,
          status: 'generating',
          currentElement: 'Genererar E2E-scenarios...',
        });

        // Try to determine process name and initiative from BPMN file
        // Get process name from meta (first process) or use filename
        // Need to parse the file to get meta (parseResult may not be available if useHierarchy=true)
        const fileParseResult = await parseBpmnFile(bpmnFileName);
        if (!fileParseResult) {
          throw new Error(`Failed to parse BPMN file: ${bpmnFileName}`);
        }
        const firstProcess = fileParseResult.meta?.processes?.[0] || fileParseResult.meta;
        const processName = firstProcess?.name || fileParseResult.meta?.name || bpmnFileName.replace('.bpmn', '');
        const initiative = processName.includes('mortgage') ? 'Mortgage' : processName;

        const e2eResult = await generateE2eScenariosForProcess(
          bpmnFileName,
          processName,
          initiative,
          llmProvider,
          true, // allowFallback
          abortSignal,
          (progress) => {
            progressCallback?.({
              current: progress.current,
              total: progress.total,
              status: 'generating',
              currentElement: progress.currentPath || 'Genererar E2E-scenarios...',
            });
          }
        );

        console.log(`[testGenerators] E2E generation result: ${e2eResult.scenarios.length} scenarios, ${e2eResult.paths.length} paths`);
        
        // FORBÄTTRING: Visa tydlig feedback om hoppade över paths
        if (e2eResult.skippedPaths && e2eResult.skippedPaths.total > 0) {
          const skippedInfo = `Hoppade över ${e2eResult.skippedPaths.total} path(s): ` +
            `${e2eResult.skippedPaths.noDocs} saknade dokumentation, ` +
            `${e2eResult.skippedPaths.noResult} misslyckades vid LLM-generering`;
          
          console.warn(`[testGenerators] ${skippedInfo}`);
          if (!result.warnings) {
            result.warnings = [];
          }
          result.warnings.push(skippedInfo);
        }
        
        if (e2eResult.scenarios.length === 0 && e2eResult.paths.length === 0) {
          console.warn(`[testGenerators] ⚠️ No E2E scenarios or paths generated for ${bpmnFileName}. This might indicate:`);
          console.warn(`[testGenerators]   - No paths found in the BPMN file`);
          console.warn(`[testGenerators]   - File-level documentation could not be loaded`);
          console.warn(`[testGenerators]   - LLM generation failed for all paths`);
        }

        if (e2eResult.scenarios.length > 0) {
          // Save E2E scenarios to storage as JSON
          await saveE2eScenariosToStorage(bpmnFileName, e2eResult.scenarios);
          
          console.log(`[testGenerators] Generated ${e2eResult.scenarios.length} E2E scenarios for ${bpmnFileName}`);
          result.totalScenarios += e2eResult.scenarios.length; // Add E2E scenarios to total
          result.e2eScenarios = (result.e2eScenarios || 0) + e2eResult.scenarios.length;
          
          // Track E2E scenario details
          if (!result.e2eScenarioDetails) {
            result.e2eScenarioDetails = [];
          }
          for (const scenario of e2eResult.scenarios) {
            result.e2eScenarioDetails.push({
              bpmnFile: bpmnFileName,
              scenarioName: scenario.name,
              scenarioId: scenario.id,
            });
          }
          
          // Explicit kontroll: Om paths är tomma, hoppa över Feature Goal-test-generering
          if (e2eResult.paths.length === 0) {
            const warning = `Inga paths hittades för ${bpmnFileName}. Feature Goal-tester kan inte genereras utan gateway-kontext.`;
            console.warn(`[testGenerators] ${warning}`);
            if (!result.warnings) {
              result.warnings = [];
            }
            result.warnings.push(warning);
          } else {
            // Generate Feature Goal tests directly from documentation with Claude
            // Note: savePlannedScenarios uses upsert with onConflict, so duplicates are automatically handled
            try {
              progressCallback?.({
                current: e2eResult.scenarios.length,
                total: e2eResult.scenarios.length + 1,
                status: 'generating',
                currentElement: 'Genererar Feature Goal-tester från dokumentation...',
              });
              
              // Collect all BPMN files that contain Feature Goals from the paths
              // Need to parse the file to get elements (parseResult may not be available if useHierarchy=true)
              const fileParseResultForPaths = await parseBpmnFile(bpmnFileName);
              const bpmnFilesSet = new Set<string>([bpmnFileName]);
              if (fileParseResultForPaths) {
                for (const path of e2eResult.paths) {
                  for (const featureGoalId of path.featureGoals) {
                    const element = fileParseResultForPaths.elements.find(e => e.id === featureGoalId);
                    if (element && 'bpmnFile' in element && element.bpmnFile && typeof element.bpmnFile === 'string') {
                      bpmnFilesSet.add(element.bpmnFile as string);
                    }
                  }
                }
              }
              
              // Generera Feature Goal-tester direkt från dokumentation med Claude
              // Istället för att extrahera från E2E-scenarios
              const { generateFeatureGoalTestsDirect } = await import('./featureGoalTestGeneratorDirect');
              const featureGoalTestResult = await generateFeatureGoalTestsDirect(
                Array.from(bpmnFilesSet),
                llmProvider,
                abortSignal
              );
              
              console.log(
                `[testGenerators] Generated ${featureGoalTestResult.generated} Feature Goal test scenarios, ` +
                `skipped ${featureGoalTestResult.skipped}, errors: ${featureGoalTestResult.errors.length}`
              );
              
              // Uppdatera totalScenarios med antalet genererade Feature Goal-tester (lägg till, inte ersätt)
              result.totalScenarios += featureGoalTestResult.generated;
              result.featureGoalScenarios = (result.featureGoalScenarios || 0) + featureGoalTestResult.generated;
              
              // Track Feature Goal scenario details by loading from database
              // We need to fetch the scenarios we just saved to get their details
              // VIKTIGT: Hämta ALLA callActivities som genererades, inte bara de i E2E paths
              try {
                const { fetchPlannedScenarios } = await import('./testDataHelpers');
                if (!result.featureGoalScenarioDetails) {
                  result.featureGoalScenarioDetails = [];
                }
                
                // Hitta alla callActivities i alla filer som genererades
                const callActivities = new Set<string>();
                
                // Lägg till ALLA callActivities från alla filer i hierarkin
                // Detta säkerställer att vi får alla Feature Goal-tester som genererades
                // Detta säkerställer att vi får alla Feature Goal-tester som genererades
                for (const bpmnFile of Array.from(bpmnFilesSet)) {
                  try {
                    const { parseBpmnFile } = await import('./bpmnParser');
                    const parseResult = await parseBpmnFile(bpmnFile);
                    if (parseResult) {
                      for (const element of parseResult.elements) {
                        if (element.type === 'callActivity' && element.id) {
                          // Hitta parent-filen där callActivity är definierad
                          // För callActivities i subprocesser, parent-filen är filen som innehåller callActivity
                          const parentFile = bpmnFile; // I hierarkin är parent-filen samma som filen där callActivity är
                          callActivities.add(`${parentFile}::${element.id}`);
                        }
                      }
                    }
                  } catch (error) {
                    // Silent fail för individuella filer
                    if (import.meta.env.DEV) {
                      console.warn(`[testGenerators] Failed to parse ${bpmnFile} for callActivities:`, error);
                    }
                  }
                }
                
                // Fetch scenario details for each call activity
                for (const key of callActivities) {
                  const [bpmnFile, callActivityId] = key.split('::');
                  const plannedScenarios = await fetchPlannedScenarios(bpmnFile, callActivityId);
                  if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
                    // Check if we already have this scenario
                    const exists = result.featureGoalScenarioDetails.some(
                      d => d.bpmnFile === bpmnFile && d.callActivityId === callActivityId
                    );
                    if (!exists) {
                      // Add details for first scenario (or all if needed)
                      const firstScenario = plannedScenarios.scenarios[0];
                      result.featureGoalScenarioDetails.push({
                        bpmnFile,
                        callActivityId,
                        scenarioName: firstScenario.name || callActivityId,
                        scenarioId: firstScenario.id || callActivityId,
                      });
                    }
                  }
                }
              } catch (error) {
                // Silent fail - details are optional
                if (import.meta.env.DEV) {
                  console.warn('[testGenerators] Failed to fetch Feature Goal scenario details:', error);
                }
              }
              
              if (featureGoalTestResult.errors.length > 0) {
                // Spara fel för feedback till användaren
                if (!result.featureGoalTestErrors) {
                  result.featureGoalTestErrors = [];
                }
                result.featureGoalTestErrors.push(...featureGoalTestResult.errors);
                console.warn(
                  `[testGenerators] Errors generating Feature Goal tests:`,
                  featureGoalTestResult.errors
                );
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.warn(
                `[testGenerators] Failed to generate Feature Goal tests from documentation:`,
                error
              );
              // Spara fel för feedback till användaren
              if (!result.featureGoalTestErrors) {
                result.featureGoalTestErrors = [];
              }
              result.featureGoalTestErrors.push({
                callActivityId: 'unknown',
                error: `Failed to generate Feature Goal tests: ${errorMessage}`,
              });
            }
          }
        } else {
          // Om inga E2E scenarios genererades, ge tydlig feedback
          const warning = `Inga E2E scenarios genererades för ${bpmnFileName}. Feature Goal-tester genereras direkt från dokumentation.`;
          console.warn(`[testGenerators] ${warning}`);
          if (!result.warnings) {
            result.warnings = [];
          }
          result.warnings.push(warning);
          
          // FORBÄTTRING: Hämta befintliga Feature Goal-tester från databasen även när E2E-generering misslyckas
          // Detta säkerställer att befintliga Feature Goal-tester visas i resultatet
          try {
            const { fetchPlannedScenarios } = await import('./testDataHelpers');
            if (!result.featureGoalScenarioDetails) {
              result.featureGoalScenarioDetails = [];
            }
            
            // Hitta alla callActivities i filen från graph
            const callActivitiesInFile = testableNodes.filter(node => 
              node.type === 'callActivity' && 
              node.bpmnFile === bpmnFileName &&
              node.bpmnElementId
            );
            
            // Hämta Feature Goal-tester från databasen för varje callActivity
            for (const callActivity of callActivitiesInFile) {
              if (!callActivity.bpmnElementId) continue;
              
              const plannedScenarios = await fetchPlannedScenarios(
                bpmnFileName, 
                callActivity.bpmnElementId
              );
              
              if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
                const firstScenario = plannedScenarios.scenarios[0];
                // Check if we already have this scenario
                const exists = result.featureGoalScenarioDetails.some(
                  d => d.bpmnFile === bpmnFileName && d.callActivityId === callActivity.bpmnElementId
                );
                if (!exists) {
                  result.featureGoalScenarioDetails.push({
                    bpmnFile: bpmnFileName,
                    callActivityId: callActivity.bpmnElementId,
                    scenarioName: firstScenario.name || callActivity.bpmnElementId,
                    scenarioId: firstScenario.id || callActivity.bpmnElementId,
                  });
                  // Uppdatera räknare
                  result.featureGoalScenarios = (result.featureGoalScenarios || 0) + plannedScenarios.scenarios.length;
                  result.totalScenarios = (result.totalScenarios || 0) + plannedScenarios.scenarios.length;
                }
              }
            }
            
            if (result.featureGoalScenarioDetails.length > 0) {
              console.log(
                `[testGenerators] Found ${result.featureGoalScenarioDetails.length} existing Feature Goal test scenarios in database for ${bpmnFileName}`
              );
            }
          } catch (error) {
            // Silent fail - details are optional
            if (import.meta.env.DEV) {
              console.warn('[testGenerators] Failed to fetch existing Feature Goal test scenarios:', error);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[testGenerators] Failed to generate E2E scenarios for ${bpmnFileName}:`, error);
        // Spara fel för feedback till användaren
        if (!result.e2eGenerationErrors) {
          result.e2eGenerationErrors = [];
        }
        result.e2eGenerationErrors.push({
          path: bpmnFileName,
          error: errorMessage,
        });
        // Don't fail the entire test generation if E2E scenario generation fails
      }
    } else {
      console.warn(`[testGenerators] E2E scenario generation skipped: LLM enabled=${llmEnabled}, llmProvider=${llmProvider ? 'provided' : 'missing'}`);
      if (!result.warnings) {
        result.warnings = [];
      }
      result.warnings.push(`E2E scenario generation requires LLM to be enabled and a provider to be specified`);
    }

    return result;
  } catch (error) {
    throw new Error(
      `Test generation failed for ${bpmnFileName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Generate tests for all BPMN files
 */
export async function generateTestsForAllFiles(
  bpmnFileNames: string[],
  llmProvider?: LlmProvider,
  progressCallback?: (progress: TestGenerationProgress & { currentFile?: string; totalFiles: number }) => void,
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<TestGenerationResult> {
  const aggregatedResult: TestGenerationResult = {
    totalFiles: 0,
    totalScenarios: 0,
    errors: [],
  };

  for (let i = 0; i < bpmnFileNames.length; i++) {
    if (checkCancellation) {
      checkCancellation();
    }
    if (abortSignal?.aborted) {
      throw new Error('Test generation cancelled');
    }

    const fileName = bpmnFileNames[i];

    progressCallback?.({
      current: i,
      total: bpmnFileNames.length,
      currentFile: fileName,
      totalFiles: bpmnFileNames.length,
      status: 'generating',
      currentElement: `Processing ${fileName}...`,
    });

    try {
      const fileResult = await generateTestsForFile(
        fileName,
        llmProvider,
        (progress) => {
          progressCallback?.({
            ...progress,
            currentFile: fileName,
            totalFiles: bpmnFileNames.length,
          });
        },
        checkCancellation,
        abortSignal,
      );

      // Aggregate results
      // Playwright-testfiler har tagits bort
      aggregatedResult.totalFiles += fileResult.totalFiles;
      aggregatedResult.totalScenarios += fileResult.totalScenarios;
      aggregatedResult.errors.push(...fileResult.errors);
    } catch (error) {
      aggregatedResult.errors.push({
        elementId: fileName,
        elementName: fileName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return aggregatedResult;
}











