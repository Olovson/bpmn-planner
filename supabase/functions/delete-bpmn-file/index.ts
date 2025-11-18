import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function deleteFromGitHub(fileName: string) {
  const token = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('GITHUB_OWNER');
  const repo = Deno.env.get('GITHUB_REPO');

  if (!token || !owner || !repo) {
    console.warn('GitHub credentials not configured, skipping sync');
    return { success: false, error: 'GitHub not configured' };
  }

  try {
    const path = `public/bpmn/${fileName}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Get file SHA
    const checkResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!checkResponse.ok) {
      return { success: false, error: 'File not found in GitHub' };
    }

    const data = await checkResponse.json();

    // Delete file
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore(bpmn): remove ${fileName}`,
        sha: data.sha,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    return { success: true };
  } catch (error) {
    console.error('GitHub delete error:', error);
    return { success: false, error: (error as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, fileName } = await req.json();

    if (!id && !fileName) {
      throw new Error('File ID or fileName required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get file metadata
    let query = supabase.from('bpmn_files').select('*');
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('file_name', fileName);
    }

    const { data: file, error: fetchError } = await query.single();
    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('bpmn-files')
      .remove([file.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from GitHub
    const githubResult = await deleteFromGitHub(file.file_name);

    // Delete metadata
    const { error: dbError } = await supabase
      .from('bpmn_files')
      .delete()
      .eq('id', file.id);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        githubSync: githubResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
