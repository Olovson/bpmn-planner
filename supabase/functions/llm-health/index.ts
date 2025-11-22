/**
 * LLM Health Check Endpoint
 * 
 * GET /api/llm/health
 * 
 * Kontrollerar tillgänglighet för både lokal och molnbaserad LLM.
 * Returnerar status för båda providers.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Note: Using serve() for consistency with other functions, but Deno.serve() is also available

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  local: {
    available: boolean;
    model: string;
    latencyMs?: number;
    error?: string;
  };
  cloud: {
    available: boolean;
    model: string;
  };
}

async function checkLocalLlm(): Promise<{
  available: boolean;
  model: string;
  latencyMs?: number;
  error?: string;
}> {
  const baseUrl = Deno.env.get('LLM_LOCAL_BASE_URL')?.trim() || 'http://localhost:11434';
  const model = Deno.env.get('LLM_LOCAL_MODEL')?.trim() || 'llama3.1:8b-instruct';

  // Om baseUrl inte är konfigurerad, anta att lokal LLM inte är tillgänglig
  if (!baseUrl || baseUrl === '') {
    return {
      available: false,
      model,
      error: 'LLM_LOCAL_BASE_URL not configured',
    };
  }

  try {
    const startTime = Date.now();
    const endpoint = `${baseUrl}/api/generate`;

    // Gör ett minimalt testanrop med mycket kort timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sekunder för healthcheck

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: 'ping',
        system: '',
        stream: false,
        options: {
          num_predict: 5, // Mycket kort svar för healthcheck
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        available: false,
        model,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    if (data.response !== undefined) {
      return {
        available: true,
        model,
        latencyMs,
      };
    }

    return {
      available: false,
      model,
      error: 'Unexpected response format',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        available: false,
        model,
        error: 'Timeout (5s)',
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        available: false,
        model,
        error: 'Connection refused - Ollama may not be running',
      };
    }

    return {
      available: false,
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Kontrollera moln-LLM (alltid tillgänglig om API-nyckel finns)
    const cloudApiKey = Deno.env.get('OPENAI_API_KEY');
    const cloudAvailable = !!cloudApiKey;
    const cloudModel = 'gpt-4o';

    // Kontrollera lokal LLM
    const localStatus = await checkLocalLlm();

    const result: HealthCheckResult = {
      local: localStatus,
      cloud: {
        available: cloudAvailable,
        model: cloudModel,
      },
    };

    // Returnera alltid 200 OK, även om lokal LLM inte är tillgänglig
    // (detta är en healthcheck, inte ett fel)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking LLM health:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

