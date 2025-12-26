import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Parse BPMN XML and extract canonical BpmnMeta structure.
 * This eliminates the need for regex parsing and ensures consistency.
 */
async function parseBpmnXml(xml: string) {
  const getAttr = (element: string, attrName: string): string => {
    const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
    const match = regex.exec(element);
    return match ? match[1] : '';
  };

  // Extract process info
  const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(xml);
  const processId = processMatch ? getAttr(processMatch[0], 'id') : '';
  const processName = processMatch ? (getAttr(processMatch[0], 'name') || processId) : '';

  // Extract CallActivities
  const callActivities: Array<{ id: string; name: string; calledElement: string | null }> = [];
  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  let match;
  while ((match = callActivityRegex.exec(xml)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const calledElement = getAttr(match[0], 'calledElement') || null;
    if (id) callActivities.push({ id, name, calledElement });
  }

  // Extract Tasks
  const tasks: Array<{ id: string; name: string; type: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' }> = [];
  const taskPatterns = [
    { regex: /<(?:bpmn:)?userTask[^>]*>/gi, type: 'UserTask' as const },
    { regex: /<(?:bpmn:)?serviceTask[^>]*>/gi, type: 'ServiceTask' as const },
    { regex: /<(?:bpmn:)?businessRuleTask[^>]*>/gi, type: 'BusinessRuleTask' as const },
  ];
  for (const { regex, type } of taskPatterns) {
    while ((match = regex.exec(xml)) !== null) {
      const id = getAttr(match[0], 'id');
      const name = getAttr(match[0], 'name') || id;
      if (id) tasks.push({ id, name, type });
    }
  }

  // Extract SubProcesses
  const subprocesses: Array<{ id: string; name: string }> = [];
  const subprocessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
  while ((match = subprocessRegex.exec(xml)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) subprocesses.push({ id, name });
  }

  return {
    processId,
    name: processName,
    callActivities,
    tasks,
    subprocesses,
  };
}

async function syncToGitHub(fileName: string, content: string) {
  const token = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('GITHUB_OWNER');
  const repo = Deno.env.get('GITHUB_REPO');

  if (!token || !owner || !repo) {
    console.warn('GitHub credentials not configured, skipping sync');
    return { success: false, error: 'GitHub not configured' };
  }

  const maxRetries = 3;
  const path = `public/bpmn/${fileName}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Fetch latest SHA
      let sha: string | undefined;
      try {
        const checkResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          sha = data.sha;
        }
      } catch (e) {
        console.log('File does not exist yet, will create new');
      }

      // Upload or update file
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `chore(bpmn): ${sha ? 'update' : 'add'} ${fileName}`,
          content: btoa(content),
          sha,
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      if (response.status === 409 && attempt < maxRetries) {
        console.log(`SHA conflict on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      const error = await response.text();
      throw new Error(`GitHub API error: ${error}`);
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('GitHub sync error after all retries:', error);
        return { success: false, error: (error as Error).message };
      }
      console.log(`Retry ${attempt}/${maxRetries} failed, trying again...`);
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = file.name;
    const fileType = fileName.endsWith('.bpmn') ? 'bpmn' : 'dmn';

    // Validate file extension
    if (!fileName.endsWith('.bpmn') && !fileName.endsWith('.dmn')) {
      throw new Error('Only .bpmn and .dmn files are allowed');
    }

    // 🚨 KRITISKT: Skydd mot att test-filer skriver över produktionsfiler
    // Test-filer måste ha prefix "test-" för att kunna skrivas över
    // Produktionsfiler (utan "test-" prefix) kan INTE skrivas över av test-filer
    const isTestFile = fileName.startsWith('test-');
    
    // KRITISKT: Whitelist av produktionsfiler som INTE får skrivas över av test-filer
    const PRODUCTION_FILES = [
      'mortgage-se-application.bpmn',
      'mortgage-se-object.bpmn',
      'mortgage-se-credit-evaluation.bpmn',
      'mortgage-se-object-control.bpmn',
      'mortgage-se-object-information.bpmn',
      'mortgage-se-household.bpmn',
      'mortgage-se-internal-data-gathering.bpmn',
      'mortgage-se-appeal.bpmn',
      'mortgage.bpmn',
    ];
    
    const isProductionFile = PRODUCTION_FILES.some(prod => 
      fileName.toLowerCase() === prod.toLowerCase()
    );
    
    if (!isTestFile) {
      // Detta är en produktionsfil - kontrollera om den redan finns
      const { data: existingFile } = await supabase
        .from('bpmn_files')
        .select('file_name, storage_path')
        .eq('file_name', fileName)
        .maybeSingle();

      if (existingFile) {
        // Produktionsfil finns redan - tillåt endast uppdatering om innehållet faktiskt ändrats
        // (Detta hanteras av versioning-systemet, men vi loggar ändå)
        console.log(`[upload-bpmn-file] Updating existing production file: ${fileName}`);
      } else {
        console.log(`[upload-bpmn-file] Creating new production file: ${fileName}`);
      }
    } else {
      // Detta är en test-fil
      // KRITISKT: Om test-filen matchar produktionsfil-namn, INTE tillåt skrivning
      if (isProductionFile) {
        throw new Error(
          `[upload-bpmn-file] SECURITY: Test file "${fileName}" matches production file name. ` +
          `Test files cannot overwrite production files. Use a different name.`
        );
      }
      console.log(`[upload-bpmn-file] Uploading test file: ${fileName}`);
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(arrayBuffer);

    // Parse BPMN to extract metadata (only for BPMN files)
    let bpmnMeta = null;
    if (fileType === 'bpmn') {
      try {
        bpmnMeta = await parseBpmnXml(content);
        console.log('Parsed BPMN meta:', bpmnMeta);
      } catch (parseError) {
        console.error('Error parsing BPMN:', parseError);
        // Continue with upload even if parsing fails
      }
    }

    // Upload to storage
    const storagePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('bpmn-files')
      .upload(storagePath, new Blob([content]), {
        contentType: 'application/xml',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Sync to GitHub
    const githubResult = await syncToGitHub(fileName, content);

    // Parse BPMN to extract process ID/name using regex
    const processIds: string[] = [];
    
    // Extract process IDs and names from BPMN XML
    const processRegex = /<bpmn:process[^>]*id="([^"]+)"[^>]*(?:name="([^"]+)")?[^>]*>/g;
    let match;
    while ((match = processRegex.exec(content)) !== null) {
      if (match[1]) processIds.push(match[1]);
      if (match[2] && match[2] !== match[1]) processIds.push(match[2]);
    }

    // Also try alternative pattern with name first
    const processRegex2 = /<bpmn:process[^>]*name="([^"]+)"[^>]*id="([^"]+)"[^>]*>/g;
    while ((match = processRegex2.exec(content)) !== null) {
      if (match[2]) processIds.push(match[2]);
      if (match[1] && match[1] !== match[2]) processIds.push(match[1]);
    }

    // Save or get file record
    const { data: fileData, error: dbError } = await supabase
      .from('bpmn_files')
      .upsert(
        {
          file_name: fileName,
          storage_path: storagePath,
          file_type: fileType,
          size_bytes: file.size,
          github_synced: githubResult.success,
          has_structure_changes: false, // Reset flag on upload
          meta: bpmnMeta, // Store parsed BpmnMeta
        },
        { onConflict: 'storage_path' }
      )
      .select()
      .single();

    if (dbError) throw dbError;

    // Create or get version for this file (only for BPMN files)
    if (fileType === 'bpmn' && bpmnMeta) {
      try {
        // Calculate content hash
        const encoder = new TextEncoder();
        const normalizedContent = content.trim().replace(/\s+/g, ' ');
        const data = encoder.encode(normalizedContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Get current version to determine next version number
        const { data: currentVersion } = await supabase
          .from('bpmn_file_versions')
          .select('version_number')
          .eq('file_name', fileName)
          .eq('is_current', true)
          .single();

        const nextVersionNumber = currentVersion ? currentVersion.version_number + 1 : 1;

        // Check if this version already exists
        const { data: existingVersion } = await supabase
          .from('bpmn_file_versions')
          .select('*')
          .eq('file_name', fileName)
          .eq('content_hash', contentHash)
          .single();

        if (!existingVersion) {
          // Unset all current versions for this file
          await supabase
            .from('bpmn_file_versions')
            .update({ is_current: false })
            .eq('file_name', fileName)
            .eq('is_current', true);

          // Create new version
          const { error: versionError } = await supabase
            .from('bpmn_file_versions')
            .insert({
              bpmn_file_id: fileData.id,
              file_name: fileName,
              content_hash: contentHash,
              content: content,
              meta: bpmnMeta,
              is_current: true,
              version_number: nextVersionNumber,
            });

          if (versionError) {
            console.error('Error creating version:', versionError);
            // Don't fail upload if version creation fails
          } else {
            // Update bpmn_files to point to current version
            await supabase
              .from('bpmn_files')
              .update({
                current_version_hash: contentHash,
                current_version_number: nextVersionNumber,
              })
              .eq('id', fileData.id);
          }
        } else {
          // Version already exists - just set it as current if it's not already
          if (!existingVersion.is_current) {
            await supabase
              .from('bpmn_file_versions')
              .update({ is_current: false })
              .eq('file_name', fileName)
              .eq('is_current', true);

            await supabase
              .from('bpmn_file_versions')
              .update({ is_current: true })
              .eq('id', existingVersion.id);

            await supabase
              .from('bpmn_files')
              .update({
                current_version_hash: contentHash,
                current_version_number: existingVersion.version_number,
              })
              .eq('id', fileData.id);
          }
        }
      } catch (versionError) {
        console.error('Error handling versioning:', versionError);
        // Don't fail upload if versioning fails
      }
    }

    // Check if this file resolves any missing dependencies
    if (processIds.length > 0 && fileType === 'bpmn') {
      // Find dependencies that match this file's process IDs
      const { data: matchingDeps, error: depsError } = await supabase
        .from('bpmn_dependencies')
        .select('*')
        .is('child_file', null)
        .in('child_process', processIds);

      if (!depsError && matchingDeps && matchingDeps.length > 0) {
        // Update dependencies to point to this file
        const { error: updateDepsError } = await supabase
          .from('bpmn_dependencies')
          .update({ child_file: fileName })
          .is('child_file', null)
          .in('child_process', processIds);

        if (updateDepsError) {
          console.error('Error updating dependencies:', updateDepsError);
        } else {
          // Mark parent files as having structure changes
          const parentFiles = [...new Set(matchingDeps.map(d => d.parent_file))];
          
          const { error: structureError } = await supabase
            .from('bpmn_files')
            .update({ has_structure_changes: true })
            .in('file_name', parentFiles);

          if (structureError) {
            console.error('Error marking structure changes:', structureError);
          } else {
            console.log(`Marked ${parentFiles.length} parent files with structure changes`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        file: fileData,
        githubSync: githubResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
