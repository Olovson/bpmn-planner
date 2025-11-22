/**
 * Hook for accessing LLM events from in-memory buffer
 */

import { getRecentLlmEvents, getLlmStats, type LlmLogEvent } from '@/lib/llmLogging';
import { useQuery } from '@tanstack/react-query';

export function useLlmEvents(maxCount: number = 100) {
  return useQuery({
    queryKey: ['llm-events', maxCount],
    queryFn: () => getRecentLlmEvents(maxCount),
    refetchInterval: 2000, // Refetch every 2 seconds to show recent events
    staleTime: 1000, // Consider data stale after 1 second
  });
}

export function useLlmStats() {
  return useQuery({
    queryKey: ['llm-stats'],
    queryFn: () => getLlmStats(),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  });
}

export type { LlmLogEvent };

