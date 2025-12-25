/**
 * Separated test generation functions
 * These functions generate test files independently from documentation generation
 */

import { parseBpmnFile, type BpmnElement } from '@/lib/bpmnParser';
import { buildBpmnProcessGraph, getTestableNodes } from '@/lib/bpmnProcessGraph';
import { generateTestSpecWithLlm } from '@/lib/llmTests';
import { generateTestSkeleton } from '@/lib/bpmnGenerators';
import { getNodeTestFileKey, getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import { storageFileExists, getNodeDocStoragePath, getFeatureGoalDocStoragePaths } from '@/lib/artifactUrls';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { supabase } from '@/integrations/supabase/client';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateE2eScenariosForProcess } from '@/lib/e2eScenarioGenerator';
import { saveE2eScenariosToStorage } from '@/lib/e2eScenarioStorage';

export interface TestGenerationResult {
  testFiles: Array<{
    filePath: string;
    elementId: string;
    elementName: string;
    scenariosCount: number;
  }>;
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
    testFiles: [],
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

    result.totalFiles = testableNodes.length;

    progressCallback?.({
      current: 0,
      total: testableNodes.length,
      status: 'generating',
      currentElement: `Found ${testableNodes.length} testable nodes`,
    });

    // Generate tests for each testable node
    for (let i = 0; i < testableNodes.length; i++) {
      if (checkCancellation) {
        checkCancellation();
      }
      if (abortSignal?.aborted) {
        throw new Error('Test generation cancelled');
      }

      const node = testableNodes[i];
      const element = node.element;

      try {
        progressCallback?.({
          current: i,
          total: testableNodes.length,
          status: 'generating',
          currentElement: element.name || element.id,
        });

        // Generate test scenarios using LLM (if enabled)
        let llmScenarios: { name: string; description: string; expectedResult?: string; steps?: string[] }[] | undefined;

        if (isLlmEnabled() && llmProvider) {
          const scenarios = await generateTestSpecWithLlm(
            element,
            llmProvider,
            checkCancellation,
            abortSignal,
          );

          if (scenarios && scenarios.length > 0) {
            llmScenarios = scenarios.map((s) => ({
              name: s.name,
              description: s.description,
              expectedResult: s.expectedResult,
              steps: s.steps,
            }));
            result.totalScenarios += scenarios.length;
          }
        }

        // Generate test file content
        const testContent = generateTestSkeleton(element, llmScenarios);
        const testFileKey = getNodeTestFileKey(bpmnFileName, element.id);

        // Upload to Supabase Storage
        progressCallback?.({
          current: i,
          total: testableNodes.length,
          status: 'uploading',
          currentElement: element.name || element.id,
        });

        const { error: uploadError } = await supabase.storage
          .from('bpmn-files')
          .upload(testFileKey, testContent, {
            contentType: 'text/plain',
            upsert: true, // Allow overwriting existing test files
          });

        if (uploadError) {
          throw new Error(`Failed to upload test file: ${uploadError.message}`);
        }

        // Create test link in database
        const { error: linkError } = await supabase.from('node_test_links').upsert(
          {
            bpmn_file: bpmnFileName,
            bpmn_element_id: element.id,
            test_file_path: testFileKey,
            test_name: `Test for ${element.name || element.id}`,
          },
          {
            onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
          },
        );

        if (linkError) {
          console.warn(`Failed to create test link for ${element.id}:`, linkError);
        }

        result.testFiles.push({
          filePath: testFileKey,
          elementId: element.id,
          elementName: element.name || element.id,
          scenariosCount: llmScenarios?.length || 0,
        });
      } catch (error) {
        result.errors.push({
          elementId: element.id,
          elementName: element.name || element.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

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
          current: testableNodes.length,
          total: testableNodes.length + 1,
          status: 'generating',
          currentElement: 'Genererar E2E-scenarios...',
        });

        // Try to determine process name and initiative from BPMN file
        // Get process name from meta (first process) or use filename
        const firstProcess = parseResult.meta?.processes?.[0] || parseResult.meta;
        const processName = firstProcess?.name || parseResult.meta?.name || bpmnFileName.replace('.bpmn', '');
        const initiative = processName.includes('mortgage') ? 'Mortgage' : processName;

        const e2eScenarios = await generateE2eScenariosForProcess(
          bpmnFileName,
          processName,
          initiative,
          llmProvider,
          true, // allowFallback
          abortSignal,
          (progress) => {
            progressCallback?.({
              current: testableNodes.length + progress.current,
              total: testableNodes.length + progress.total,
              status: 'generating',
              currentElement: progress.currentPath || 'Genererar E2E-scenarios...',
            });
          }
        );

        if (e2eScenarios.length > 0) {
          // Save E2E scenarios to storage as JSON
          await saveE2eScenariosToStorage(bpmnFileName, e2eScenarios);
          
          console.log(`[testGenerators] Generated ${e2eScenarios.length} E2E scenarios for ${bpmnFileName}`);
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
    testFiles: [],
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
      aggregatedResult.testFiles.push(...fileResult.testFiles);
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











