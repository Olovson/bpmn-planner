import { useState } from 'react';
import { useBpmnParser } from './useBpmnParser';
import { generateAllFromBpmnWithGraph, GenerationResult } from '@/lib/bpmnGenerators';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateArtifactQueries } from '@/lib/queryInvalidation';

export interface GenerateOptions {
  overwriteDocs?: boolean;
  overwriteTests?: boolean;
  overwriteDorDod?: boolean;
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

export const useBpmnGenerator = (bpmnFilePath: string) => {
  const { parseResult, loading: parseLoading } = useBpmnParser(bpmnFilePath);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateAll = async (options: GenerateOptions = {}) => {
    const { overwriteDocs = true, overwriteTests = false, overwriteDorDod = false } = options;
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

      // Get list of existing BPMN files
      const bpmnFiles = [
        'mortgage.bpmn',
        'mortgage-se-application.bpmn',
        'mortgage-se-credit-evaluation.bpmn',
        'mortgage-se-credit-decision.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
        'mortgage-se-object-information.bpmn',
      ];

      // Get list of existing DMN files (will be populated as DMN files are added)
      const dmnFiles: string[] = [
        // Add DMN files here as they are created
        // Example: 'pre-screen-party.dmn',
      ];

      // Använd hierarkisk analys för toppnivåfiler (mortgage.bpmn)
      const topLevelFiles = ['mortgage.bpmn'];
      const useHierarchy = topLevelFiles.includes(parseResult.fileName || '');

      console.log(`Generating for ${parseResult.fileName} (hierarchy: ${useHierarchy})`);

      // Generate everything using hierarchical analysis
      const result = await generateAllFromBpmnWithGraph(
        parseResult.fileName || 'unknown.bpmn',
        bpmnFiles,
        dmnFiles,
        useHierarchy
      );

      setGenerationResult(result);

      // Save DoR/DoD to database based on options
      let dorDodSaved = 0;
      if (result.dorDod.size > 0) {
        if (overwriteDorDod) {
          // Overwrite: delete existing criteria for this file and insert new ones
          const subprocessNames = Array.from(result.dorDod.keys());
          const { error: deleteError } = await supabase
            .from('dor_dod_status')
            .delete()
            .in('subprocess_name', subprocessNames)
            .eq('bpmn_file', parseResult.fileName);

          if (deleteError) {
            console.error('Error deleting old DoR/DoD:', deleteError);
          }
        }

        const criteriaToInsert: any[] = [];
        
        result.dorDod.forEach((criteria, subprocessName) => {
          criteria.forEach(criterion => {
            criteriaToInsert.push({
              subprocess_name: subprocessName,
              ...criterion,
            });
          });
        });

        const { error: dbError, data } = await supabase
          .from('dor_dod_status')
          .upsert(criteriaToInsert, {
            onConflict: 'subprocess_name,criterion_key,criterion_type',
            ignoreDuplicates: !overwriteDorDod,
          });

        if (dbError) {
          console.error('Auto-save DoR/DoD error:', dbError);
        } else {
          dorDodSaved = criteriaToInsert.length;
        }
      }

      // Save test links to database
      let testLinksSaved = 0;
      let testFilesCreated = 0;
      if (result.metadata?.filesIncluded && result.metadata.filesIncluded.length > 0) {
        const testLinksToInsert: any[] = [];
        const jiraTypeMappingsToInsert: any[] = [];
        
        // For each file in the hierarchy, parse and create test links for testable nodes
        for (const includedFile of result.metadata.filesIncluded) {
          try {
            // Parse the file to get its elements
            const fileUrl = `https://wguequebmkccmdcrtlwb.supabase.co/storage/v1/object/public/bpmn-files/${includedFile}`;
            const response = await fetch(fileUrl);
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
      if (dorDodSaved > 0) {
        parts.push(`${dorDodSaved} DoR/DoD-kriterier${overwriteDorDod ? ' (överskrivna)' : ''}`);
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

  const saveDoRDoDToDatabase = async (silent = false) => {
    if (!generationResult?.dorDod.size) {
      if (!silent) {
        toast({
          title: 'Inget att spara',
          description: 'Generera DoR/DoD först',
          variant: 'destructive',
        });
      }
      return false;
    }

    try {
      const criteriaToInsert: any[] = [];

      generationResult.dorDod.forEach((criteria, subprocessName) => {
        criteria.forEach(criterion => {
          criteriaToInsert.push({
            subprocess_name: subprocessName,
            ...criterion,
          });
        });
      });

      const { error } = await supabase
        .from('dor_dod_status')
        .upsert(criteriaToInsert, {
          onConflict: 'subprocess_name,criterion_key,criterion_type',
        });

      if (error) throw error;

      if (!silent) {
        toast({
          title: 'Sparat!',
          description: `${criteriaToInsert.length} DoR/DoD-kriterier sparades till databasen`,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Save DoR/DoD error:', error);
      if (!silent) {
        toast({
          title: 'Sparfel',
          description: error instanceof Error ? error.message : 'Kunde inte spara DoR/DoD',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

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
    saveDoRDoDToDatabase,
    downloadTests,
    downloadDocs,
    generating,
    generationResult,
    parseLoading,
  };
};
