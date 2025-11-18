import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();
    
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting artifact generation for file: ${fileName}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check if file exists in bpmn_files
    const { data: fileData, error: fileError } = await supabase
      .from('bpmn_files')
      .select('*')
      .eq('file_name', fileName)
      .single();

    if (fileError || !fileData) {
      console.error('File not found:', fileError);
      return new Response(
        JSON.stringify({ error: 'File not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only support BPMN files for now
    if (fileData.file_type !== 'bpmn') {
      return new Response(
        JSON.stringify({ error: 'Only BPMN files are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('bpmn-files')
      .download(fileData.storage_path);

    if (downloadError || !fileBlob) {
      console.error('File download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileContent = await fileBlob.text();
    console.log(`Downloaded file content, size: ${fileContent.length} bytes`);

    // 3. Parse BPMN (simplified parsing - extract basic elements)
    const elements = parseBpmnContent(fileContent, fileName);
    console.log(`Parsed ${elements.length} elements from BPMN`);

    // 4. Generate DoR/DoD criteria
    const dorDodCriteria = generateDoRDoD(elements, fileName);
    console.log(`Generated ${dorDodCriteria.length} DoR/DoD criteria`);

    // 5. Save DoR/DoD to database
    if (dorDodCriteria.length > 0) {
      const { error: dorDodError } = await supabase
        .from('dor_dod_status')
        .upsert(dorDodCriteria, {
          onConflict: 'subprocess_name,criterion_key,criterion_type',
        });

      if (dorDodError) {
        console.error('DoR/DoD save error:', dorDodError);
        throw new Error('Failed to save DoR/DoD criteria');
      }
    }

    // 6. Build dependencies for process tree
    const dependencies = buildDependencies(elements, fileName);
    console.log(`Found ${dependencies.length} dependencies`);

    if (dependencies.length > 0) {
      const { error: depsError } = await supabase
        .from('bpmn_dependencies')
        .upsert(dependencies, {
          onConflict: 'parent_file,child_process',
        });

      if (depsError) {
        console.error('Dependencies save error:', depsError);
      }
    }

    // 7. Generate basic documentation HTML
    const docHtml = generateDocumentationHtml(elements, fileName);
    const docPath = `${fileName.replace('.bpmn', '')}.html`;
    const docsPath = `docs/${docPath}`;
    const blob = new Blob([docHtml], { type: 'text/html' });

    let docUploadError = null;

    // Försök först ladda upp utan upsert
    const uploadResult = await supabase.storage
      .from('bpmn-files')
      .upload(docsPath, blob, {
        upsert: false,
        contentType: 'text/html; charset=utf-8',
      });

    docUploadError = uploadResult.error;

    if (docUploadError) {
      const message = String(docUploadError.message || (docUploadError as any).error_description || '');
      const statusCode = (uploadResult as any).status || (docUploadError as any).statusCode;
      const isAlreadyExists =
        statusCode === 409 ||
        statusCode === '409' ||
        message.toLowerCase().includes('resource already exists') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('already exists');

      if (isAlreadyExists) {
        console.log(`Doc ${docsPath} already exists, updating with correct contentType...`);

        const { error: updateError } = await supabase.storage
          .from('bpmn-files')
          .update(docsPath, blob, {
            contentType: 'text/html; charset=utf-8',
          });

        if (updateError) {
          console.error('Documentation update error:', updateError);
        } else {
          console.log(`Documentation updated: ${docsPath}`);
        }
      } else {
        console.error('Documentation upload error:', docUploadError);
      }
    } else {
      console.log(`Documentation generated: ${docsPath}`);
    }

    // 8. Create test links and generate test files for testable nodes
    const testableElements = elements.filter(e => 
      ['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(e.type)
    );

    const testLinks = testableElements.map(element => ({
      bpmn_file: fileName,
      bpmn_element_id: element.id,
      test_file_path: `tests/${element.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`,
      test_name: `Test for ${element.name}`,
    }));

    let testFilesCreated = 0;

    // Generate and upload actual test files
    for (const element of testableElements) {
      const testFileName = `${element.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
      const testFilePath = `tests/${testFileName}`;
      
      // Check if test file already exists in storage
      const { data: existingFile } = await supabase.storage
        .from('bpmn-files')
        .list('tests', {
          search: testFileName,
        });
      
      const fileExists = existingFile && existingFile.length > 0;
      
      if (!fileExists) {
        // Generate test file content
        const testContent = generatePlaywrightTest(element, fileName);
        
        // Upload test file to storage
        const { error: uploadError } = await supabase.storage
          .from('bpmn-files')
          .upload(testFilePath, testContent, {
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
    }

    if (testLinks.length > 0) {
      const { error: testLinksError } = await supabase
        .from('node_test_links')
        .upsert(testLinks, {
          onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
        });

      if (testLinksError) {
        console.error('Test links save error:', testLinksError);
      } else {
        console.log(`Created ${testLinks.length} test links`);
      }
    }

    // 9. Initialize jira_type and jira_name for testable nodes with defaults
    // CallActivity → "feature goal"
    // UserTask / ServiceTask / BusinessRuleTask → "epic"
    
    // Build full BPMN hierarchy starting from root (mortgage.bpmn)
    // This mirrors the logic in src/lib/bpmnHierarchy.ts
    console.log(`Building hierarchy for ${fileName}...`);
    const rootHierarchy = await buildBpmnHierarchyForFile('mortgage.bpmn', supabase);
    
    if (!rootHierarchy) {
      console.error('Failed to build root hierarchy');
      return new Response(
        JSON.stringify({ error: 'Failed to build BPMN hierarchy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Root hierarchy built:`, JSON.stringify(rootHierarchy, null, 2));
    
    const jiraTypeMappings = [];
    
    for (const element of testableElements) {
      const defaultJiraType = element.type === 'CallActivity' ? 'feature goal' : 'epic';
      
      // Find this element in the hierarchy to get its full parentPath
      const elementParentPath = findElementInHierarchy(rootHierarchy, element.id);
      
      // Build jira_name: full parentPath + element name (for epics)
      // Skip the first element (root "Mortgage") to avoid redundancy
      const pathParts = elementParentPath ? elementParentPath.slice(1) : element.parentPath || [];
      
      // For epics (UserTask, ServiceTask, BusinessRuleTask), add the node name
      if (element.type !== 'CallActivity') {
        pathParts.push(element.name);
      }
      
      const jiraName = pathParts.join(' - ');
      
      console.log(`Setting Jira mapping for ${element.id}:`, {
        type: defaultJiraType,
        name: jiraName,
        hierarchyPath: elementParentPath,
        localParentPath: element.parentPath,
        elementName: element.name
      });
      
      // Always set/overwrite jira_type and jira_name on generation
      // This ensures clean regeneration after reset
      jiraTypeMappings.push({
        bpmn_file: fileName,
        element_id: element.id,
        jira_type: defaultJiraType,
        jira_name: jiraName,
      });
    }

    if (jiraTypeMappings.length > 0) {
      const { error: jiraTypeError } = await supabase
        .from('bpmn_element_mappings')
        .upsert(jiraTypeMappings, {
          onConflict: 'bpmn_file,element_id',
          ignoreDuplicates: false, // Allow updating NULL values
        });

      if (jiraTypeError) {
        console.error('Jira type/name initialization error:', jiraTypeError);
      } else {
        console.log(`Initialized jira_type/jira_name for ${jiraTypeMappings.length} nodes`);
      }
    }

    // 9b. Create subprocess_bpmn_file mappings for CallActivities
    // This ensures double-clicking CallActivities in the viewer works
    const callActivities = elements.filter(e => e.type === 'CallActivity');
    const subprocessMappings = [];
    
    // Fetch all available BPMN files from database
    const { data: availableBpmnFiles } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn');
    
    const availableFileNames = new Set(
      (availableBpmnFiles || []).map(f => f.file_name)
    );
    
    console.log(`Found ${callActivities.length} CallActivities, available BPMN files:`, Array.from(availableFileNames));
    
    for (const callActivity of callActivities) {
      // Try naming conventions:
      // 1. mortgage-se-{element-id}.bpmn
      // 2. {element-id}.bpmn
      const elementId = callActivity.id.toLowerCase();
      const potentialFiles = [
        `mortgage-se-${elementId}.bpmn`,
        `${elementId}.bpmn`
      ];
      
      let matchedFile = null;
      for (const potentialFile of potentialFiles) {
        if (availableFileNames.has(potentialFile)) {
          matchedFile = potentialFile;
          break;
        }
      }
      
      if (matchedFile) {
        subprocessMappings.push({
          bpmn_file: fileName,
          element_id: callActivity.id,
          subprocess_bpmn_file: matchedFile,
        });
        console.log(`Mapped CallActivity ${callActivity.id} → ${matchedFile}`);
      } else {
        console.warn(`No matching BPMN file found for CallActivity ${callActivity.id}`);
      }
    }
    
    if (subprocessMappings.length > 0) {
      const { error: subprocessMappingError } = await supabase
        .from('bpmn_element_mappings')
        .upsert(subprocessMappings, {
          onConflict: 'bpmn_file,element_id',
          ignoreDuplicates: false,
        });
      
      if (subprocessMappingError) {
        console.error('Subprocess mapping error:', subprocessMappingError);
      } else {
        console.log(`Created ${subprocessMappings.length} subprocess mappings`);
      }
    }

    // 10. Generate E2E scenarios for top-level processes (e.g., mortgage.bpmn)
    let e2eScenariosCreated = 0;
    let e2eTestFileCreated = false;
    
    if (fileName.toLowerCase() === 'mortgage.bpmn') {
      console.log('Generating E2E scenarios for mortgage process...');
      
      // Extract initiative name from root hierarchy
      const initiative = rootHierarchy?.name || 'Mortgage';
      
      const e2eScenarios = generateE2EScenarios(elements, fileName, initiative);
      console.log(`Generated ${e2eScenarios.length} E2E scenarios`);
      
      if (e2eScenarios.length > 0) {
        // Save E2E scenarios to database
        const { error: e2eError } = await supabase
          .from('e2e_scenarios')
          .upsert(
            e2eScenarios.map(scenario => ({
              initiative: scenario.initiative,
              name: scenario.name,
              description: scenario.description,
              bpmn_file: scenario.bpmnFile,
              path: scenario.path,
              tags: scenario.tags,
              test_file_path: `tests/e2e/${fileName.replace('.bpmn', '-e2e.spec.ts')}`,
            })),
            {
              onConflict: 'initiative,name',
              ignoreDuplicates: false,
            }
          );
        
        if (e2eError) {
          console.error('E2E scenarios save error:', e2eError);
        } else {
          e2eScenariosCreated = e2eScenarios.length;
          console.log(`Saved ${e2eScenariosCreated} E2E scenarios to database`);
        }
        
        // Generate E2E test file
        const e2eTestContent = generateE2ETestFile(e2eScenarios);
        const e2eTestPath = `tests/e2e/${fileName.replace('.bpmn', '-e2e.spec.ts')}`;
        
        const { error: e2eTestUploadError } = await supabase.storage
          .from('bpmn-files')
          .upload(e2eTestPath, e2eTestContent, {
            contentType: 'text/plain',
            upsert: true, // Allow updating E2E test structure
          });
        
        if (e2eTestUploadError) {
          console.error('E2E test file upload error:', e2eTestUploadError);
        } else {
          e2eTestFileCreated = true;
          console.log(`Created E2E test file: ${e2eTestPath}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: {
          dor_dod_count: dorDodCriteria.length,
          elements_parsed: elements.length,
          dependencies_count: dependencies.length,
          test_links_count: testLinks.length,
          test_files_created: testFilesCreated,
          jira_type_initialized: jiraTypeMappings.length,
          documentation_created: !docUploadError,
          e2e_scenarios_created: e2eScenariosCreated,
          e2e_test_file_created: e2eTestFileCreated,
        },
        message: `Successfully generated artifacts for ${fileName}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-artifacts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions

interface BpmnElement {
  id: string;
  name: string;
  type: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity' | 'SubProcess';
  parentPath?: string[]; // Array of parent CallActivity names from root to this element
}

function generatePlaywrightTest(element: BpmnElement, bpmnFile: string): string {
  const nodeType = element.type;
  const nodeName = element.name;
  const nodeId = element.id;
  
  // Build hierarchical context for comment
  const contextPath = element.parentPath && element.parentPath.length > 0
    ? element.parentPath.join(' → ') + ' → ' + nodeName
    : nodeName;

  let testTemplate = `import { test, expect } from '@playwright/test';

/**
 * Hierarchical Test for: ${contextPath}
 * BPMN File: ${bpmnFile}
 * Node ID: ${nodeId}
 * Node Type: ${nodeType}
 * 
 * This test is part of a hierarchical test structure.
 * Parent context: ${element.parentPath?.join(' / ') || 'Root'}
 */

test.describe('${nodeName}', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Navigate to the relevant page/view for this BPMN node
    // await page.goto('/');
  });

  test('happy path - ${nodeName}', async ({ page }) => {
    // TODO: Implement test for ${nodeName}
    // Context: ${contextPath}
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

/**
 * Recursively build BPMN hierarchy for a file
 * This mirrors the logic in src/lib/bpmnHierarchy.ts to ensure consistency
 * between the Process Explorer tree and Jira naming
 */
interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  bpmnFile: string;
  children: HierarchyNode[];
  parentPath: string[];
}

async function buildBpmnHierarchyForFile(
  fileName: string,
  supabase: any,
  parentPath: string[] = []
): Promise<HierarchyNode | null> {
  // Download the BPMN file
  const { data: fileData } = await supabase
    .from('bpmn_files')
    .select('storage_path')
    .eq('file_name', fileName)
    .single();
  
  if (!fileData) {
    console.error(`File not found: ${fileName}`);
    return null;
  }
  
  const { data: fileBlob } = await supabase.storage
    .from('bpmn-files')
    .download(fileData.storage_path);
  
  if (!fileBlob) {
    console.error(`Could not download file: ${fileName}`);
    return null;
  }
  
  const content = await fileBlob.text();
  
  // Extract context root from process name or filename
  let contextRoot: string;
  const processMatch = /<bpmn:process[^>]*name="([^"]+)"/.exec(content);
  
  if (fileName.toLowerCase() === 'mortgage.bpmn') {
    contextRoot = 'Mortgage';
  } else if (processMatch) {
    contextRoot = processMatch[1];
  } else {
    // Fallback: extract from filename
    contextRoot = fileName
      .replace('.bpmn', '')
      .replace('mortgage-se-', '')
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Create root node
  const rootNode: HierarchyNode = {
    id: `root_${fileName}`,
    name: contextRoot,
    type: 'Process',
    bpmnFile: fileName,
    children: [],
    parentPath: parentPath,
  };
  
  // Extract all CallActivities from this file
  const callActivityMatches = [...content.matchAll(/<bpmn:callActivity id="([^"]+)"[^>]*name="([^"]+)"/g)];
  
  // Get dependencies to find child files
  const { data: deps } = await supabase
    .from('bpmn_dependencies')
    .select('child_process, child_file')
    .eq('parent_file', fileName);
  
  const depMap = new Map<string, string | null>();
  if (deps) {
    deps.forEach((dep: any) => {
      depMap.set(dep.child_process, dep.child_file);
    });
  }
  
  // Build children recursively
  const currentParentPath = [...parentPath, contextRoot];
  
  for (const match of callActivityMatches) {
    const callActivityId = match[1];
    const callActivityName = match[2];
    const childFile = depMap.get(callActivityId);
    
    if (childFile) {
      // Recursively build child hierarchy
      const childNode = await buildBpmnHierarchyForFile(childFile, supabase, currentParentPath);
      if (childNode) {
        rootNode.children.push(childNode);
      }
    } else {
      // CallActivity without a child file (e.g., not yet linked)
      rootNode.children.push({
        id: callActivityId,
        name: callActivityName,
        type: 'CallActivity',
        bpmnFile: fileName,
        children: [],
        parentPath: currentParentPath,
      });
    }
  }
  
  return rootNode;
}

/**
 * Extract parentPath for a specific element within a file's hierarchy
 */
function findElementInHierarchy(node: HierarchyNode, elementId: string, currentPath: string[] = []): string[] | null {
  // Check if this is the element we're looking for (but skip root nodes)
  if (node.id === elementId && node.type !== 'Process') {
    return currentPath;
  }
  
  // Search children
  const childPath = node.type === 'Process' ? currentPath : [...currentPath, node.name];
  
  for (const child of node.children) {
    const found = findElementInHierarchy(child, elementId, childPath);
    if (found !== null) {
      return found;
    }
  }
  
  return null;
}

function parseBpmnContent(content: string, fileName: string): BpmnElement[] {
  const elements: BpmnElement[] = [];
  
  // Extract process name as context root
  const processMatch = /<bpmn:process[^>]*name="([^"]+)"/.exec(content);
  const contextRoot = processMatch ? processMatch[1] : fileName.replace('.bpmn', '').replace(/-/g, ' ');
  
  // Parse with hierarchy awareness - build a map of parent elements
  const containerMap = new Map<string, string[]>(); // elementId -> parent CallActivity path
  
  // First pass: identify all CallActivities and SubProcesses as potential containers
  const callActivityMatches = [...content.matchAll(/<bpmn:callActivity id="([^"]+)"[^>]*name="([^"]+)"/g)];
  const subProcessMatches = [...content.matchAll(/<bpmn:subProcess id="([^"]+)"[^>]*name="([^"]+)"/g)];
  
  // Build hierarchy by parsing nested structure
  // Look for elements within <bpmn:subProcess> or <bpmn:callActivity> blocks
  const buildHierarchy = (containerId: string, containerName: string, containerType: string) => {
    // Find the container's XML block
    const containerPattern = new RegExp(
      `<bpmn:${containerType}[^>]*id="${containerId}"[^>]*>([\\s\\S]*?)<\\/bpmn:${containerType}>`,
      'g'
    );
    const containerMatch = containerPattern.exec(content);
    if (!containerMatch) return;
    
    const containerContent = containerMatch[1];
    
    // Find all tasks within this container
    const taskPatterns = [
      { type: 'UserTask', regex: /<bpmn:userTask id="([^"]+)"/g },
      { type: 'ServiceTask', regex: /<bpmn:serviceTask id="([^"]+)"/g },
      { type: 'BusinessRuleTask', regex: /<bpmn:businessRuleTask id="([^"]+)"/g },
    ];
    
    for (const { regex } of taskPatterns) {
      let match;
      while ((match = regex.exec(containerContent)) !== null) {
        const taskId = match[1];
        const existingPath = containerMap.get(taskId) || [];
        containerMap.set(taskId, [...existingPath, containerName]);
      }
    }
    
    // Look for nested CallActivities
    const nestedCallActivities = [...containerContent.matchAll(/<bpmn:callActivity id="([^"]+)"[^>]*name="([^"]+)"/g)];
    for (const nestedMatch of nestedCallActivities) {
      const nestedId = nestedMatch[1];
      const nestedName = nestedMatch[2];
      const existingPath = containerMap.get(nestedId) || [];
      containerMap.set(nestedId, [...existingPath, containerName]);
    }
  };
  
  // Build hierarchy for all CallActivities
  for (const match of callActivityMatches) {
    buildHierarchy(match[1], match[2], 'callActivity');
  }
  
  // Build hierarchy for all SubProcesses
  for (const match of subProcessMatches) {
    buildHierarchy(match[1], match[2], 'subProcess');
  }
  
  // Second pass: extract all elements with their hierarchy
  const taskPatterns = [
    { type: 'UserTask' as const, regex: /<bpmn:userTask id="([^"]+)"[^>]*name="([^"]+)"/g },
    { type: 'ServiceTask' as const, regex: /<bpmn:serviceTask id="([^"]+)"[^>]*name="([^"]+)"/g },
    { type: 'BusinessRuleTask' as const, regex: /<bpmn:businessRuleTask id="([^"]+)"[^>]*name="([^"]+)"/g },
    { type: 'CallActivity' as const, regex: /<bpmn:callActivity id="([^"]+)"[^>]*name="([^"]+)"/g },
    { type: 'SubProcess' as const, regex: /<bpmn:subProcess id="([^"]+)"[^>]*name="([^"]+)"/g },
  ];

  for (const { type, regex } of taskPatterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const elementId = match[1];
      const elementName = match[2] || match[1];
      elements.push({
        id: elementId,
        name: elementName,
        type,
        parentPath: containerMap.get(elementId) || [],
      });
    }
  }

  return elements;
}

interface DoRDoDCriterion {
  subprocess_name: string;
  bpmn_file: string;
  bpmn_element_id: string;
  node_type: string;
  criterion_type: 'dor' | 'dod';
  criterion_category: string;
  criterion_key: string;
  criterion_text: string;
  is_completed: boolean;
}

function generateDoRDoD(elements: BpmnElement[], fileName: string): DoRDoDCriterion[] {
  const criteria: DoRDoDCriterion[] = [];

  elements.forEach(element => {
    const subprocessName = element.id.toLowerCase();

    // Get node-type specific criteria
    const dorTemplates = getDorTemplatesForNodeType(element.type);
    const dodTemplates = getDodTemplatesForNodeType(element.type);

    dorTemplates.forEach(template => {
      criteria.push({
        subprocess_name: subprocessName,
        bpmn_file: fileName,
        bpmn_element_id: element.id,
        node_type: element.type,
        criterion_type: 'dor',
        criterion_category: template.category,
        criterion_key: `${subprocessName}_${template.key}`,
        criterion_text: template.text,
        is_completed: false,
      });
    });

    dodTemplates.forEach(template => {
      criteria.push({
        subprocess_name: subprocessName,
        bpmn_file: fileName,
        bpmn_element_id: element.id,
        node_type: element.type,
        criterion_type: 'dod',
        criterion_category: template.category,
        criterion_key: `${subprocessName}_${template.key}`,
        criterion_text: template.text,
        is_completed: false,
      });
    });
  });

  return criteria;
}

function getDorTemplatesForNodeType(nodeType: BpmnElement['type']) {
  const common = [
    { category: 'process_krav', key: 'process_defined', text: 'Processflöde är definierat och godkänt' },
    { category: 'data_input_output', key: 'data_model', text: 'Datamodell för in- och utdata är specificerad' },
    { category: 'planering_beroenden', key: 'dependencies', text: 'Beroenden till andra processer är kartlagda' },
    { category: 'team_alignment', key: 'team_aligned', text: 'Teamet har förståelse för kravet' },
  ];

  switch (nodeType) {
    case 'UserTask':
      return [
        ...common,
        { category: 'design', key: 'ui_mockups', text: 'UI-mockups finns i Figma' },
        { category: 'design', key: 'ux_flow', text: 'User flow och interaktionsdesign är definierad' },
        { category: 'funktion_krav', key: 'user_requirements', text: 'Användarberättelser och acceptanskriterier är dokumenterade' },
        { category: 'test_kvalitet', key: 'user_acceptance', text: 'UAT-kriterier är definierade' },
      ];
    
    case 'ServiceTask':
      return [
        ...common,
        { category: 'teknik_arkitektur', key: 'api_design', text: 'API-kontrakt och endpoints är definierade' },
        { category: 'data_api', key: 'integration_spec', text: 'Integrationsspecifikation med externa system är klar' },
        { category: 'teknik_arkitektur', key: 'error_handling', text: 'Felhanteringsstrategi är dokumenterad' },
        { category: 'test_kvalitet', key: 'integration_tests', text: 'Krav på integrationstester är specificerade' },
      ];
    
    case 'BusinessRuleTask':
      return [
        ...common,
        { category: 'process_krav', key: 'business_rules', text: 'Affärsregler är dokumenterade och validerade' },
        { category: 'data_input_output', key: 'decision_table', text: 'Beslutstabeller/DMN är definierade' },
        { category: 'funktion_krav', key: 'rule_logic', text: 'Regellogik är granskad av business analysts' },
        { category: 'test_kvalitet', key: 'rule_test_cases', text: 'Testscenarier för alla regelkombinationer är identifierade' },
      ];
    
    case 'CallActivity':
      return [
        ...common,
        { category: 'process_krav', key: 'subprocess_defined', text: 'Subprocess är definierad och publicerad' },
        { category: 'data_input_output', key: 'parameter_mapping', text: 'Input/output-mappning mellan processer är specificerad' },
        { category: 'planering_beroenden', key: 'subprocess_version', text: 'Subprocess-version och kompatibilitet är säkerställd' },
        { category: 'test_kvalitet', key: 'integration_test', text: 'Integrationstestplan mellan processer finns' },
      ];
    
    case 'SubProcess':
      return [
        ...common,
        { category: 'process_krav', key: 'sub_flow', text: 'Subprocessens delflöden är dokumenterade' },
        { category: 'teknik_arkitektur', key: 'scope_boundary', text: 'Scope och gränser för subprocess är tydliga' },
        { category: 'data_input_output', key: 'subprocess_data', text: 'Subprocess datakrav är definierade' },
      ];
    
    default:
      return common;
  }
}

function getDodTemplatesForNodeType(nodeType: BpmnElement['type']) {
  const common = [
    { category: 'test_kvalitet', key: 'tests_passing', text: 'Alla tester är gröna' },
    { category: 'test_kvalitet', key: 'code_review', text: 'Code review är genomförd och godkänd' },
    { category: 'dokumentation', key: 'docs_updated', text: 'Dokumentation är uppdaterad' },
    { category: 'overlamning', key: 'demo', text: 'Demo genomförd för stakeholders' },
  ];

  switch (nodeType) {
    case 'UserTask':
      return [
        ...common,
        { category: 'funktion_krav', key: 'ui_implemented', text: 'UI är implementerat enligt mockups' },
        { category: 'test_kvalitet', key: 'uat_passed', text: 'UAT är genomfört och godkänt' },
        { category: 'design', key: 'accessibility', text: 'Tillgänglighetskrav (WCAG) är uppfyllda' },
        { category: 'teknik_drift', key: 'ux_metrics', text: 'UX-metriker och tracking är implementerat' },
      ];
    
    case 'ServiceTask':
      return [
        ...common,
        { category: 'funktion_krav', key: 'api_implemented', text: 'API-endpoints är implementerade och testade' },
        { category: 'test_kvalitet', key: 'integration_tests', text: 'Integrationstester mot externa system är gröna' },
        { category: 'teknik_drift', key: 'error_handling', text: 'Felhantering och retry-logik är verifierad' },
        { category: 'teknik_drift', key: 'monitoring', text: 'Monitoring, logging och alerting är konfigurerat' },
        { category: 'teknik_drift', key: 'performance', text: 'Performance-krav är verifierade (latens, throughput)' },
      ];
    
    case 'BusinessRuleTask':
      return [
        ...common,
        { category: 'funktion_krav', key: 'rules_implemented', text: 'Alla affärsregler är implementerade korrekt' },
        { category: 'test_kvalitet', key: 'rule_coverage', text: '100% testtäckning av regelkombinationer' },
        { category: 'test_kvalitet', key: 'rule_validation', text: 'Regelvalidering med business analysts är genomförd' },
        { category: 'dokumentation', key: 'decision_logic', text: 'Beslutslogik är dokumenterad i DMN/tabellformat' },
      ];
    
    case 'CallActivity':
      return [
        ...common,
        { category: 'funktion_krav', key: 'subprocess_integration', text: 'Integration med subprocess fungerar korrekt' },
        { category: 'test_kvalitet', key: 'e2e_tests', text: 'End-to-end tester över processgränser är gröna' },
        { category: 'teknik_drift', key: 'subprocess_monitoring', text: 'Monitoring av subprocess-anrop är implementerat' },
        { category: 'data_api', key: 'data_flow', text: 'Dataflöde mellan processer är verifierat' },
      ];
    
    case 'SubProcess':
      return [
        ...common,
        { category: 'funktion_krav', key: 'subprocess_complete', text: 'Alla delar av subprocess är implementerade' },
        { category: 'test_kvalitet', key: 'subprocess_tests', text: 'Subprocess-specifika tester är gröna' },
        { category: 'teknik_drift', key: 'deployment', text: 'Subprocess är deployad och integrerad' },
      ];
    
    default:
      return common;
  }
}

function buildDependencies(elements: BpmnElement[], parentFile: string) {
  const dependencies = [];
  
  for (const element of elements) {
    if (element.type === 'CallActivity') {
      dependencies.push({
        parent_file: parentFile,
        child_process: element.id,
        child_file: null, // Will be resolved later when matching files exist
      });
    }
  }
  
  return dependencies;
}

function generateDocumentationHtml(elements: BpmnElement[], fileName: string): string {
  const processName = fileName.replace('.bpmn', '');
  
  let html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${processName} - Dokumentation</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .element { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .element-type { color: #007acc; font-weight: bold; }
    .element-name { font-size: 1.2em; margin: 5px 0; }
  </style>
</head>
<body>
  <h1>${processName}</h1>
  <p>Autogenerad dokumentation från BPMN-fil: ${fileName}</p>
  
  <h2>Process Elements (${elements.length})</h2>
`;

  elements.forEach(element => {
    html += `
  <div class="element">
    <div class="element-type">${element.type}</div>
    <div class="element-name">${element.name}</div>
    <div>ID: <code>${element.id}</code></div>
  </div>`;
  });

  html += `
</body>
</html>`;

  return html;
}

// E2E Scenario Generation

interface E2EScenario {
  initiative: string;
  name: string;
  description: string;
  bpmnFile: string;
  path: {
    subprocessName: string;
    featureGoals: string[];
    keyNodes: string[];
  };
  tags: string[];
}

function generateE2EScenarios(
  elements: BpmnElement[],
  bpmnFile: string,
  initiative: string
): E2EScenario[] {
  const scenarios: E2EScenario[] = [];
  
  // Extract CallActivities (feature goals) and their related nodes
  const featureGoals = elements.filter(e => e.type === 'CallActivity');
  const keyNodes = elements.filter(e => 
    ['UserTask', 'ServiceTask', 'BusinessRuleTask'].includes(e.type)
  );
  
  // Generate happy path scenario
  scenarios.push({
    initiative,
    name: 'Happy path',
    description: 'Complete mortgage application flow with all steps successful',
    bpmnFile,
    path: {
      subprocessName: 'Complete Flow',
      featureGoals: featureGoals.map(fg => fg.name),
      keyNodes: keyNodes.slice(0, 5).map(node => node.name), // First 5 key nodes
    },
    tags: ['happy-path', 'complete-flow'],
  });
  
  // Generate approved application scenario
  if (featureGoals.some(fg => fg.name.toLowerCase().includes('credit'))) {
    scenarios.push({
      initiative,
      name: 'Application approved',
      description: 'Mortgage application is approved after credit evaluation',
      bpmnFile,
      path: {
        subprocessName: 'Approval Flow',
        featureGoals: featureGoals
          .filter(fg => 
            fg.name.toLowerCase().includes('application') ||
            fg.name.toLowerCase().includes('credit') ||
            fg.name.toLowerCase().includes('decision')
          )
          .map(fg => fg.name),
        keyNodes: keyNodes
          .filter(node => 
            node.name.toLowerCase().includes('evaluate') ||
            node.name.toLowerCase().includes('approve') ||
            node.name.toLowerCase().includes('decision')
          )
          .map(node => node.name),
      },
      tags: ['approval', 'credit-evaluation'],
    });
  }
  
  // Generate rejection scenario
  if (featureGoals.some(fg => fg.name.toLowerCase().includes('credit'))) {
    scenarios.push({
      initiative,
      name: 'Application rejected (credit evaluation)',
      description: 'Mortgage application is rejected due to credit evaluation failure',
      bpmnFile,
      path: {
        subprocessName: 'Rejection Flow',
        featureGoals: featureGoals
          .filter(fg => 
            fg.name.toLowerCase().includes('application') ||
            fg.name.toLowerCase().includes('credit')
          )
          .map(fg => fg.name),
        keyNodes: keyNodes
          .filter(node => 
            node.name.toLowerCase().includes('evaluate') ||
            node.name.toLowerCase().includes('reject')
          )
          .map(node => node.name),
      },
      tags: ['rejection', 'credit-evaluation', 'error-flow'],
    });
  }
  
  return scenarios;
}

function generateE2ETestFile(scenarios: E2EScenario[]): string {
  const testCases = scenarios.map(scenario => {
    const testName = `${scenario.initiative} – ${scenario.name}`;
    const tags = [
      '@e2e',
      `@initiative:${scenario.initiative.toLowerCase().replace(/\s+/g, '-')}`,
      `@bpmn-file:${scenario.bpmnFile}`,
      ...scenario.tags.map(tag => tag.startsWith('@') ? tag : `@${tag}`),
    ];
    
    return `  // ${tags.join(', ')}
  test('${testName}', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'e2e', description: 'true' });
    testInfo.annotations.push({ type: 'initiative', description: '${scenario.initiative}' });
    testInfo.annotations.push({ type: 'bpmn_file', description: '${scenario.bpmnFile}' });
    testInfo.annotations.push({ type: 'scenario_name', description: '${scenario.name}' });

    // TODO: Implement E2E flow for ${scenario.name}
    // Description: ${scenario.description}
    // 
    // Path:
    //   Subprocess: ${scenario.path.subprocessName}
    //   Feature Goals: ${scenario.path.featureGoals.join(', ')}
    //   Key Nodes: ${scenario.path.keyNodes.join(', ')}
    //
    // Example structure:
    // 1. Navigate to application start
    // 2. Complete all feature goals in sequence
    // 3. Verify expected outcomes at each step
    // 4. Assert final state matches scenario expectations

    expect(true).toBe(true); // Placeholder - implement actual test logic
  });`;
  }).join('\n\n');

  return `import { test, expect } from '@playwright/test';

/**
 * End-to-End (E2E) Test Scenarios
 * 
 * These tests represent complete business flows across all subprocesses
 * in the ${scenarios[0]?.initiative || 'mortgage'} process.
 * 
 * Generated: ${new Date().toISOString()}
 */

test.describe('${scenarios[0]?.initiative || 'Mortgage'} E2E Tests', () => {
${testCases}
});
`;
}
