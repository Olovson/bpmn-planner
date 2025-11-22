/**
 * Hook for checking LLM provider health status
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LlmHealthStatus {
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

async function fetchLlmHealth(): Promise<LlmHealthStatus> {
  const { data, error } = await supabase.functions.invoke('llm-health', {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching LLM health:', error);
    // Return default status on error
    return {
      local: {
        available: false,
        model: 'llama3.1:8b-instruct',
        error: error.message,
      },
      cloud: {
        available: true,
        model: 'gpt-4o',
      },
    };
  }

  return data as LlmHealthStatus;
}

export function useLlmHealth() {
  return useQuery({
    queryKey: ['llm-health'],
    queryFn: fetchLlmHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 1, // Only retry once on failure
  });
}

