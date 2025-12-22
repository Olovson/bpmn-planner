/**
 * Separated test generation functions
 * These functions generate test files independently from documentation generation
 */

import { parseBpmnFile, type BpmnElement } from '@/lib/bpmnParser';
import { buildBpmnProcessGraph, getTestableNodes } from '@/lib/bpmnProcessGraph';
import { generateTestSpecWithLlm } from '@/lib/llmTests';
import { generateTestSkeleton } from '@/lib/bpmnGenerators';
import { getNodeTestFileKey } from '@/lib/nodeArtifactPaths';
import { supabase } from '@/integrations/supabase/client';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { isLlmEnabled } from '@/lib/llmClient';

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
    const testableNodes = getTestableNodes(graph);

    if (testableNodes.length === 0) {
      return result; // No testable nodes
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










