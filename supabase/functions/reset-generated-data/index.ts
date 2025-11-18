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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Reset initiated by user: ${user.id}`);

    // Parse request body for options
    const options: ResetOptions = req.method === 'POST' 
      ? await req.json().catch(() => ({}))
      : {};

    const safeMode = options.safeMode ?? false;
    
    // In safe mode, only delete what's explicitly requested
    // In full reset mode, delete everything BPMN-related (DB + Storage + GitHub artifacts)
    // BUT preserve BPMN/DMN source files (in Supabase Storage and bpmn_files table)
    const shouldDeleteBpmn = safeMode ? (options.deleteBpmn ?? false) : false;
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
    }

    // Delete test_results in full reset or if explicitly requested in Safe Mode
    if (shouldDeleteTestResults) {
      const { count: resultsCount } = await supabase.from('test_results').select('*', { count: 'exact', head: true });
      await supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      deleted.test_results = resultsCount || 0;
      console.log(`Deleted ${resultsCount} rows from test_results`);
    }

    // ALWAYS preserve BPMN/DMN source files - they are never deleted by reset
    const { count: filesCount } = await supabase.from('bpmn_files').select('*', { count: 'exact', head: true });
    console.log(`Preserved ${filesCount} rows in bpmn_files (BPMN/DMN sources are never deleted by reset).`);

    // Delete files from Supabase Storage based on options
    let storageDeleted = 0;
    const storagePrefixes: string[] = [];
    
    // Delete only generated artifacts (NEVER delete BPMN/DMN source files)
    if (!safeMode) {
      storagePrefixes.push('docs', 'generated-docs', 'tests', 'tests/e2e', 'test-reports', 'reports');
    } else {
      // In safe mode, only delete what's explicitly requested
      // Note: BPMN/DMN source files ('bpmn', 'dmn' prefixes) are NEVER deleted
      if (shouldDeleteDocs) storagePrefixes.push('docs', 'generated-docs');
      if (shouldDeleteTests) storagePrefixes.push('tests', 'tests/e2e');
      if (shouldDeleteReports) storagePrefixes.push('test-reports', 'reports');
    }
    
    for (const prefix of storagePrefixes) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('bpmn-files')
          .list(prefix);

        if (!listError && files && files.length > 0) {
          const filesToRemove = files.map(f => `${prefix}/${f.name}`);
          const { error: deleteError } = await supabase.storage
            .from('bpmn-files')
            .remove(filesToRemove);
          
          if (deleteError) {
            console.error(`Error deleting files from ${prefix}:`, deleteError);
          } else {
            storageDeleted += filesToRemove.length;
            console.log(`Deleted ${filesToRemove.length} files from storage:${prefix}`);
          }
        }
      } catch (error) {
        console.error(`Error processing storage prefix ${prefix}:`, error);
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
      
      // Only delete BPMN/DMN source files if explicitly requested in Safe Mode
      if (shouldDeleteBpmn && safeMode) {
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
            const shouldDelete = 
              (path === 'tests' && item.name.endsWith('.spec.ts')) ||
              (path.startsWith('public/docs') && item.name.endsWith('.html')) ||
              (path.startsWith('docs/generated') && item.name.endsWith('.html')) ||
              (path.startsWith('public/bpmn') && !item.name.endsWith('.bpmn')) ||
              (path === 'bpmn' && !item.name.endsWith('.bpmn') && !item.name.endsWith('.dmn'));

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
