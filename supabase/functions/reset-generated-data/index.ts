import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetOptions {
  safeMode?: boolean;
  deleteBpmn?: boolean;
  deleteDmn?: boolean;
  deleteDocs?: boolean;
  deleteTests?: boolean;
  deleteReports?: boolean;
  deleteDorDod?: boolean;
  deleteMappings?: boolean;
  deleteAllTables?: boolean;
  deleteGitHub?: boolean;
  deleteTestResults?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const authedSupabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await authedSupabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Reset initiated by user: ${user.id}`);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    // Parse request body for options
    const options: ResetOptions = req.method === 'POST' 
      ? await req.json().catch(() => ({}))
      : {};

    const safeMode = options.safeMode ?? false;
    
    // In safe mode, only delete what's explicitly requested
    // In full reset mode, delete everything BPMN-related (DB + Storage + GitHub artifacts)
    // BUT preserve BPMN/DMN source files (in Supabase Storage and bpmn_files table)
    const shouldDeleteBpmn = safeMode ? (options.deleteBpmn ?? false) : true;
    const shouldDeleteDmn = safeMode ? (options.deleteDmn ?? false) : true;
    const shouldDeleteDocs = safeMode ? (options.deleteDocs ?? false) : true;
    const shouldDeleteTests = safeMode ? (options.deleteTests ?? false) : true;
    const shouldDeleteReports = safeMode ? (options.deleteReports ?? false) : true;
    const shouldDeleteDorDod = safeMode ? (options.deleteDorDod ?? false) : true;
    const shouldDeleteMappings = safeMode ? (options.deleteMappings ?? false) : true;
    const shouldDeleteAllTables = safeMode ? (options.deleteAllTables ?? false) : true;
    
    // In full reset, delete GitHub generated artifacts and test_results
    const shouldDeleteGitHub = safeMode ? (options.deleteGitHub ?? false) : true;
    const shouldDeleteTestResults = safeMode ? (options.deleteTestResults ?? false) : true;

    console.log('Reset options:', { 
      safeMode, 
      shouldDeleteBpmn,
      shouldDeleteDmn,
      shouldDeleteDocs, 
      shouldDeleteTests, 
      shouldDeleteReports, 
      shouldDeleteDorDod, 
      shouldDeleteMappings, 
      shouldDeleteAllTables,
      shouldDeleteGitHub,
      shouldDeleteTestResults 
    });

    // Delete from database tables
    const deleted: Record<string, number> = {};
    const deletionErrors: string[] = [];
    const storageFileRemovals: string[] = [];
    
    if (shouldDeleteAllTables || shouldDeleteDorDod) {
      const { count: dorDodCount } = await supabase.from('dor_dod_status').select('*', { count: 'exact', head: true });
      await supabase.from('dor_dod_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.dor_dod_status = dorDodCount || 0;
      console.log(`Deleted ${dorDodCount} rows from dor_dod_status`);
    }

    if (shouldDeleteAllTables || shouldDeleteTests) {
      const { count: testLinksCount } = await supabase.from('node_test_links').select('*', { count: 'exact', head: true });
      await supabase.from('node_test_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.node_test_links = testLinksCount || 0;
      console.log(`Deleted ${testLinksCount} rows from node_test_links`);
      
      // Also delete E2E scenarios
      const { count: e2eCount } = await supabase.from('e2e_scenarios').select('*', { count: 'exact', head: true });
      await supabase.from('e2e_scenarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.e2e_scenarios = e2eCount || 0;
      console.log(`Deleted ${e2eCount} rows from e2e_scenarios`);

      // And delete node_planned_scenarios (planerade scenarion per nod/provider)
      const { count: plannedCount } = await supabase.from('node_planned_scenarios').select('*', { count: 'exact', head: true });
      await supabase.from('node_planned_scenarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.node_planned_scenarios = plannedCount || 0;
      console.log(`Deleted ${plannedCount} rows from node_planned_scenarios`);
    }

    if (shouldDeleteAllTables || shouldDeleteDocs) {
      const { count: docsCount } = await supabase.from('bpmn_docs').select('*', { count: 'exact', head: true });
      await supabase.from('bpmn_docs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.bpmn_docs = docsCount || 0;
      console.log(`Deleted ${docsCount} rows from bpmn_docs`);
    }

    if (shouldDeleteAllTables || shouldDeleteMappings) {
      const { count: mappingsCount } = await supabase.from('bpmn_element_mappings').select('*', { count: 'exact', head: true });
      await supabase.from('bpmn_element_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.bpmn_element_mappings = mappingsCount || 0;
      console.log(`Deleted ${mappingsCount} rows from bpmn_element_mappings`);
    }

    if (shouldDeleteAllTables) {
      const { count: depsCount } = await supabase.from('bpmn_dependencies').select('*', { count: 'exact', head: true });
      await supabase.from('bpmn_dependencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.bpmn_dependencies = depsCount || 0;
      console.log(`Deleted ${depsCount} rows from bpmn_dependencies`);

      const { count: refsCount } = await supabase.from('node_references').select('*', { count: 'exact', head: true });
      await supabase.from('node_references').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.node_references = refsCount || 0;
      console.log(`Deleted ${refsCount} rows from node_references`);
      
      // Rensa bpmn_file_versions (version history)
      const { count: versionsCount } = await supabase.from('bpmn_file_versions').select('*', { count: 'exact', head: true });
      await supabase.from('bpmn_file_versions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.bpmn_file_versions = versionsCount || 0;
      console.log(`Deleted ${versionsCount} rows from bpmn_file_versions`);
      
      // Rensa bpmn_file_diffs (diff tracking)
      const { count: diffsCount } = await supabase.from('bpmn_file_diffs').select('*', { count: 'exact', head: true });
      await supabase.from('bpmn_file_diffs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.bpmn_file_diffs = diffsCount || 0;
      console.log(`Deleted ${diffsCount} rows from bpmn_file_diffs`);
    }

    // Jobbhistorik: alltid försök rensa generation_jobs och llm_generation_logs
    const { count: jobsCount, error: jobsCountError } = await supabase
      .from('generation_jobs')
      .select('*', { count: 'exact', head: true });
    if (jobsCountError) {
      deletionErrors.push(`generation_jobs count failed: ${jobsCountError.message}`);
      console.error('Failed to count generation_jobs:', jobsCountError);
    } else {
      const { error: jobsDeleteError } = await supabase
        .from('generation_jobs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (jobsDeleteError) {
        deletionErrors.push(`generation_jobs delete failed: ${jobsDeleteError.message}`);
        console.error('Failed to clear generation_jobs:', jobsDeleteError);
      } else {
        deleted.generation_jobs = jobsCount || 0;
        console.log(`Deleted ${jobsCount} rows from generation_jobs`);
      }
    }

    const { count: llmLogCount, error: llmCountError } = await supabase
      .from('llm_generation_logs')
      .select('*', { count: 'exact', head: true });
    if (llmCountError) {
      deletionErrors.push(`llm_generation_logs count failed: ${llmCountError.message}`);
      console.error('Failed to count llm_generation_logs:', llmCountError);
    } else {
      const { error: llmDeleteError } = await supabase
        .from('llm_generation_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (llmDeleteError) {
        deletionErrors.push(`llm_generation_logs delete failed: ${llmDeleteError.message}`);
        console.error('Failed to clear llm_generation_logs:', llmDeleteError);
      } else {
        deleted.llm_generation_logs = llmLogCount || 0;
        console.log(`Deleted ${llmLogCount} rows from llm_generation_logs`);
      }
    }

    // Delete test_results in full reset or if explicitly requested in Safe Mode
    if (shouldDeleteTestResults) {
      const { count: resultsCount } = await supabase.from('test_results').select('*', { count: 'exact', head: true });
      await supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.test_results = resultsCount || 0;
      console.log(`Deleted ${resultsCount} rows from test_results`);
    }

    if (shouldDeleteBpmn || shouldDeleteDmn) {
      const { data: existingFiles, error: listError } = await supabase
        .from('bpmn_files')
        .select('id, file_name, file_type, storage_path');

      if (listError) throw listError;

      const filesToDelete = (existingFiles || []).filter(file =>
        (file.file_type === 'bpmn' && shouldDeleteBpmn) ||
        (file.file_type === 'dmn' && shouldDeleteDmn)
      );

      if (filesToDelete.length > 0) {
        const ids = filesToDelete.map(f => f.id);
        await supabase.from('bpmn_files').delete().in('id', ids);
        const bpmnCount = filesToDelete.filter(f => f.file_type === 'bpmn').length;
        const dmnCount = filesToDelete.filter(f => f.file_type === 'dmn').length;
        if (bpmnCount) deleted.bpmn_files = (deleted.bpmn_files || 0) + bpmnCount;
        if (dmnCount) deleted.dmn_files = (deleted.dmn_files || 0) + dmnCount;
        filesToDelete.forEach(file => {
          if (file.storage_path) {
            storageFileRemovals.push(file.storage_path);
          }
        });
        console.log(`Deleted ${filesToDelete.length} BPMN/DMN source rows from bpmn_files`);
      }
    }

    // Delete files from Supabase Storage based on options
    let storageDeleted = 0;
    const storagePrefixes: string[] = [];
    
    // Delete only generated artifacts (NEVER delete BPMN/DMN source files)
    if (!safeMode) {
      storagePrefixes.push(
        'docs',
        'generated-docs',
        'tests',
        'tests/e2e',
        'e2e-scenarios', // E2E scenarios stored in Storage
        'test-reports',
        'reports',
        'llm-debug'
      );
      if (shouldDeleteBpmn) storagePrefixes.push('bpmn');
      if (shouldDeleteDmn) storagePrefixes.push('dmn');
    } else {
      // In safe mode, only delete what's explicitly requested
      // Note: BPMN/DMN source files ('bpmn', 'dmn' prefixes) are NEVER deleted
      if (shouldDeleteDocs) storagePrefixes.push('docs', 'generated-docs');
      if (shouldDeleteTests) {
        storagePrefixes.push('tests', 'tests/e2e');
        // VIKTIGT: Rensa E2E scenarios från Storage när tester raderas
        // E2E scenarios sparas i e2e-scenarios/ mappen (med version hash)
        storagePrefixes.push('e2e-scenarios');
        // VIKTIGT: Rensa hela llm-debug mappen när tester raderas
        // eftersom llm-debug innehåller debug-artifacts från generering
        storagePrefixes.push('llm-debug');
      }
      if (shouldDeleteReports) storagePrefixes.push('test-reports', 'reports');
    }
    
    const deleteStorageTree = async (path: string): Promise<number> => {
      try {
        const { data, error } = await supabase.storage
          .from('bpmn-files')
          .list(path, { limit: 1000 });

        if (error) {
          console.error(`Error listing ${path || 'root'}:`, error);
          return 0;
        }

        if (!data || data.length === 0) return 0;

        let removed = 0;
        const fileBatch: string[] = [];

        for (const entry of data) {
          const isDirectory = !entry?.metadata;
          const fullPath = path ? `${path}/${entry.name}` : entry.name;
          if (isDirectory) {
            removed += await deleteStorageTree(fullPath);
          } else {
            fileBatch.push(fullPath);
          }
        }

        if (fileBatch.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('bpmn-files')
            .remove(fileBatch);
          if (deleteError) {
            console.error(`Error deleting batch from ${path}:`, deleteError);
          } else {
            removed += fileBatch.length;
            console.log(`Deleted ${fileBatch.length} files from storage:${path || 'root'}`);
          }
        }

        return removed;
      } catch (error) {
        console.error(`Error deleting tree for ${path}:`, error);
        return 0;
      }
    };

    for (const prefix of storagePrefixes) {
      storageDeleted += await deleteStorageTree(prefix);
    }

    if (storageFileRemovals.length > 0) {
      const { error: removeError } = await supabase.storage
        .from('bpmn-files')
        .remove(storageFileRemovals);
      if (removeError) {
        console.error('Error deleting BPMN/DMN source files from storage:', removeError);
      } else {
        storageDeleted += storageFileRemovals.length;
        console.log(`Deleted ${storageFileRemovals.length} BPMN/DMN source files from storage`);
      }
    }
    
    // Ta alltid bort bpmn-map.json från storage för att trigga automatisk generering
    // (endast om vi rensar allt eller om det är en full reset)
    if (shouldDeleteAllTables || !safeMode) {
      try {
        const { error: mapError } = await supabase.storage
          .from('bpmn-files')
          .remove(['bpmn-map.json']);
        
        if (!mapError) {
          storageDeleted += 1;
          console.log('Deleted bpmn-map.json from storage (will be auto-regenerated)');
        } else if (mapError.message?.includes('not found')) {
          // Filen finns inte, det är ok
          console.log('bpmn-map.json not found in storage (already clean)');
        } else {
          console.error('Error deleting bpmn-map.json:', mapError);
        }
      } catch (err) {
        console.error('Exception deleting bpmn-map.json:', err);
      }
    }

    // Delete generated artifacts from GitHub (but keep BPMN/DMN source files)
    let githubDeleted = 0;
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (shouldDeleteGitHub && githubToken && githubOwner && githubRepo) {
      console.log('GitHub deletion enabled - removing generated artifacts only');
      const githubHeaders = {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      };

      // Directories to clean - always delete generated artifacts
      const dirsToClean: string[] = [];
      
      // Always delete generated tests and docs
      dirsToClean.push('tests', 'public/docs', 'docs/generated', 'public/generated-docs');
      
      // Delete BPMN/DMN source files when requested
      if (shouldDeleteBpmn) {
        dirsToClean.push('public/bpmn', 'bpmn');
      }

      // Helper function to recursively delete directory contents
      async function deleteDirectoryContents(path: string): Promise<number> {
        let deleted = 0;
        
        try {
          const response = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`,
            { headers: githubHeaders }
          );

          if (!response.ok) {
            if (response.status === 404) {
              console.log(`Directory ${path} does not exist, skipping`);
              return 0;
            }
            console.error(`Failed to list ${path}: ${response.status}`);
            return 0;
          }

          const contents = await response.json();
          
          // Handle both array (directory) and object (file) responses
          const items = Array.isArray(contents) ? contents : [contents];

          for (const item of items) {
            // Determine if file should be deleted based on directory and file type
            const isGeneratedTest = path === 'tests' && item.name.endsWith('.spec.ts');
            const isGeneratedDoc =
              path.startsWith('public/docs') && item.name.endsWith('.html') ||
              path.startsWith('docs/generated') && item.name.endsWith('.html');
            const isGeneratedPublicDoc =
              path.startsWith('public/generated-docs') && item.name.endsWith('.html');
            const isBpmnSource =
              shouldDeleteBpmn &&
              (
                (path.startsWith('public/bpmn') && item.name.endsWith('.bpmn')) ||
                (path === 'bpmn' && (item.name.endsWith('.bpmn') || item.name.endsWith('.dmn')))
              );
            const shouldDelete = isGeneratedTest || isGeneratedDoc || isGeneratedPublicDoc || isBpmnSource;

            if (item.type === 'file' && shouldDelete) {
              // Delete file
              const deleteResponse = await fetch(
                `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${item.path}`,
                {
                  method: 'DELETE',
                  headers: githubHeaders,
                  body: JSON.stringify({
                    message: `chore: clear auto-generated artifacts (${item.path})`,
                    sha: item.sha,
                  }),
                }
              );

              if (deleteResponse.ok) {
                deleted++;
                console.log(`Deleted: ${item.path}`);
              } else {
                console.error(`Failed to delete ${item.path}: ${deleteResponse.status}`);
              }
            } else if (item.type === 'dir') {
              // Recursively delete subdirectory contents
              deleted += await deleteDirectoryContents(item.path);
            }
          }
        } catch (error) {
          console.error(`Error processing directory ${path}:`, error);
        }

        return deleted;
      }

      for (const dir of dirsToClean) {
        const deletedInDir = await deleteDirectoryContents(dir);
        githubDeleted += deletedInDir;
      }
    }

    // Count preserved items
    const preserved: Record<string, number> = {};
    
    if (safeMode) {
      if (!shouldDeleteBpmn) {
        const { count } = await supabase.from('bpmn_files').select('*', { count: 'exact', head: true });
        preserved.bpmn_files = count || 0;
      }
      if (!shouldDeleteMappings) {
        const { count } = await supabase.from('bpmn_element_mappings').select('*', { count: 'exact', head: true });
        preserved.bpmn_element_mappings = count || 0;
      }
      if (!shouldDeleteReports) {
        const { count } = await supabase.from('test_results').select('*', { count: 'exact', head: true });
        preserved.test_results = count || 0;
      }
    }

    if (deletionErrors.length > 0) {
      throw new Error(`Reset failed: ${deletionErrors.join('; ')}`);
    }

    const result = {
      success: true,
      safeMode,
      deleted,
      storage_deleted: storageDeleted,
      github_deleted: githubDeleted,
      preserved,
    };

    console.log('Reset completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in reset function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
