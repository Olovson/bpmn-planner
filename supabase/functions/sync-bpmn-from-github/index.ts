import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

interface SyncResult {
  added: Array<{ file_name: string }>;
  updated: Array<{ file_name: string }>;
  unchanged: Array<{ file_name: string }>;
  orphanedInDb: Array<{ file_name: string }>;
  errors: Array<{ file_name: string; reason: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get GitHub configuration
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');
    const githubBranch = Deno.env.get('GITHUB_BRANCH') || 'main';
    const bpmnPath = Deno.env.get('GITHUB_BPMN_PATH') || 'public/bpmn';
    const dmnPath = Deno.env.get('GITHUB_DMN_PATH') || 'public/dmn';

    if (!githubToken || !githubOwner || !githubRepo) {
      return new Response(
        JSON.stringify({ 
          error: 'GitHub-sync är inte konfigurerad. Saknar GITHUB_TOKEN, GITHUB_OWNER eller GITHUB_REPO.' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result: SyncResult = {
      added: [],
      updated: [],
      unchanged: [],
      orphanedInDb: [],
      errors: [],
    };

    // Fetch files from GitHub - try multiple possible paths
    const githubFiles: GitHubFile[] = [];
    const possiblePaths = [
      bpmnPath,
      dmnPath,
      'bpmn',  // Try without public/ prefix
      'dmn',
      'public/bpmn',
      'public/dmn'
    ];
    
    const attemptedPaths: string[] = [];
    const foundPaths: string[] = [];
    
    for (const path of possiblePaths) {
      if (attemptedPaths.includes(path)) continue; // Skip duplicates
      attemptedPaths.push(path);
      
      try {
        const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}?ref=${githubBranch}`;
        console.log(`Trying path: ${path} (${url})`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Path ${path} not found (404)`);
            continue;
          }
          const errorText = await response.text();
          console.error(`GitHub API error for ${path}: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const files = await response.json();
        if (Array.isArray(files)) {
          const bpmnDmnFiles = files.filter(
            (f: GitHubFile) => f.name.endsWith('.bpmn') || f.name.endsWith('.dmn')
          );
          
          if (bpmnDmnFiles.length > 0) {
            console.log(`Found ${bpmnDmnFiles.length} files in ${path}`);
            githubFiles.push(...bpmnDmnFiles);
            foundPaths.push(path);
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${path}:`, error);
        result.errors.push({
          file_name: path,
          reason: `Kunde inte läsa från GitHub: ${(error as Error).message}`,
        });
      }
    }
    
    console.log(`Total files found: ${githubFiles.length} from paths: ${foundPaths.join(', ')}`);
    
    if (githubFiles.length === 0) {
      result.errors.push({
        file_name: 'GitHub',
        reason: `Inga BPMN/DMN-filer hittades i GitHub-repot ${githubOwner}/${githubRepo}. Försökte paths: ${attemptedPaths.join(', ')}`,
      });
    }

    // Fetch existing files from database
    const { data: existingFiles, error: dbError } = await supabase
      .from('bpmn_files')
      .select('*');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const existingFileMap = new Map(
      (existingFiles || []).map(f => [f.file_name, f])
    );

    // Process each GitHub file
    for (const githubFile of githubFiles) {
      try {
        // Check file size (max 5MB)
        const headResponse = await fetch(githubFile.download_url, { method: 'HEAD' });
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
        
        if (contentLength > 5 * 1024 * 1024) {
          result.errors.push({
            file_name: githubFile.name,
            reason: 'Filen är för stor (> 5 MB)',
          });
          continue;
        }

        // Download file content
        const contentResponse = await fetch(githubFile.download_url);
        if (!contentResponse.ok) {
          throw new Error(`Failed to download: ${contentResponse.statusText}`);
        }

        const content = await contentResponse.text();
        const blob = new Blob([content], { type: 'application/xml' });

        const fileType = githubFile.name.endsWith('.bpmn') ? 'bpmn' : 'dmn';
        const storagePath = `${fileType}/${githubFile.name}`;

        const existingFile = existingFileMap.get(githubFile.name);

        if (!existingFile) {
          // New file - add to storage and database
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(storagePath, blob, {
              contentType: 'application/xml',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload error: ${uploadError.message}`);
          }

          const { error: insertError } = await supabase
            .from('bpmn_files')
            .insert({
              file_name: githubFile.name,
              storage_path: storagePath,
              file_type: fileType,
              size_bytes: contentLength,
              sha: githubFile.sha,
              github_synced: true,
            });

          if (insertError) {
            throw new Error(`Insert error: ${insertError.message}`);
          }

          result.added.push({ file_name: githubFile.name });
          existingFileMap.delete(githubFile.name);
        } else if (existingFile.sha !== githubFile.sha) {
          // File updated - update storage and database
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(storagePath, blob, {
              contentType: 'application/xml',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload error: ${uploadError.message}`);
          }

          const { error: updateError } = await supabase
            .from('bpmn_files')
            .update({
              sha: githubFile.sha,
              size_bytes: contentLength,
              github_synced: true,
              last_updated_at: new Date().toISOString(),
            })
            .eq('id', existingFile.id);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }

          result.updated.push({ file_name: githubFile.name });
          existingFileMap.delete(githubFile.name);
        } else {
          // File unchanged
          result.unchanged.push({ file_name: githubFile.name });
          existingFileMap.delete(githubFile.name);
        }
      } catch (error) {
        console.error(`Error processing ${githubFile.name}:`, error);
        result.errors.push({
          file_name: githubFile.name,
          reason: (error as Error).message,
        });
      }
    }

    // Remaining files in existingFileMap are orphaned (only in DB)
    result.orphanedInDb = Array.from(existingFileMap.values()).map(f => ({
      file_name: f.file_name,
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
