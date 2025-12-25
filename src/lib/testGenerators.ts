/**
 * Separated test generation functions
 * These functions generate test files independently from documentation generation
 */

import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildBpmnProcessGraph, getTestableNodes } from '@/lib/bpmnProcessGraph';
import { storageFileExists, getNodeDocStoragePath, getFeatureGoalDocStoragePaths } from '@/lib/artifactUrls';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateE2eScenariosForProcess } from '@/lib/e2eScenarioGenerator';
import { saveE2eScenariosToStorage } from '@/lib/e2eScenarioStorage';
import { generateFeatureGoalTestsFromE2e } from '@/lib/featureGoalTestGenerator';

export interface TestGenerationResult {
  // Playwright-testfiler har tagits bort - de innehöll bara stubbar
  // All test information is now in E2E scenarios and Feature Goal-test scenarios
  totalFiles: number;
  totalScenarios: number;
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
}

export interface TestGenerationProgress {
  current: number;
  total: number;
  currentElement?: string;
  status: 'parsing' | 'generating' | 'uploading' | 'complete';
}

/**
 * Generate tests for a single BPMN file
 */
export async function generateTestsForFile(
  bpmnFileName: string,
  llmProvider?: LlmProvider,
  progressCallback?: (progress: TestGenerationProgress) => void,
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<TestGenerationResult> {
  const result: TestGenerationResult = {
    totalFiles: 0,
    totalScenarios: 0,
    errors: [],
  };

  try {
    // Parse BPMN file
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

    // Build graph and get testable nodes
    const graph = buildBpmnProcessGraph(parseResult.elements, bpmnFileName);
    const allTestableNodes = getTestableNodes(graph);
    
    // Filter: Only generate test files for Feature Goals (callActivities)
    // Epic test generation has been removed - Epic information is already included
    // in Feature Goal documentation via childrenDocumentation
    const testableNodes = allTestableNodes.filter(node => node.type === 'callActivity');

    if (testableNodes.length === 0) {
      return result; // No Feature Goals to generate tests for
    }

    // Validate that documentation exists for all testable nodes before proceeding
    progressCallback?.({
      current: 0,
      total: testableNodes.length,
      status: 'parsing',
      currentElement: 'Kontrollerar dokumentation...',
    });

    const missingDocs: Array<{ elementId: string; elementName: string; docPath: string }> = [];
    
    for (const node of testableNodes) {
      const element = node.element;
      let docExists = false;
      let docPath = '';

      // For callActivities, check Feature Goal documentation
      if (node.type === 'callActivity' && node.subprocessFile) {
        const featureGoalPaths = getFeatureGoalDocStoragePaths(
          node.subprocessFile,
          element.id,
          bpmnFileName, // parent BPMN file
        );
        
        // Check all possible paths (versioned and non-versioned)
        for (const path of featureGoalPaths) {
          if (await storageFileExists(path)) {
            docExists = true;
            docPath = path;
            break;
          }
        }
        
        if (!docExists) {
          docPath = featureGoalPaths[0] || `feature-goals/${node.subprocessFile}/${element.id}.html`;
        }
      } else {
        // For other node types, check regular node documentation
        docPath = getNodeDocStoragePath(bpmnFileName, element.id);
        docExists = await storageFileExists(docPath);
      }
      
      if (!docExists) {
        missingDocs.push({
          elementId: element.id,
          elementName: element.name || element.id,
          docPath: docPath,
        });
      }
    }

    // If any documentation is missing, return error immediately
    if (missingDocs.length > 0) {
      result.missingDocumentation = missingDocs;
      const missingNames = missingDocs.map(d => d.elementName || d.elementId).join(', ');
      throw new Error(
        `Dokumentation saknas för ${missingDocs.length} nod(er): ${missingNames}. ` +
        `Generera dokumentation först innan testgenerering.`
      );
    }

    // Playwright-testfiler genereras inte längre
    result.totalFiles = 0;

    progressCallback?.({
      current: 0,
      total: testableNodes.length,
      status: 'generating',
      currentElement: `Found ${testableNodes.length} testable nodes`,
    });

    // Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte
    // för att generera given/when/then. All testinformation finns nu i:
    // - E2E scenarios (kompletta flöden, JSON i storage)
    // - Feature Goal-test scenarios (extraherat från E2E scenarios, i databas)
    
    // Hoppa över Playwright-testfil-generering och gå direkt till E2E scenario-generering
    progressCallback?.({
      current: testableNodes.length,
      total: testableNodes.length,
      status: 'complete',
    });

    // Generate E2E scenarios for root process (if this is a root file)
    // Only generate E2E scenarios if LLM is enabled and we have a root process
    if (isLlmEnabled() && llmProvider) {
      try {
        progressCallback?.({
          current: 0,
          total: 1,
          status: 'generating',
          currentElement: 'Genererar E2E-scenarios...',
        });

        // Try to determine process name and initiative from BPMN file
        // Get process name from meta (first process) or use filename
        const firstProcess = parseResult.meta?.processes?.[0] || parseResult.meta;
        const processName = firstProcess?.name || parseResult.meta?.name || bpmnFileName.replace('.bpmn', '');
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

        if (e2eResult.scenarios.length > 0) {
          // Save E2E scenarios to storage as JSON
          await saveE2eScenariosToStorage(bpmnFileName, e2eResult.scenarios);
          
          console.log(`[testGenerators] Generated ${e2eResult.scenarios.length} E2E scenarios for ${bpmnFileName}`);
          
          // Generate Feature Goal tests from E2E scenarios
          try {
            progressCallback?.({
              current: e2eResult.scenarios.length,
              total: e2eResult.scenarios.length + 1,
              status: 'generating',
              currentElement: 'Genererar Feature Goal-tester från E2E-scenarios...',
            });
            
            // Collect all BPMN files that contain Feature Goals from the paths
            const bpmnFilesSet = new Set<string>([bpmnFileName]);
            for (const path of e2eResult.paths) {
              for (const featureGoalId of path.featureGoals) {
                const element = parseResult.elements.find(e => e.id === featureGoalId);
                if (element?.bpmnFile) {
                  bpmnFilesSet.add(element.bpmnFile);
                }
              }
            }
            
            const featureGoalTestResult = await generateFeatureGoalTestsFromE2e({
              e2eScenarios: e2eResult.scenarios,
              paths: e2eResult.paths,
              bpmnFiles: Array.from(bpmnFilesSet),
            });
            
            console.log(
              `[testGenerators] Generated ${featureGoalTestResult.generated} Feature Goal test scenarios, ` +
              `skipped ${featureGoalTestResult.skipped}, errors: ${featureGoalTestResult.errors.length}`
            );
            
            if (featureGoalTestResult.errors.length > 0) {
              console.warn(
                `[testGenerators] Errors generating Feature Goal tests:`,
                featureGoalTestResult.errors
              );
            }
          } catch (error) {
            console.warn(
              `[testGenerators] Failed to generate Feature Goal tests from E2E scenarios:`,
              error
            );
            // Don't fail the entire test generation if Feature Goal test generation fails
          }
        }
      } catch (error) {
        console.warn(`[testGenerators] Failed to generate E2E scenarios for ${bpmnFileName}:`, error);
        // Don't fail the entire test generation if E2E scenario generation fails
      }
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











