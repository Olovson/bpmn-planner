/**
 * LLM Events Endpoint
 * 
 * GET /api/llm/events
 * 
 * Returnerar de senaste LLM-anropen från in-memory-buffern.
 * Detta är en enkel implementation - i produktion skulle detta
 * kunna lagras i en databas istället.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notera: I en riktig implementation skulle events lagras i en databas.
// För nu returnerar vi en tom array eftersom events lagras i frontend-memory.
// Detta endpoint kan användas för att exponera events från backend om vi
// senare flyttar loggningen dit.

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
    // För nu returnerar vi en tom array eftersom events lagras i frontend-memory.
    // I framtiden kan vi flytta loggningen till backend och lagra i databas.
    const events: any[] = [];

    return new Response(JSON.stringify(events), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching LLM events:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

