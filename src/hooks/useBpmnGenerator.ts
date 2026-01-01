import { useState } from 'react';
import { useBpmnParser } from './useBpmnParser';
import { generateAllFromBpmnWithGraph, GenerationResult } from '@/lib/bpmnGenerators';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateArtifactQueries } from '@/lib/queryInvalidation';
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';

export interface GenerateOptions {
  overwriteDocs?: boolean;
  overwriteTests?: boolean;
}

// Helper function to generate Playwright test content
function generatePlaywrightTestContent(
  element: { id: string; name: string; type: string },
  bpmnFile: string
): string {
  const nodeType = element.type;
  const nodeName = element.name;
  const nodeId = element.id;

  let testTemplate = `import { test, expect } from '@playwright/test';

test.describe('${nodeName} - ${bpmnFile}', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Navigate to the relevant page/view for this BPMN node
    // await page.goto('/');
  });

  test('happy path - ${nodeName}', async ({ page }) => {
    // TODO: Implement test for BPMN node
    // File: ${bpmnFile}
    // Node ID: ${nodeId}
    // Node Type: ${nodeType}
    // Node Name: ${nodeName}
    //
    // This is an auto-generated skeleton test.
    // Please adapt it to match your application's behavior.
`;

  // Add node-type-specific test scaffolding
  if (nodeType === 'UserTask') {
    testTemplate += `
    // Example for UserTask:
    // 1. Verify the form/UI elements are visible
    // 2. Fill in required fields
    // 3. Submit the form
    // 4. Verify successful completion
    
    // Example:
    // await expect(page.locator('[data-testid="${nodeId}-form"]')).toBeVisible();
    // await page.fill('[name="fieldName"]', 'test value');
    // await page.click('[data-testid="${nodeId}-submit"]');
    // await expect(page.locator('.success-message')).toBeVisible();
`;
  } else if (nodeType === 'ServiceTask') {
    testTemplate += `
    // Example for ServiceTask:
    // 1. Set up mock/intercept for the service call
    // 2. Trigger the service call
    // 3. Verify the request was made correctly
    // 4. Verify the response is handled properly
    
    // Example:
    // await page.route('**/api/service-endpoint', route => {
    //   route.fulfill({
    //     status: 200,
    //     body: JSON.stringify({ success: true, data: {} })
    //   });
    // });
    // await page.click('[data-testid="${nodeId}-trigger"]');
    // await expect(page.locator('.service-result')).toBeVisible();
`;
  } else if (nodeType === 'BusinessRuleTask') {
    testTemplate += `
    // Example for BusinessRuleTask:
    // 1. Provide input data for the business rules
    // 2. Trigger rule evaluation
    // 3. Verify the decision/output matches expected rules
    
    // Example:
    // await page.fill('[data-testid="rule-input-1"]', 'value1');
    // await page.fill('[data-testid="rule-input-2"]', 'value2');
    // await page.click('[data-testid="${nodeId}-evaluate"]');
    // await expect(page.locator('[data-testid="rule-result"]')).toHaveText('Expected Result');
`;
  } else if (nodeType === 'CallActivity') {
    testTemplate += `
    // Example for CallActivity (subprocess):
    // 1. Verify the subprocess can be invoked
    // 2. Verify data is passed correctly to the subprocess
    // 3. Verify the subprocess completes successfully
    // 4. Verify data is returned correctly
    
    // Example:
    // await page.click('[data-testid="${nodeId}-start"]');
    // await expect(page.locator('[data-testid="subprocess-indicator"]')).toBeVisible();
    // await page.waitForSelector('[data-testid="subprocess-complete"]');
    // await expect(page.locator('[data-testid="subprocess-result"]')).toBeVisible();
`;
  }

  testTemplate += `
    // Placeholder assertion - replace with actual test logic
    expect(true).toBe(true);
  });

  test('error handling - ${nodeName}', async ({ page }) => {
    // TODO: Test error scenarios for this node
    // - Invalid input
    // - Network failures
    // - Business rule violations
    // etc.
    
    expect(true).toBe(true);
  });
});
`;

  return testTemplate;
}

export const useBpmnGenerator = (bpmnFilePath: string | null) => {
  const { parseResult, loading: parseLoading } = useBpmnParser(bpmnFilePath);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateAll = async (options: GenerateOptions = {}) => {
    const { overwriteDocs = true, overwriteTests = false } = options;
    if (!parseResult) {
      toast({
        title: 'Fel',
        description: 'BPMN-filen måste parsas först',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      const { data: storedFiles, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name, file_type');

      if (filesError) {
        throw filesError;
      }

      const bpmnFiles = (storedFiles || [])
        .filter(file => file.file_type === 'bpmn')
        .map(file => file.file_name);

      const dmnFiles = (storedFiles || [])
        .filter(file => file.file_type === 'dmn')
        .map(file => file.file_name);

      // Använd hierarkisk analys för toppnivåfiler (mortgage.bpmn)
      const topLevelFiles = ['mortgage.bpmn'];
      const useHierarchy = topLevelFiles.includes(parseResult.fileName || '');

      console.log(`Generating for ${parseResult.fileName} (hierarchy: ${useHierarchy})`);

      // Generate everything using hierarchical analysis
      // Note: isActualRootFile is undefined here - will be inferred from graphFileScope length
      const result = await generateAllFromBpmnWithGraph(
        parseResult.fileName || 'unknown.bpmn',
        bpmnFiles,
        dmnFiles,
        useHierarchy,
        true,
        undefined, // progressCallback
        undefined, // generationSource
        undefined, // llmProvider
        undefined, // nodeFilter
        undefined, // getVersionHashForFile
        undefined, // checkCancellation
        undefined, // abortSignal
        undefined, // isActualRootFile - will be inferred
        false, // forceRegenerate: Default to false (respect Storage checks)
      );

      setGenerationResult(result);

      // DoR/DoD generation has been removed - no longer used

      // Save test links to database
      let testLinksSaved = 0;
      let testFilesCreated = 0;
      if (result.metadata?.filesIncluded && result.metadata.filesIncluded.length > 0) {
        const testLinksToInsert: any[] = [];
        const jiraTypeMappingsToInsert: any[] = [];
        const callActivityCandidates: CallActivityMappingCandidate[] = [];
        
        // For each file in the hierarchy, parse and create test links for testable nodes
        for (const includedFile of result.metadata.filesIncluded) {
          try {
            // Parse the file to get its elements
            const fileUrl = await getBpmnFileUrl(includedFile);
            const response = await fetch(fileUrl, { cache: 'no-store' });
            const xmlText = await response.text();
            
            // Simple regex to extract testable elements (UserTask, ServiceTask, BusinessRuleTask, CallActivity)
            const taskRegex = /<bpmn:(UserTask|ServiceTask|BusinessRuleTask|CallActivity)[^>]*id="([^"]+)"[^>]*name="([^"]*)"[^>]*>/g;
            let match;
            
            while ((match = taskRegex.exec(xmlText)) !== null) {
              const [, nodeType, elementId, elementName] = match;
              const testName = elementName || elementId;
              const testFileName = `${testName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
              const testFilePath = `tests/${testFileName}`;
              
              testLinksToInsert.push({
                bpmn_file: includedFile,
                bpmn_element_id: elementId,
                test_file_path: testFilePath,
                test_name: `Test for ${testName}`,
              });
              
              // Check if test file already exists in storage
              const { data: existingFiles } = await supabase.storage
                .from('bpmn-files')
                .list('tests', {
                  search: testFileName,
                });
              
              const fileExists = existingFiles && existingFiles.length > 0;
              
              if (!fileExists) {
                // Generate test file content
                const testContent = generatePlaywrightTestContent({
                  id: elementId,
                  name: testName,
                  type: nodeType,
                }, includedFile);
                
                // Upload test file to storage (convert string to Blob)
                const blob = new Blob([testContent], { type: 'text/plain' });
                const { error: uploadError } = await supabase.storage
                  .from('bpmn-files')
                  .upload(testFilePath, blob, {
                    contentType: 'text/plain',
                    upsert: false, // Don't overwrite existing files
                  });
                
                if (uploadError) {
                  console.error(`Failed to upload test file ${testFilePath}:`, uploadError);
                } else {
                  testFilesCreated++;
                  console.log(`Created test file: ${testFilePath}`);
                }
              }
              
              // Set default jira_type based on node type
              // CallActivity → "feature goal"
              // UserTask / ServiceTask / BusinessRuleTask → "epic"
              const defaultJiraType = nodeType === 'CallActivity' ? 'feature goal' : 'epic';
              
              jiraTypeMappingsToInsert.push({
                bpmn_file: includedFile,
                element_id: elementId,
                jira_type: defaultJiraType,
              });

              if (nodeType === 'CallActivity') {
                const matchedSubprocess = result.subprocessMappings.get(elementId);
                if (matchedSubprocess) {
                  callActivityCandidates.push({
                    bpmn_file: includedFile,
                    element_id: elementId,
                    subprocess_bpmn_file: matchedSubprocess,
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error processing test links for ${includedFile}:`, error);
          }
        }
        
        if (testLinksToInsert.length > 0) {
          const { error: testLinksError } = await supabase
            .from('node_test_links')
            .upsert(testLinksToInsert, {
              onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
              ignoreDuplicates: !overwriteTests,
            });
            
          if (testLinksError) {
            console.error('Auto-save test links error:', testLinksError);
          } else {
            testLinksSaved = testLinksToInsert.length;
            console.log(`Created ${testLinksSaved} test links across ${result.metadata.filesIncluded.length} files`);
          }
        }
        
        // Initialize jira_type for new nodes (only if they don't exist)
        if (jiraTypeMappingsToInsert.length > 0) {
          const { error: jiraTypeError } = await supabase
            .from('bpmn_element_mappings')
            .upsert(jiraTypeMappingsToInsert, {
              onConflict: 'bpmn_file,element_id',
              ignoreDuplicates: true, // Don't overwrite existing jira_type values
            });
            
          if (jiraTypeError) {
            console.error('Auto-initialize jira_type error:', jiraTypeError);
          } else {
            console.log(`Initialized jira_type for ${jiraTypeMappingsToInsert.length} nodes`);
          }
        }

        // Populate subprocess mappings for Call Activities
        if (callActivityCandidates.length > 0) {
          const filesToCheck = Array.from(new Set(callActivityCandidates.map((item) => item.bpmn_file)));
          const { data: existingMappings, error: mappingsError } = await supabase
            .from('bpmn_element_mappings')
            .select('id,bpmn_file,element_id,subprocess_bpmn_file')
            .in('bpmn_file', filesToCheck);

          if (mappingsError) {
            console.error('Failed to load existing subprocess mappings:', mappingsError);
          } else {
            const mappingIndex = new Map(
              (existingMappings || []).map((row) => [`${row.bpmn_file}:${row.element_id}`, row])
            );

            const subprocessInserts: CallActivityMappingCandidate[] = [];
            const subprocessUpdates: { id: string; subprocess_bpmn_file: string }[] = [];

            callActivityCandidates.forEach((candidate) => {
              const key = `${candidate.bpmn_file}:${candidate.element_id}`;
              const existing = mappingIndex.get(key);
              if (existing?.subprocess_bpmn_file === candidate.subprocess_bpmn_file) {
                return;
              }

              if (existing?.id) {
                subprocessUpdates.push({
                  id: existing.id,
                  subprocess_bpmn_file: candidate.subprocess_bpmn_file,
                });
              } else {
                subprocessInserts.push(candidate);
              }
            });

            if (subprocessInserts.length > 0) {
              const { error: insertError } = await supabase
                .from('bpmn_element_mappings')
                .insert(subprocessInserts);
              if (insertError) {
                console.error('Failed to insert subprocess mappings:', insertError);
              } else {
                console.log(`Inserted ${subprocessInserts.length} subprocess mappings`);
              }
            }

            if (subprocessUpdates.length > 0) {
              for (const update of subprocessUpdates) {
                const { error: updateError } = await supabase
                  .from('bpmn_element_mappings')
                  .update({ subprocess_bpmn_file: update.subprocess_bpmn_file })
                  .eq('id', update.id);
                if (updateError) {
                  console.error('Failed to update subprocess mapping:', updateError);
                }
              }
              console.log(`Updated ${subprocessUpdates.length} subprocess mappings`);
            }
          }
        }
        
        // Invalidate artifact-related queries so the file list refreshes
        invalidateArtifactQueries(queryClient);
      }

      // Build result message
      const parts: string[] = [];
      if (result.tests.size > 0) {
        parts.push(`${result.tests.size} test${overwriteTests ? ' (överskrivna)' : 'skelett'}`);
      }
      if (testFilesCreated > 0) {
        parts.push(`${testFilesCreated} testfiler skapade`);
      }
      if (testLinksSaved > 0) {
        parts.push(`${testLinksSaved} test-kopplingar`);
      }
      if (result.docs.size > 0) {
        parts.push(`${result.docs.size} dokumentationssid${result.docs.size === 1 ? 'a' : 'or'}${overwriteDocs ? ' (överskrivna)' : ''}`);
      }

      let message = `Genererade ${parts.join(', ')}`;
      
      // Add hierarchy info if used
      if (result.metadata?.hierarchyUsed) {
        message += `\n\n📊 Hierarkisk analys:\n${result.metadata.totalFilesAnalyzed} filer analyserade, ${result.metadata.hierarchyDepth} nivåers djup`;
      }

      toast({
        title: 'Generering klar!',
        description: message,
      });

      return result;
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Genereringsfel',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // DoR/DoD generation has been removed - no longer used

  const downloadTests = () => {
    if (!generationResult?.tests.size) {
      toast({
        title: 'Inga tester',
        description: 'Generera tester först',
        variant: 'destructive',
      });
      return;
    }

    generationResult.tests.forEach((content, filename) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    toast({
      title: 'Nedladdning klar!',
      description: `${generationResult.tests.size} testfiler nedladdade`,
    });
  };

  const downloadDocs = () => {
    if (!generationResult?.docs.size) {
      toast({
        title: 'Ingen dokumentation',
        description: 'Generera dokumentation först',
        variant: 'destructive',
      });
      return;
    }

    generationResult.docs.forEach((content, filename) => {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    toast({
      title: 'Nedladdning klar!',
      description: `${generationResult.docs.size} dokumentationsfiler nedladdade`,
    });
  };

  return {
    generateAll,
    downloadTests,
    downloadDocs,
    generating,
    generationResult,
    parseLoading,
  };
};
interface CallActivityMappingCandidate {
  bpmn_file: string;
  element_id: string;
  subprocess_bpmn_file: string;
}
