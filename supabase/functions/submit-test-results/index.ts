import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.13'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestScenario {
  id: string
  name: string
  description: string
  status: 'passing' | 'failing' | 'pending' | 'skipped'
  duration?: number
  category: 'happy-path' | 'error-case' | 'edge-case'
}

interface TestResult {
  testFile: string
  nodeId?: string
  nodeName?: string
  status: 'passing' | 'failing' | 'pending' | 'skipped'
  testCount: number
  duration?: number
  scenarios?: TestScenario[]
  errorMessage?: string
  githubRunUrl?: string
}

type ScriptMode = 'local' | 'slow' | null
type ScriptProvider = 'local-fallback' | 'claude' | 'chatgpt' | 'ollama' | null

function inferScriptModeFromPath(testFile: string): ScriptMode {
  if (testFile.startsWith('tests/local/')) return 'local'
  if (testFile.startsWith('tests/slow/')) return 'slow'
  return null
}

function normalizeProvider(raw: string | null): ScriptProvider {
  if (!raw) return null
  const value = raw.toLowerCase()
  if (value === 'local-fallback' || value === 'fallback' || value === 'local_fallback') {
    return 'local-fallback'
  }
  // Map 'cloud' to 'claude' (new), but also accept 'chatgpt' for backward compatibility
  if (value === 'claude' || value === 'cloud') {
    return 'claude'
  }
  if (value === 'chatgpt') {
    return 'chatgpt' // Legacy support
  }
  if (value === 'ollama' || value === 'local') {
    return 'ollama'
  }
  return null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use service role key from Supabase secrets for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { results }: { results: TestResult[] } = await req.json()

    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array')
    }

    console.log(`Received ${results.length} test results`)

    // Upsert all test results
    const upsertPromises = results.map(async (result) => {
      // Försök hitta script_mode och script_provider via node_test_links
      let scriptMode: ScriptMode = inferScriptModeFromPath(result.testFile)
      let scriptProvider: ScriptProvider = null

      const { data: linkRow, error: linkError } = await supabase
        .from('node_test_links')
        .select('mode, provider')
        .eq('test_file_path', result.testFile)
        .maybeSingle()

      if (linkError) {
        console.warn(
          `submit-test-results: kunde inte läsa node_test_links för ${result.testFile}:`,
          linkError,
        )
      } else if (linkRow) {
        scriptMode = (linkRow.mode as ScriptMode) ?? scriptMode
        scriptProvider = normalizeProvider(linkRow.provider as string | null)
      }

      const { error } = await supabase
        .from('test_results')
        .upsert({
          test_file: result.testFile,
          node_id: result.nodeId,
          node_name: result.nodeName,
          status: result.status,
          test_count: result.testCount,
          duration: result.duration,
          scenarios: result.scenarios,
          error_message: result.errorMessage,
          github_run_url: result.githubRunUrl,
          last_run: new Date().toISOString(),
          script_mode: scriptMode,
          script_provider: scriptProvider,
        }, {
          onConflict: 'test_file'
        })

      if (error) {
        console.error(`Error upserting test result for ${result.testFile}:`, error)
        throw error
      }

      console.log(`✓ Upserted test result for ${result.testFile}: ${result.status}`)
    })

    await Promise.all(upsertPromises)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully updated ${results.length} test results` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing test results:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
