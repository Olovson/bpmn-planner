import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function updateGitHubFile(path: string, content: string, message: string) {
  const token = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('GITHUB_OWNER');
  const repo = Deno.env.get('GITHUB_REPO');
  const branch = Deno.env.get('GITHUB_BRANCH') || 'main';

  if (!token || !owner || !repo) {
    return { success: false, error: 'GitHub not configured' };
  }

  const maxRetries = 3;
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
          message,
          content: btoa(content),
          sha,
          branch,
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
        console.error('GitHub update error after all retries:', error);
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
    const { path, content, message } = await req.json();

    if (!path || !content || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: path, content, message' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await updateGitHubFile(path, content, message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating GitHub file:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

