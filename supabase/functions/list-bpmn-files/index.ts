import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch files metadata
    const { data: files, error: filesError } = await supabase
      .from('bpmn_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files from database:', filesError);
      throw filesError;
    }

    console.log(`[list-bpmn-files] Found ${files?.length || 0} files in database`);

    // For each file, get usage stats
    const filesWithStats = await Promise.all(
      (files || []).map(async (file) => {
        const [dorDodData, testsData] = await Promise.all([
          supabase
            .from('dor_dod_status')
            .select('id', { count: 'exact' })
            .eq('bpmn_file', file.file_name),
          supabase
            .from('test_results')
            .select('id', { count: 'exact' })
            .ilike('test_file', `%${file.file_name.replace('.bpmn', '')}%`),
        ]);

        return {
          ...file,
          usage: {
            dorDodCount: dorDodData.count || 0,
            testsCount: testsData.count || 0,
          },
        };
      })
    );

    return new Response(JSON.stringify({ files: filesWithStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
